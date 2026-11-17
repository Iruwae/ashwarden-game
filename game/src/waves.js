// Wave director: builds each wave's spawn queue, trickles enemies in, and
// reports when the wave is cleared. Waves 5 and 10 bring The Ash Tyrant;
// wave 10's boss is the final one — killing it wins the run.
import { CFG } from './config.js';

export class Waves {
  constructor(rng, enemies) {
    this.rng = rng;
    this.enemies = enemies;
    this.wave = 0;
    this.queue = [];
    this.spawnT = 0;
    this.betweenT = 0;
    this.active = false;
    this.cleared = false;
  }

  reset() {
    this.wave = 0; this.queue = []; this.spawnT = 0; this.betweenT = 0;
    this.active = false; this.cleared = false;
  }

  buildWave(n) {
    const q = [];
    const count = CFG.wave.baseCount + CFG.wave.perWave * n;
    for (let i = 0; i < count; i++) {
      const roll = this.rng.float();
      let type = 'drifter';
      if (n >= 3 && roll < 0.28) type = 'spitter';
      else if (n >= 4 && roll < 0.48) type = 'brute';
      q.push(type);
    }
    // Shuffle so the mix isn't front-loaded.
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.float() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    if (CFG.wave.bossWaves.includes(n)) q.push('boss');
    return q;
  }

  startWave(n) {
    this.wave = n;
    this.queue = this.buildWave(n);
    this.spawnT = 0.3;
    this.active = true;
    this.cleared = false;
  }

  // Returns 'boss' when a boss spawned this tick (for the banner/sound).
  update(dt) {
    if (!this.active) return null;
    let spawnedBoss = null;
    if (this.queue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = CFG.wave.spawnInterval * this.rng.range(0.8, 1.2);
        const type = this.queue.shift();
        const hpMul = 1 + (this.wave - 1) * 0.12 + (type === 'boss' && this.wave === 10 ? 0.8 : 0);
        // Spawn away from the player (min 8 units).
        let p = this.rng.arenaPoint(CFG.arenaRadius - 3, 8);
        this.enemies.spawn(type, p.x, p.z, hpMul);
        if (type === 'boss') spawnedBoss = 'boss';
      }
    } else if (this.enemies.alive.length === 0) {
      this.active = false;
      this.cleared = true;
    }
    return spawnedBoss;
  }
}
