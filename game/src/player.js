// Player: the Ashwarden — a small armoured knight built from primitives with an
// emissive ember core. Movement is accel/friction; aim follows the mouse;
// firing is a hold-to-shoot bolt stream. Squash & stretch on move/fire.
import * as THREE from 'three';
import { CFG } from './config.js';
import { popScale } from './juice.js';

export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    this.vel = new THREE.Vector3();
    this.pos = new THREE.Vector3(0, 0, 0);
    this.aimAngle = -Math.PI / 2;
    this.fireCd = 0;
    this.iframe = 0;
    this.alive = true;
    this.facing = new THREE.Vector3(0, 0, -1);

    // Body: dark armour cone + ember core sphere + helm + staff.
    const armour = new THREE.MeshStandardMaterial({ color: 0x3a3348, roughness: 0.55, metalness: 0.6 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xff8c2e, roughness: 0.4, metalness: 0.4, emissive: 0x903a00, emissiveIntensity: 0.7 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.7, 8), armour);
    body.position.y = 0.85; body.castShadow = true;
    this.group.add(body);
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffc46b, emissive: CFG.colors.playerCore, emissiveIntensity: 2.4 })
    );
    this.core.position.y = 1.05;
    this.group.add(this.core);
    const helm = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 8), trim);
    helm.position.y = 1.95;
    this.group.add(helm);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0xff5d1f, emissive: 0xff5d1f, emissiveIntensity: 1.4 }));
    plume.position.y = 2.5;
    this.group.add(plume);
    // Staff held to the side, tipped with a burning orb.
    this.staff = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 6), armour);
    rod.position.y = 0.95;
    this.staff.add(rod);
    this.staffOrb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xff8c2e, emissiveIntensity: 3 }));
    this.staffOrb.position.y = 2.0;
    this.staff.add(this.staffOrb);
    this.staff.position.set(0.75, 0, 0.25);
    this.group.add(this.staff);
    // Ground ring under the player.
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.15, 32),
      new THREE.MeshBasicMaterial({ color: 0xffa63d, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
    this.group.add(ring);

    // Stats (mutated by blessings).
    this.maxHp = CFG.player.hp;
    this.hp = this.maxHp;
    this.speed = CFG.player.speed;
    this.damage = CFG.player.boltDamage;
    this.fireInterval = CFG.player.fireInterval;
    this.multishot = 1;
    this.chain = 0;
    this.shield = 0;       // absorbs hits first
    this.magnetR = CFG.player.magnetRadius;
    this.crit = 0.05;
    this.boltSpeed = CFG.player.boltSpeed;

    scene.add(this.group);
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 1.1, 0);
    this.group.add(this.muzzle);
  }

  reset() {
    this.pos.set(0, 0, 0);
    this.vel.set(0, 0, 0);
    this.maxHp = CFG.player.hp;
    this.hp = this.maxHp;
    this.speed = CFG.player.speed;
    this.damage = CFG.player.boltDamage;
    this.fireInterval = CFG.player.fireInterval;
    this.multishot = 1;
    this.chain = 0;
    this.shield = 0;
    this.magnetR = CFG.player.magnetRadius;
    this.crit = 0.05;
    this.boltSpeed = CFG.player.boltSpeed;
    this.iframe = 0;
    this.alive = true;
    this.group.visible = true;
    this.group.scale.set(1, 1, 1);
  }

  // Returns true when a shot was fired this tick (caller spawns the bolt).
  update(dt, move, aimWorld, firing, t) {
    if (!this.alive) return false;
    this.vel.x += move.x * CFG.player.accel * dt;
    this.vel.z += move.z * CFG.player.accel * dt;
    const fr = Math.exp(-CFG.player.friction * dt);
    this.vel.x *= fr; this.vel.z *= fr;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > this.speed) { this.vel.x *= this.speed / sp; this.vel.z *= this.speed / sp; }
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    // Clamp to the arena circle.
    const r = Math.hypot(this.pos.x, this.pos.z);
    const maxR = CFG.arenaRadius - 1.2;
    if (r > maxR) { this.pos.x *= maxR / r; this.pos.z *= maxR / r; }
    this.group.position.copy(this.pos);

    // Aim: face the mouse world point.
    const dx = aimWorld.x - this.pos.x, dz = aimWorld.z - this.pos.z;
    if (dx * dx + dz * dz > 0.01) {
      this.aimAngle = Math.atan2(dx, dz);
      this.facing.set(Math.sin(this.aimAngle), 0, Math.cos(this.aimAngle));
    }
    this.group.rotation.y = this.aimAngle;
    // Bob + lean into movement; squash on landing from a burst of speed.
    this.group.position.y = Math.abs(Math.sin(t * 9)) * 0.06 * Math.min(1, sp / this.speed);
    this.core.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
    this.staffOrb.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
    if (this.iframe > 0) {
      this.iframe -= dt;
      this.group.visible = Math.floor(t * 20) % 2 === 0;
      if (this.iframe <= 0) this.group.visible = true;
    }

    this.fireCd -= dt;
    if (firing && this.fireCd <= 0) {
      this.fireCd = this.fireInterval;
      popScale(this.group, 1.12, 0.9, 1.12, 0.12);
      return true;
    }
    return false;
  }

  muzzleWorld(out) {
    const p = new THREE.Vector3(0, 1.1, 0.9);
    this.group.localToWorld(p);
    out.copy(p);
    return out;
  }

  // Damage after shield; returns -1 when invulnerable (i-frames / dead),
  // otherwise damage actually applied to HP (0 when fully absorbed).
  takeHit(dmg) {
    if (this.iframe > 0 || !this.alive) return -1;
    let rest = dmg;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, rest);
      this.shield -= absorbed;
      rest -= absorbed;
    }
    this.hp -= rest;
    this.iframe = CFG.player.iframe;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    return rest;
  }

  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }
}
