// Seeded RNG (mulberry32) — every gameplay random draw goes through here so
// ?shot= scenes and replays are deterministic for a given seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) { this.next = mulberry32(seed); this.seed = seed >>> 0; }
  float() { return this.next(); }
  range(min, max) { return min + this.next() * (max - min); }
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  angle() { return this.next() * Math.PI * 2; }
  // Random point inside the arena, at least `minR` from the centre.
  arenaPoint(radius, minR = 6) {
    const a = this.angle();
    const r = minR + this.next() * (radius - minR);
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }
}
