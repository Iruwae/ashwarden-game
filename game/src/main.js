// ASHWARDEN — bootstrap & fixed-step loop (1/60 s). Owns the wiring between
// systems; game rules live in their own modules. Hit-stop scales the sim
// delta; shake and UI run on real time so they never freeze off-centre.
import * as THREE from 'three';
import { CFG } from './config.js';
import { RNG } from './random.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Enemies } from './enemies.js';
import { Projectiles } from './projectiles.js';
import { Particles } from './particles.js';
import { Waves } from './waves.js';
import { HUD } from './hud.js';
import { Juice, updatePop } from './juice.js';
import { RunState } from './state.js';
import { rollBlessings } from './blessings.js';
import { stageShot } from './shots.js';

const FIXED = 1 / 60;

export class Game {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.seed = Number(params.get('seed') || 1) || 1;
    this.shot = params.get('shot') || null;
    this.rng = new RNG(this.seed);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('app').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CFG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, CFG.camera.height, 11.5);

    this.input = new Input(this.renderer.domElement);
    this.audio = new AudioSys();
    this.world = new World(this.scene, this.rng);
    this.player = new Player(this.scene);
    this.enemies = new Enemies(this.scene, this.rng);
    this.projectiles = new Projectiles(this.scene);
    this.particles = new Particles(this.scene);
    this.waves = new Waves(this.rng, this.enemies);
    this.hud = new HUD();
    this.juice = new Juice(this.camera,
      document.getElementById('flash'), document.getElementById('vignette'));
    this.run = new RunState();

    this._ray = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._aim = new THREE.Vector3(0, 0, -5);
    this._camTarget = new THREE.Vector3();
    this._camBase = new THREE.Vector3(0, CFG.camera.height, 11.5);
    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();

    // Ember pickups: small pooled orbs dropped by kills.
    this.embers = [];
    const emberGeo = new THREE.IcosahedronGeometry(0.3, 0);
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(emberGeo, emberMat);
      m.visible = false;
      this.scene.add(m);
      this.embers.push({ mesh: m, active: false, vx: 0, vz: 0, value: 1, t: 0 });
    }

    this.acc = 0;
    this.last = performance.now();
    this.time = 0;
    this._waveBannerShown = false;
    this._pendingWave = 0;
    this._pendingWaveT = 0;
    this._bossAnnounced = false;

    window.addEventListener('resize', () => this.onResize());
    document.getElementById('start-btn').addEventListener('click', () => this.startRun());
    document.getElementById('restart-btn').addEventListener('click', () => this.startRun());
    document.getElementById('again-btn').addEventListener('click', () => this.startRun());
    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
    document.getElementById('quit-btn').addEventListener('click', () => this.toTitle());
    this.hud.el.muteBtn.addEventListener('click', () => this.toggleMute());

    this.hud.setBest(this.run.best);
    this.hud.showScreen('title');
    this.hud.showHud(false);
    this.toTitle();

    if (this.shot) {
      stageShot(this, this.shot);
    }
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  toTitle() {
    this.run.reset();
    this.run.state = 'title';
    this.enemies.clearAll();
    this.projectiles.clearAll();
    this.clearEmbers();
    this.player.reset();
    this.player.group.position.set(0, 0, 0);
    this.waves.reset();
    this.hud.showScreen('title');
    this.hud.showHud(false);
    this.hud.boss(false);
    this.hud.setBest(this.run.best);
  }

  startRun() {
    this.audio.ensure();
    this.audio.startMusic();
    this.audio.ui();
    this.run.reset();
    this.run.state = 'play';
    this.run.runSeed = (Math.random() * 1e9) | 0;
    this.rng = new RNG(this.run.runSeed);
    this.enemies.rng = this.rng;
    this.waves.rng = this.rng;
    this.enemies.clearAll();
    this.projectiles.clearAll();
    this.clearEmbers();
    this.player.reset();
    this.waves.reset();
    this.hud.showScreen(null);
    this.hud.showHud(true);
    this.hud.boss(false);
    this._pendingWave = 1;
    this._pendingWaveT = 0.8;
    this._waveBannerShown = false;
    this._bossAnnounced = false;
    this.hud.banner('ASHWARDEN', 'Hold the circle. Survive ten waves.', 2200);
  }

  clearEmbers() { for (const e of this.embers) { e.active = false; e.mesh.visible = false; } }

  togglePause() {
    if (this.run.state === 'play') {
      this.run.state = 'pause';
      this.hud.showScreen('pause');
    } else if (this.run.state === 'pause') {
      this.run.state = 'play';
      this.hud.showScreen(null);
    }
  }

  toggleMute() {
    this.audio.ensure();
    this.audio.setMuted(!this.audio.muted);
    this.hud.el.muteBtn.textContent = this.audio.muted ? '🔇' : '🔊';
  }

  openBlessing() {
    this.run.state = 'blessing';
    const choices = rollBlessings(this.rng, 3);
    this.audio.levelup();
    this.hud.boss(false);
    this.hud.banner('WAVE CLEARED', 'Choose a blessing', 1600);
    this.hud.blessingChoices(choices, (b) => this.pickBlessing(b));
    this.hud.showScreen('blessing');
  }

  pickBlessing(b) {
    b.apply(this.player, this.run);
    this.run.blessingsTaken.push(b);
    this.audio.ui();
    this.particles.burst(this.player.pos.x, 1.5, this.player.pos.z, 30, 0xffc46b, 7, 0.8, 16, 6);
    this.hud.showScreen(null);
    this.run.state = 'play';
    this._pendingWave = this.run.wave + 1;
    this._pendingWaveT = 1.0;
  }

  gameOver() {
    this.run.state = 'gameover';
    const isBest = this.run.finish();
    this.audio.gameover();
    this.hud.gameOver(this.run.stats());
    this.hud.setBest(this.run.best);
    this.hud.showScreen('gameover');
    this.hud.boss(false);
    if (isBest) this.hud.banner('NEW BEST SCORE', '', 2200);
  }

  victory() {
    this.run.state = 'victory';
    const isBest = this.run.finish();
    this.audio.victory();
    this.hud.victory(this.run.stats());
    this.hud.setBest(this.run.best);
    this.hud.showScreen('victory');
    this.hud.boss(false);
    this.particles.burst(this.player.pos.x, 2, this.player.pos.z, 80, 0xffa63d, 10, 1.2, 18, 8);
  }

  spawnEmbers(x, z, n) {
    let spawned = 0;
    for (const e of this.embers) {
      if (spawned >= n) break;
      if (e.active) continue;
      e.active = true; e.mesh.visible = true;
      const a = this.rng.angle();
      const r = this.rng.range(0.5, 1.6);
      e.mesh.position.set(x + Math.cos(a) * r, 0.5, z + Math.sin(a) * r);
      e.vx = Math.cos(a) * 3; e.vz = Math.sin(a) * 3;
      e.value = 1; e.t = 0;
      spawned++;
    }
  }

  killEnemy(e, byBolt = true) {
    this.enemies.kill(e);
    this.run.kills++;
    this.run.addScore(e.score);
    this.audio.kill();
    this.juice.addTrauma(e.type === 'boss' ? 1 : e.type === 'brute' ? 0.55 : 0.35);
    if (e.type === 'boss' || e.type === 'brute') this.juice.hitStop(CFG.juice.hitStopBoss, 0.05);
    else if (byBolt) this.juice.hitStop(CFG.juice.hitStopKill, 0.08);
    this.particles.burst(e.x, 1.2, e.z, e.type === 'boss' ? 70 : 24,
      e.type === 'boss' ? 0xff7a1a : 0xffa63d, e.type === 'boss' ? 11 : 7, 0.8, 16, 6);
    this.spawnEmbers(e.x, e.z, Math.min(e.ember, 12));
    this.juice.flash(0.25);
    if (e.type === 'boss' && this.run.wave === CFG.wave.maxWave) {
      this.victory();
    }
  }

  // ---- per-tick simulation (fixed dt) ----
  step(dt) {
    this.time += dt;
    const st = this.run.state;
    if (st === 'play') this.run.time += dt;

    // Aim: mouse ray onto the floor plane.
    const ndcX = (this.input.mouse.x / window.innerWidth) * 2 - 1;
    const ndcY = -(this.input.mouse.y / window.innerHeight) * 2 + 1;
    this._ray.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    if (this._ray.ray.intersectPlane(this._plane, this._aim)) {
      // keep aim point for the player
    }

    if (st === 'play') {
      // Wave scheduling.
      if (this._pendingWave > 0) {
        this._pendingWaveT -= dt;
        if (this._pendingWaveT <= 0) {
          const n = this._pendingWave;
          this._pendingWave = 0;
          this.run.wave = n;
          this.waves.startWave(n);
          this._bossAnnounced = false;
          const isBoss = CFG.wave.bossWaves.includes(n);
          this.hud.banner(isBoss ? '⚠ THE ASH TYRANT ⚠' : `WAVE ${n}`, isBoss ? 'Break its crown' : `${this.waves.queue.length} foes approach`, 2000);
          if (isBoss) this.audio.boss(); else this.audio.wave();
        }
      }
      const bossSpawned = this.waves.update(dt);
      if (bossSpawned) { this._bossAnnounced = true; this.juice.addTrauma(0.5); }

      if (this.waves.cleared && !this._pendingWave) {
        this.waves.cleared = false;
        if (this.run.wave >= CFG.wave.maxWave) { this.victory(); }
        else this.openBlessing();
      }

      // Player.
      const fired = this.player.update(dt, this.input.moveVector(), this._aim, this.input.firing, this.time);
      if (fired) this.fireBolts();

      // Enemies.
      this.enemies.update(dt, this.player, this.projectiles, this.time,
        (e) => this.onEnemyTouch(e),
        (e, dir, mode) => this.onEnemyShoot(e, dir, mode));

      // Projectiles + collisions.
      this.projectiles.update(dt);
      this.collideBolts();
      this.collideOrbs();

      // Ember pickups: scatter, magnet, collect.
      this.updateEmbers(dt);

      // Boss bar.
      const boss = this.enemies.boss;
      if (boss) this.hud.boss(true, 'THE ASH TYRANT', boss.hp / boss.maxHp);
      else if (!this._bossAnnounced) this.hud.boss(false);
    }

    // World + particles always animate (menus stay alive behind overlays).
    this.world.update(dt, this.time);
    this.world.playerLight.position.set(this.player.pos.x, 2.5, this.player.pos.z);
    this.particles.update(dt);
    updatePop(this.player.group, dt);
    for (const e of this.enemies.list) if (!e.dead) updatePop(e.group, dt);

    // HUD.
    if (st === 'play' || st === 'blessing' || st === 'pause') {
      this.hud.update({
        hp: this.player.hp, maxHp: this.player.maxHp, shield: this.player.shield,
        wave: Math.max(1, this.run.wave), score: this.run.score, ember: this.run.ember,
        kills: this.run.kills, blessings: this.run.blessingsTaken,
      });
    }
    this.input.endFrame();
  }

  fireBolts() {
    const n = this.player.multishot;
    const spread = 0.14;
    const base = this.player.aimAngle;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spread;
      const a = base + off;
      const dir = { x: Math.sin(a), z: Math.cos(a) };
      const m = this.player.muzzleWorld(this._tmpV);
      this.projectiles.fireBolt(m.x, 1.1, m.z, dir, this.player.boltSpeed, this.player.damage, this.run.pierce);
      this.particles.trail(m.x, 1.1, m.z, 0xffa63d, 2);
    }
    this.audio.shoot();
  }

  collideBolts() {
    for (const b of this.projectiles.bolts) {
      if (!b.active) continue;
      const bp = b.mesh.position;
      for (const e of this.enemies.list) {
        if (e.dead || e.state === 'spawn' || b.hitSet.has(e)) continue;
        const dx = bp.x - e.x, dz = bp.z - e.z;
        const rr = e.radius + b.radius;
        if (dx * dx + dz * dz < rr * rr) {
          b.hitSet.add(e);
          const isCrit = this.rng.float() < this.player.crit;
          const dmg = Math.round(b.dmg * (isCrit ? 2 : 1));
          this.enemies.damage(e, dmg, isCrit);
          this.audio.hit();
          this.juice.damageNumber(this._tmpV2.set(e.x, 2, e.z), String(dmg), isCrit ? 'crit' : 'hit');
          this.particles.burst(bp.x, 1.1, bp.z, 6, 0xffc46b, 4, 0.35, 10, 3);
          // Chain lightning to the nearest other enemy.
          if (this.player.chain > 0) {
            let chained = 0;
            for (const o of this.enemies.list) {
              if (chained >= this.player.chain || o.dead || o === e || o.state === 'spawn') continue;
              const ddx = o.x - e.x, ddz = o.z - e.z;
              if (ddx * ddx + ddz * ddz < 64) {
                chained++;
                this.enemies.damage(o, Math.round(dmg * 0.6), false);
                this.particles.burst(o.x, 1.5, o.z, 8, 0x9fd8ff, 5, 0.4, 10, 3);
                this.juice.damageNumber(this._tmpV2.set(o.x, 2, o.z), String(Math.round(dmg * 0.6)), 'chain');
              }
            }
          }
          if (e.hp <= 0) this.killEnemy(e, true);
          if (b.pierce <= 0) { b.active = false; b.mesh.visible = false; break; }
          b.pierce--;
        }
      }
    }
  }

  collideOrbs() {
    if (!this.player.alive) return;
    for (const o of this.projectiles.orbs) {
      if (!o.active) continue;
      const op = o.mesh.position;
      const dx = op.x - this.player.pos.x, dz = op.z - this.player.pos.z;
      const rr = CFG.player.radius + o.radius;
      if (dx * dx + dz * dz < rr * rr) {
        o.active = false; o.mesh.visible = false;
        this.hurtPlayer(o.dmg, op);
      }
    }
  }

  onEnemyTouch(e) {
    if (!this.player.alive) return;
    this.hurtPlayer(e.damage, this._tmpV.set(e.x, 1, e.z), e);
  }

  hurtPlayer(dmg, pos, enemy = null) {
    const applied = this.player.takeHit(dmg);
    if (applied < 0) return; // i-frames: no hit landed
    this.audio.hurt();
    this.juice.addTrauma(0.6);
    this.juice.hitStop(CFG.juice.hitStopPlayerHurt, 0.08);
    this.juice.flash(0.4, '255,60,60');
    this.particles.burst(this.player.pos.x, 1.2, this.player.pos.z, 14, 0xff5d5d, 6, 0.5, 12, 4);
    // Knock the player away from the hit.
    if (enemy) {
      const dx = this.player.pos.x - enemy.x, dz = this.player.pos.z - enemy.z;
      const d = Math.hypot(dx, dz) || 1;
      this.player.vel.x += (dx / d) * 14;
      this.player.vel.z += (dz / d) * 14;
    }
    if (!this.player.alive) {
      this.particles.burst(this.player.pos.x, 1.2, this.player.pos.z, 60, 0xffa63d, 9, 1, 16, 6);
      this.player.group.visible = false;
      this.gameOver();
    }
  }

  onEnemyShoot(e, dir, mode) {
    if (mode === 'radial') {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + this.time;
        this.projectiles.fireOrb(e.x, 1.6, e.z, { x: Math.sin(a), z: Math.cos(a) }, 9, e.damage);
      }
      this.audio.shoot();
      return;
    }
    this.projectiles.fireOrb(e.x, 1.4, e.z, dir, 13, e.damage);
    this.audio.shoot();
  }

  updateEmbers(dt) {
    for (const e of this.embers) {
      if (!e.active) continue;
      e.t += dt;
      const dx = this.player.pos.x - e.mesh.position.x;
      const dz = this.player.pos.z - e.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < this.player.magnetR && this.player.alive) {
        const pull = 26 * (1 - d / this.player.magnetR) + 8;
        e.vx += (dx / (d || 1)) * pull * dt * 4;
        e.vz += (dz / (d || 1)) * pull * dt * 4;
      } else {
        e.vx *= Math.exp(-3 * dt); e.vz *= Math.exp(-3 * dt);
      }
      e.mesh.position.x += e.vx * dt;
      e.mesh.position.z += e.vz * dt;
      e.mesh.position.y = 0.5 + Math.sin(e.t * 5) * 0.12;
      e.mesh.rotation.y += dt * 3;
      if (d < CFG.player.pickupRadius && this.player.alive) {
        e.active = false; e.mesh.visible = false;
        this.run.addEmber(e.value);
        this.run.addScore(10);
        this.audio.pickup();
        this.particles.trail(e.mesh.position.x, 0.8, e.mesh.position.z, 0xffc46b, 3);
      } else if (e.t > 25) { e.active = false; e.mesh.visible = false; }
    }
  }

  // ---- frame loop ----
  loop(now) {
    requestAnimationFrame(this.loop);
    let frameDt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const scaled = frameDt * this.juice.timeScale;

    // Global keys (work in every state).
    if (this.input.pressed('KeyM')) this.toggleMute();
    if (this.input.pressed('KeyP') || this.input.pressed('Escape')) {
      if (this.run.state === 'play' || this.run.state === 'pause') this.togglePause();
    }
    if (this.input.pressed('Enter')) {
      if (this.run.state === 'title' || this.run.state === 'gameover' || this.run.state === 'victory') this.startRun();
    }
    if (this.input.pressed('KeyR')) {
      if (this.run.state === 'gameover' || this.run.state === 'victory') this.startRun();
    }
    if (this.run.state === 'blessing') {
      const cards = document.querySelectorAll('.blessing-card');
      for (let i = 0; i < 3; i++) {
        if (this.input.pressed('Digit' + (i + 1)) && cards[i]) cards[i].click();
      }
    }

    this.acc += scaled;
    let guard = 0;
    while (this.acc >= FIXED && guard++ < 5) {
      this.step(FIXED);
      this.acc -= FIXED;
    }
    if (guard >= 5) this.acc = 0;

    // Camera: follow player with a slight look-ahead toward the aim.
    const look = this._tmpV.set(
      this.player.pos.x + (this._aim.x - this.player.pos.x) * 0.12,
      0,
      this.player.pos.z + (this._aim.z - this.player.pos.z) * 0.12
    );
    const base = this._camBase.set(
      this.player.pos.x * CFG.camera.follow,
      CFG.camera.height,
      this.player.pos.z * CFG.camera.follow + 11.5
    );
    this.juice.update(frameDt, base, look, this.run.state === 'play' && this.player.hp > 0 && this.player.hp / this.player.maxHp < 0.3);
    this.renderer.render(this.scene, this.camera);
  }
}

// Exposed for automated playtesting (screenshots / bots); not used by the game.
window.__game = new Game();
window.__ashwarden = true;
