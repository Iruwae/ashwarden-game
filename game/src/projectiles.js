// Projectiles: pooled glowing bolts (player) and orbs (spitter/boss).
// One shared geometry/material each; pool size caps the draw calls.
import * as THREE from 'three';

function makePool(scene, count, geo, mat) {
  const pool = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    scene.add(m);
    pool.push({ mesh: m, active: false, vx: 0, vy: 0, vz: 0, life: 0, dmg: 0, fromPlayer: true, radius: 0.3, pierce: 0, hitSet: null });
  }
  return pool;
}

export class Projectiles {
  constructor(scene) {
    this.scene = scene;
    const boltGeo = new THREE.SphereGeometry(0.28, 10, 10);
    boltGeo.scale(1, 1, 2.2);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    this.bolts = makePool(scene, 90, boltGeo, boltMat);
    const orbGeo = new THREE.SphereGeometry(0.34, 10, 10);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xd07bff });
    this.orbs = makePool(scene, 60, orbGeo, orbMat);
    // Glow sprite behind each active bolt, drawn additively.
    this._glowMat = new THREE.SpriteMaterial({ color: 0xff9a3d, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  }

  fireBolt(x, y, z, dir, speed, dmg, pierce = 0) {
    const b = this.bolts.find((p) => !p.active);
    if (!b) return;
    b.active = true; b.mesh.visible = true;
    b.mesh.position.set(x, y, z);
    b.mesh.lookAt(x + dir.x, y, z + dir.z);
    b.vx = dir.x * speed; b.vz = dir.z * speed; b.vy = 0;
    b.life = 2.2; b.dmg = dmg; b.fromPlayer = true; b.radius = 0.3; b.pierce = pierce;
    b.hitSet = b.hitSet || new Set();
    b.hitSet.clear();
  }

  fireOrb(x, y, z, dir, speed, dmg) {
    const b = this.orbs.find((p) => !p.active);
    if (!b) return;
    b.active = true; b.mesh.visible = true;
    b.mesh.position.set(x, y, z);
    b.vx = dir.x * speed; b.vz = dir.z * speed; b.vy = 0;
    b.life = 4; b.dmg = dmg; b.fromPlayer = false; b.radius = 0.4;
  }

  update(dt) {
    for (const list of [this.bolts, this.orbs]) {
      for (const p of list) {
        if (!p.active) continue;
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.z += p.vz * dt;
        const r = Math.hypot(p.mesh.position.x, p.mesh.position.z);
        if (p.life <= 0 || r > 40) { p.active = false; p.mesh.visible = false; }
      }
    }
  }

  clearAll() {
    for (const list of [this.bolts, this.orbs]) for (const p of list) { p.active = false; p.mesh.visible = false; }
  }
}
