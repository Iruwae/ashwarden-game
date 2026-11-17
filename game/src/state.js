// Run state machine: title -> play -> blessing -> play ... -> victory | gameover.
// Pause overlays play. States are plain strings; transitions live in main.js,
// this module just owns the run's mutable numbers and the best-score record.
export const STATES = ['title', 'play', 'blessing', 'pause', 'gameover', 'victory'];

export class RunState {
  constructor() {
    this.reset();
    this.best = 0;
    try { this.best = Number(localStorage.getItem('ashwarden-best') || 0) || 0; } catch { this.best = 0; }
  }

  reset() {
    this.state = 'title';
    this.score = 0;
    this.ember = 0;
    this.kills = 0;
    this.wave = 0;
    this.time = 0;
    this.blessingsTaken = [];
    this.pierce = 0;
    this.runSeed = 1;
  }

  addScore(n) { this.score += n; }
  addEmber(n) { this.ember += n; }

  finish() {
    if (this.score > this.best) {
      this.best = this.score;
      try { localStorage.setItem('ashwarden-best', String(this.best)); } catch { /* private mode */ }
      return true;
    }
    return false;
  }

  stats() {
    return {
      score: this.score, wave: this.wave, kills: this.kills,
      ember: this.ember, time: this.time, blessings: this.blessingsTaken.length,
    };
  }
}
