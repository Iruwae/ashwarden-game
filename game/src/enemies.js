// Enemies: drifter (chases), spitter (keeps range, shoots), brute (slow, tanky),
// boss The Ash Tyrant (wave 5 mini, wave 10 final — bigger, more HP, radial shots).
// Simple FSM per type: spawn (telegraph) -> chase/strafe -> attack -> die.
import * as THREE from 'three';
import { CFG } from './config.js';
import { popScale } from './juice.js';

const GEO = {
  drifter: new THREE.IcosahedronGeometry(0.9, 0),
  spitter: new THREE.OctahedronGeometry(1.0, 0),
  brute: new THREE.DodecahedronGeometry(1.5, 0),
  boss: new THREE.DodecahedronGeometry(2.6, 0),
};

export class Enemies {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.list = [];
    this._flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  }

  spawn(type, x, z, hpMul = 1) {
    const def = CFG.enemy[type];
    const mat = new THREE.MeshStandardMaterial({
      color: def.color, roughness: 0.5, metalness: 0.2,
      emissive: def.color, emissiveIntensity: 0.55,
    });
    const group = new THREE.Group();
    const body = new THREE.Mesh(GEO[type], mat);
    body.position.y = type === 'boss' ? 2.6 : type === 'brute' ? 1.5 : 1.0;
    body.castShadow = true;
    group.add(body);
    // Glowing eye.
    const eye = new THREE.Mesh(new THREE.SphereGeometry(type === 'boss' ? 0.5 : 0.22, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff2e2e }));
    eye.position.set(0, body.position.y + 0.15, type === 'boss' ? 2.3 : type === 'brute' ? 1.3 : 0.8);
    group.add(eye);
    if (type === 'boss') {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 5),
        new THREE.MeshStandardMaterial({ color: 0x1c1426, roughness: 0.4, metalness: 0.7, emissive: 0xff7a1a, emissiveIntensity: 0.8 }));
      crown.position.y = 5.4;
      group.add(crown);
    }
    // Spawn telegraph ring on the floor.
    const tele = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.0, 32),
      new THREE.MeshBasicMaterial({ color: 0xff5d5d, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    tele.rotation.x = -Math.PI / 2; tele.position.y = 0.05;
    tele.position.x = x; tele.position.z = z;
    this.scene.add(tele);

    const e = {
      type, group, body, eye, mat,
      x, z, vx: 0, vz: 0,
      hp: def.hp * hpMul, maxHp: def.hp * hpMul,
      speed: def.speed * this.rng.range(0.9, 1.1),
      radius: def.radius, damage: def.damage,
      score: def.score, ember: def.ember,
      state: 'spawn', stateT: 0.55, // telegraph, then active
      shootCd: this.rng.range(1, 2),
      flashT: 0, wobble: this.rng.angle(),
      dead: false,
    };
    group.position.set(x, 0, z);
    group.scale.set(0.01, 0.01, 0.01);
    group.visible = false;
    this.scene.add(group);
    e.tele = tele;
    this.list.push(e);
    return e;
  }

  update(dt, player, projectiles, t, onPlayerHit, onShoot) {
    for (const e of this.list) {
      if (e.dead) continue;
      e.stateT -= dt;
      if (e.state === 'spawn') {
        // Telegraph: ring pulses, body scales in.
        const k = 1 - Math.max(0, e.stateT) / 0.55;
        e.tele.material.opacity = 0.8 * (1 - k);
        e.tele.scale.setScalar(1 + k * 2);
        if (e.stateT <= 0) {
          e.state = 'active';
          e.group.visible = true;
          this.scene.remove(e.tele);
          popScale(e.group, 1.3, 0.7, 1.3, 0.22);
        } else continue;
      }
      if (e.flashT > 0) {
        e.flashT -= dt;
        if (e.flashT <= 0) e.body.material = e.mat;
      }
      const dx = player.pos.x - e.x, dz = player.pos.z - e.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const nx = dx / dist, nz = dz / dist;
      let mx = 0, mz = 0;
      if (e.type === 'drifter') { mx = nx * e.speed; mz = nz * e.speed; }
      else if (e.type === 'brute') { mx = nx * e.speed; mz = nz * e.speed; }
      else if (e.type === 'spitter') {
        const want = CFG.enemy.spitter.range;
        if (dist > want + 2) { mx = nx * e.speed; mz = nz * e.speed; }
        else if (dist < want - 3) { mx = -nx * e.speed; mz = -nz * e.speed; }
        else { mx = -nz * e.speed * 0.5; mz = nx * e.speed * 0.5; } // strafe
        e.shootCd -= dt;
        if (e.shootCd <= 0 && dist < 22 && player.alive) {
          e.shootCd = CFG.enemy.spitter.shootCd * this.rng.range(0.9, 1.2);
          onShoot(e, { x: nx, z: nz });
        }
      } else if (e.type === 'boss') {
        mx = nx * e.speed; mz = nz * e.speed;
        e.shootCd -= dt;
        if (e.shootCd <= 0 && player.alive) {
          e.shootCd = 2.6;
          onShoot(e, { x: nx, z: nz }, 'radial');
        }
      }
      e.x += mx * dt; e.z += mz * dt;
      const r = Math.hypot(e.x, e.z);
      const maxR = CFG.arenaRadius - 1;
      if (r > maxR) { e.x *= maxR / r; e.z *= maxR / r; }
      e.group.position.set(e.x, 0, e.z);
      e.group.rotation.y = Math.atan2(nx, nz);
      // Wobble + spin read as "alive".
      e.body.rotation.y += dt * (e.type === 'drifter' ? 2.2 : 0.8);
      e.body.position.y += Math.sin(t * 3 + e.wobble) * dt * 0.4;
      // Touch damage.
      if (player.alive && dist < e.radius + CFG.player.radius) {
        onPlayerHit(e);
      }
    }
  }

  damage(e, amount, isCrit) {
    if (e.dead || e.state === 'spawn') return 0;
    e.hp -= amount;
    e.flashT = 0.09;
    e.body.material = this._flashMat;
    popScale(e.group, 1.25, 0.8, 1.25, 0.12);
    // Knockback away from the player is applied by the caller via e.x/e.z.
    return amount;
  }

  kill(e) {
    e.dead = true;
    this.scene.remove(e.group);
    if (e.tele) this.scene.remove(e.tele);
  }

  clearAll() {
    for (const e of this.list) { this.scene.remove(e.group); if (e.tele) this.scene.remove(e.tele); }
    this.list.length = 0;
  }

  get alive() { return this.list.filter((e) => !e.dead); }
  get boss() { return this.list.find((e) => e.type === 'boss' && !e.dead); }
}
