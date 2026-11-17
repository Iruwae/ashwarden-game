// Arena + environment: dusk sky, fog, circular stone floor, rune ring,
// broken pillars, floating embers, lights. Static geometry built once.
import * as THREE from 'three';
import { CFG } from './config.js';

export class World {
  constructor(scene, rng) {
    this.scene = scene;
    scene.background = new THREE.Color(CFG.colors.sky);
    scene.fog = new THREE.Fog(CFG.colors.fog, 34, 78);
    this.embers = [];

    // Lights: warm key (setting sun), cool fill, player point light.
    const sun = new THREE.DirectionalLight(0xff9a4d, 2.0);
    sun.position.set(-18, 26, 8);
    scene.add(sun);
    const fill = new THREE.HemisphereLight(0x6a55a0, 0x2a1e3a, 1.25);
    scene.add(fill);
    const amb = new THREE.AmbientLight(0x403060, 0.6);
    scene.add(amb);
    this.playerLight = new THREE.PointLight(0xffa63d, 30, 18, 1.8);
    this.playerLight.position.set(0, 2.5, 0);
    scene.add(this.playerLight);

    // Floor: big disc + darker outer ring.
    const floorGeo = new THREE.CircleGeometry(CFG.arenaRadius + 6, 72);
    const floorMat = new THREE.MeshStandardMaterial({ color: CFG.colors.floor, roughness: 0.95, metalness: 0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Rune circle: glowing ring + radial ticks on the floor.
    const runeMat = new THREE.MeshBasicMaterial({ color: CFG.colors.rune, transparent: true, opacity: 0.55 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(CFG.arenaRadius - 0.5, CFG.arenaRadius, 96), runeMat);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
    scene.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(9.7, 10, 64), runeMat.clone());
    ring2.material.opacity = 0.3;
    ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.02;
    scene.add(ring2);
    this.runeRing = ring;
    this.runeRing2 = ring2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.2), runeMat.clone());
      tick.material.opacity = 0.4;
      tick.rotation.x = -Math.PI / 2;
      tick.rotation.z = -a;
      tick.position.set(Math.cos(a) * (CFG.arenaRadius - 1.8), 0.02, Math.sin(a) * (CFG.arenaRadius - 1.8));
      scene.add(tick);
    }

    // Crack lines: thin dark planes radiating from the centre.
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x171226, transparent: true, opacity: 0.45 });
    for (let i = 0; i < 9; i++) {
      const a = rng.angle();
      const len = rng.range(4, 12);
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.18, len), crackMat);
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = -a;
      crack.position.set(Math.cos(a) * len * 0.5, 0.015, Math.sin(a) * len * 0.5);
      scene.add(crack);
    }

    // Broken pillars around the rim + a few rubble stones inside.
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4260, roughness: 0.9 });
    const stoneDark = new THREE.MeshStandardMaterial({ color: 0x35304a, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rng.range(-0.1, 0.1);
      const r = CFG.arenaRadius + rng.range(1.5, 4.5);
      const h = rng.range(2.5, 7);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, h, 8), i % 3 === 0 ? stoneDark : stoneMat);
      pillar.position.set(Math.cos(a) * r, h / 2 - 0.2, Math.sin(a) * r);
      pillar.rotation.z = rng.range(-0.06, 0.06);
      pillar.castShadow = true;
      scene.add(pillar);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 2.4), stoneDark);
      cap.position.set(Math.cos(a) * r, h - 0.1, Math.sin(a) * r);
      cap.rotation.y = rng.angle();
      scene.add(cap);
    }
    for (let i = 0; i < 10; i++) {
      const p = rng.arenaPoint(CFG.arenaRadius - 3, 12);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.5, 1.1), 0), stoneDark);
      rock.position.set(p.x, 0.35, p.z);
      rock.rotation.set(rng.angle(), rng.angle(), 0);
      rock.scale.y = 0.6;
      scene.add(rock);
    }

    // Distant ruin silhouettes outside the arena (fog does the rest).
    const silMat = new THREE.MeshBasicMaterial({ color: 0x14102a, fog: true });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const r = rng.range(52, 66);
      const h = rng.range(10, 26);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(rng.range(4, 8), h, rng.range(4, 8)), silMat);
      tower.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      tower.rotation.y = rng.angle();
      scene.add(tower);
    }

    // Floating ember motes (ambient, drift upward, wrap).
    const moteGeo = new THREE.SphereGeometry(0.09, 6, 6);
    const moteMat = new THREE.MeshBasicMaterial({ color: CFG.colors.ember });
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(moteGeo, moteMat);
      const p = rng.arenaPoint(CFG.arenaRadius + 4, 0);
      m.position.set(p.x, rng.range(0.5, 9), p.z);
      m.userData.speed = rng.range(0.3, 0.9);
      m.userData.phase = rng.angle();
      scene.add(m);
      this.embers.push(m);
    }
  }

  update(dt, t) {
    this.runeRing.material.opacity = 0.45 + 0.15 * Math.sin(t * 1.4);
    this.runeRing2.material.opacity = 0.22 + 0.12 * Math.sin(t * 1.4 + 1.3);
    for (const m of this.embers) {
      m.position.y += m.userData.speed * dt;
      m.position.x += Math.sin(t * 0.7 + m.userData.phase) * dt * 0.3;
      if (m.position.y > 10) m.position.y = 0.4;
    }
    this.playerLight.intensity = 28 + Math.sin(t * 5) * 3;
  }
}
