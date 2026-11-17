// Synthesized WebAudio: no audio files, everything is oscillators + filtered noise.
// Created lazily on first user gesture (autoplay policy); M toggles mute.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._musicNodes = null;
    this._noiseBuf = null;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1;
    this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this._noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  _tone({ type = 'sine', f0 = 440, f1 = null, dur = 0.15, vol = 0.3, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise({ dur = 0.2, vol = 0.3, freq = 1200, q = 1, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  shoot() { this._tone({ type: 'square', f0: 720, f1: 180, dur: 0.09, vol: 0.12 }); this._noise({ dur: 0.06, vol: 0.08, freq: 2600 }); }
  hit() { this._noise({ dur: 0.08, vol: 0.16, freq: 900 }); }
  kill() {
    this._tone({ type: 'triangle', f0: 320, f1: 60, dur: 0.22, vol: 0.28 });
    this._noise({ dur: 0.25, vol: 0.2, freq: 500, q: 0.6 });
  }
  pickup() { this._tone({ type: 'sine', f0: 880, f1: 1320, dur: 0.12, vol: 0.14 }); }
  hurt() { this._tone({ type: 'sawtooth', f0: 160, f1: 60, dur: 0.3, vol: 0.3 }); this._noise({ dur: 0.2, vol: 0.2, freq: 300 }); }
  levelup() { [523, 659, 784, 1047].forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.2, when: i * 0.07 })); }
  boss() { this._tone({ type: 'sawtooth', f0: 55, f1: 40, dur: 0.9, vol: 0.35 }); this._tone({ type: 'sawtooth', f0: 82, f1: 58, dur: 0.9, vol: 0.2 }); }
  wave() { this._tone({ type: 'triangle', f0: 392, f1: 523, dur: 0.25, vol: 0.2 }); }
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.22, when: i * 0.11 })); }
  gameover() { [392, 330, 262, 196].forEach((f, i) => this._tone({ type: 'sawtooth', f0: f, dur: 0.35, vol: 0.18, when: i * 0.16 })); }
  ui() { this._tone({ type: 'sine', f0: 660, dur: 0.06, vol: 0.12 }); }

  // Slow dusk pad: two detuned sines through a lowpass, LFO on gain. Cheap loop.
  startMusic() {
    if (!this.ctx || this._musicNodes) return;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const o1 = this.ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
    const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 164.8;
    const o3 = this.ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 55;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.025;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    o1.connect(f); o2.connect(f); o3.connect(f); f.connect(g); g.connect(this.master);
    o1.start(); o2.start(); o3.start(); lfo.start();
    this._musicNodes = { o1, o2, o3, lfo, g };
  }
}
