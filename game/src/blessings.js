// Blessings: the between-wave draft. Pick 3 distinct from the pool; each one
// mutates the player (or run) exactly once. Icons are emoji-free glyphs via text.
export const BLESSINGS = [
  { id: 'dmg', name: 'Ember Edge', icon: '▲', desc: '+30% bolt damage', apply: (p) => { p.damage *= 1.3; } },
  { id: 'rate', name: 'Rapid Cinders', icon: '≫', desc: '+25% fire rate', apply: (p) => { p.fireInterval *= 0.8; } },
  { id: 'multi', name: 'Twin Flames', icon: '✦', desc: '+1 bolt per shot', apply: (p) => { p.multishot += 1; } },
  { id: 'chain', name: 'Storm Chain', icon: 'ϟ', desc: 'Bolts chain to 1 more enemy', apply: (p) => { p.chain += 1; } },
  { id: 'crit', name: 'Kindled Eye', icon: '◎', desc: '+15% crit chance (2x dmg)', apply: (p) => { p.crit += 0.15; } },
  { id: 'shield', name: 'Ashen Aegis', icon: '⬢', desc: '+40 shield (absorbs damage)', apply: (p) => { p.shield += 40; } },
  { id: 'speed', name: 'Windborne', icon: '»', desc: '+15% move speed', apply: (p) => { p.speed *= 1.15; } },
  { id: 'magnet', name: 'Ember Lure', icon: '◉', desc: '+60% ember pickup radius', apply: (p) => { p.magnetR *= 1.6; } },
  { id: 'vigor', name: 'Heart of Cinders', icon: '♥', desc: '+25 max HP and heal 25', apply: (p) => { p.maxHp += 25; p.heal(25); } },
  { id: 'pierce', name: 'Piercing Brand', icon: '➤', desc: 'Bolts pierce +1 enemy', apply: (p, run) => { run.pierce += 1; } },
];

export function rollBlessings(rng, count = 3) {
  const pool = [...BLESSINGS];
  const out = [];
  while (out.length < count && pool.length) {
    const i = Math.floor(rng.float() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
