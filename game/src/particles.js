// Pooled ember particles: one THREE.Points draw call, fixed capacity, zero
// allocation in the hot loop. Each particle: position, velocity, life, size, color.
import * as THREE from 'three';

const CAP = 700;

export class Particles {
  constructor(scene) {
    this.cap = CAP;
    this.pos = new Float32Array(CAP * 3);
    this.col = new Float32Array(CAP * 3);
    this.size = new Float32Array(CAP);
    this.vel = new Float32Array(CAP * 3);
    this.life = new Float32Array(CAP);
    this.maxLife = new Float32Array(CAP);
    this.baseSize = new Float32Array(CAP);
    this.grav = new Float32Array(CAP);
    this.head = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexColors: true,
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (240.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, a);
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.geo = geo;
  }

  spawn(x, y, z, vx, vy, vz, life, size, r, g, b, gravity = 0) {
    const i = this.head;
    this.head = (this.head + 1) % CAP;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.life[i] = life; this.maxLife[i] = life; this.size[i] = size; this.baseSize[i] = size;
    this.grav[i] = gravity;
  }

  burst(x, y, z, n, color, speed = 6, life = 0.6, size = 14, up = 4) {
    const r = ((color >> 16) & 255) / 255, g = ((color >> 8) & 255) / 255, b = (color & 255) / 255;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.9);
      this.spawn(x, y, z, Math.cos(a) * s, Math.random() * up, Math.sin(a) * s,
        life * (0.6 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.8),
        r, g, b, -9);
    }
  }

  // Rising ember motes for ambience / muzzle flash.
  trail(x, y, z, color, n = 2) {
    const r = ((color >> 16) & 255) / 255, g = ((color >> 8) & 255) / 255, b = (color & 255) / 255;
    for (let k = 0; k < n; k++) {
      this.spawn(x + (Math.random() - 0.5) * 0.2, y, z + (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.6, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 0.6,
        0.4 + Math.random() * 0.3, 8 + Math.random() * 6, r, g, b, 2);
    }
  }

  update(dt) {
    for (let i = 0; i < CAP; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.05) { this.pos[i * 3 + 1] = 0.05; this.vel[i * 3 + 1] *= -0.3; }
      const fade = this.life[i] / this.maxLife[i];
      this.size[i] = this.baseSize[i] * (0.3 + 0.7 * fade);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }
}
