// Juice: trauma-based screen shake, hit-stop, kill flash, damage numbers,
// low-HP vignette pulse. Visual-only — it never moves bodies or stalls logic.
import * as THREE from 'three';

export class Juice {
  constructor(camera, flashEl, vignetteEl) {
    this.camera = camera;
    this.flashEl = flashEl;
    this.vignetteEl = vignetteEl;
    this.trauma = 0;
    this.decay = 1.4;
    this.maxOffset = 0.55;
    this.maxRoll = 0.06;
    this.timeScale = 1;
    this._hitStopId = 0;
    this._t = 0;
    this._dmgPool = [];
    this._dmgIdx = 0;
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('div');
      el.className = 'dmgnum';
      el.style.display = 'none';
      document.getElementById('fx-layer').appendChild(el);
      this._dmgPool.push(el);
    }
    this._flashTimer = 0;
  }

  addTrauma(amount) { this.trauma = Math.min(1, this.trauma + amount); }

  hitStop(duration, slow = 0.05) {
    const id = ++this._hitStopId;
    this.timeScale = slow;
    setTimeout(() => { if (id === this._hitStopId) this.timeScale = 1; }, duration * 1000);
  }

  flash(strength = 0.35, color = '255,180,80') {
    this.flashEl.style.background = `radial-gradient(ellipse at center, rgba(${color},0) 40%, rgba(${color},${strength}) 100%)`;
    this.flashEl.style.opacity = '1';
    this._flashTimer = 0.12;
  }

  damageNumber(worldPos, text, kind = 'hit') {
    const el = this._dmgPool[this._dmgIdx];
    this._dmgIdx = (this._dmgIdx + 1) % this._dmgPool.length;
    const v = worldPos.clone().project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    el.textContent = text;
    el.className = 'dmgnum ' + kind;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.display = 'block';
    el.style.opacity = '1';
    // Restart the CSS pop animation.
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    setTimeout(() => { el.style.display = 'none'; }, 700);
  }

  // dt is real (unscaled) time so shake decays through hit-stop instead of
  // freezing the camera off-centre.
  update(realDt, basePos, baseLook, lowHp) {
    this.trauma = Math.max(0, this.trauma - this.decay * realDt);
    const shake = this.trauma * this.trauma;
    this._t += realDt * 30;
    const ox = this.maxOffset * shake * Math.sin(this._t * 1.7);
    const oy = this.maxOffset * 0.6 * shake * Math.sin(this._t * 2.3);
    const roll = this.maxRoll * shake * Math.sin(this._t * 1.1);
    this.camera.position.set(basePos.x + ox, basePos.y + oy, basePos.z);
    this.camera.lookAt(baseLook);
    this.camera.rotateZ(roll);
    if (this._flashTimer > 0) {
      this._flashTimer -= realDt;
      if (this._flashTimer <= 0) this.flashEl.style.opacity = '0';
    }
    if (lowHp) {
      const pulse = 0.35 + 0.25 * Math.sin(performance.now() * 0.006);
      this.vignetteEl.style.opacity = String(pulse);
    } else {
      this.vignetteEl.style.opacity = '0';
    }
  }
}

// Squash & stretch helper: stretch along one axis, squash the other, spring back
// with an overshoot (back-out) so pops read as elastic, never drifty.
export function popScale(obj, sx, sy, sz, dur = 0.18) {
  obj.userData._pop = { t: 0, dur, sx, sy, sz };
}
export function updatePop(obj, dt) {
  const p = obj.userData._pop;
  if (!p) return;
  p.t += dt;
  const k = Math.min(1, p.t / p.dur);
  // back-out easing: overshoots past 1, settles exactly at 1.
  const c1 = 1.70158, c3 = c1 + 1;
  const e = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  const ix = 1 + (p.sx - 1) * (1 - e);
  const iy = 1 + (p.sy - 1) * (1 - e);
  const iz = 1 + (p.sz - 1) * (1 - e);
  obj.scale.set(ix, iy, iz);
  if (k >= 1) { obj.scale.set(1, 1, 1); obj.userData._pop = null; }
}
