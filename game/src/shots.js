// Deterministic screenshot scenes: ?shot=title|play|boss|victory&seed=N stages
// the scene (seeded, fixed time) and sets window.__shotReady when the frame
// is ready to capture. Used by the screenshot script, never by players.
import { CFG } from './config.js';
import { rollBlessings } from './blessings.js';

export function stageShot(game, name) {
  const rng = game.rng;
  const place = (g, count, minDist = 7) => {
    for (let i = 0; i < count; i++) {
      const p = rng.arenaPoint(CFG.arenaRadius - 4, minDist);
      g.enemies.spawn(i % 3 === 0 ? 'spitter' : i % 3 === 1 ? 'brute' : 'drifter', p.x, p.z, 1);
    }
  };

  const settle = () => {
    // Run the sim a fixed number of ticks so spawns finish telegraphing and
    // the scene is stable, then flag ready on the next rendered frame.
    for (let i = 0; i < 50; i++) game.step(1 / 60);
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  };

  if (name === 'title') {
    game.toTitle();
    place(game, 5);
    for (let i = 0; i < 40; i++) game.step(1 / 60);
    window.__shotReady = true;
    return;
  }

  if (name === 'play') {
    game.startRun();
    game._pendingWave = 0; // staged wave 3, not the auto wave 1
    game.run.wave = 3;
    game.run.score = 2450;
    game.run.ember = 37;
    game.run.kills = 19;
    game.player.hp = 78;
    game.player.pos.set(-3, 0, 2);
    game.waves.wave = 3;
    game.waves.active = true;
    place(game, 7);
    // A few ember pickups + a bolt mid-flight for action.
    game.spawnEmbers(2, -1, 6);
    game.projectiles.fireBolt(-1, 1.1, 1, { x: 0.7, z: -0.7 }, 34, 12, 0);
    game.run.blessingsTaken = rollBlessings(rng, 2);
    game.hud.banner('WAVE 3', 'Hold the circle', 4000);
    settle();
    return;
  }

  if (name === 'boss') {
    game.startRun();
    game._pendingWave = 0; // staged wave 5, not the auto wave 1
    game.run.wave = 5;
    game.run.score = 5200;
    game.run.ember = 64;
    game.run.kills = 41;
    game.player.hp = 62;
    game.player.pos.set(-6, 0, 4);
    game.waves.wave = 5;
    game.waves.active = true;
    const boss = game.enemies.spawn('boss', 6, -3, 1);
    boss.state = 'active'; boss.stateT = 0; boss.group.visible = true;
    boss.group.scale.set(1, 1, 1);
    game.scene.remove(boss.tele);
    place(game, 3);
    game.run.blessingsTaken = rollBlessings(rng, 3);
    game.hud.banner('⚠ THE ASH TYRANT ⚠', 'Break its crown', 4000);
    game.hud.boss(true, 'THE ASH TYRANT', 0.72);
    settle();
    return;
  }

  if (name === 'victory') {
    game.startRun();
    game._pendingWave = 0;
    game.run.wave = 10;
    game.run.score = 18400;
    game.run.ember = 231;
    game.run.kills = 132;
    game.run.time = 642;
    game.run.blessingsTaken = rollBlessings(rng, 5);
    game.player.hp = 45;
    game.player.pos.set(0, 0, 3);
    place(game, 0);
    game.victory();
    game.particles.burst(0, 2, 0, 60, 0xffa63d, 9, 1, 16, 6);
    for (let i = 0; i < 30; i++) game.step(1 / 60);
    window.__shotReady = true;
    return;
  }

  window.__shotReady = true;
}
