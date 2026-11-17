# ashwarden-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Iruwae/ashwarden-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Iruwae/ashwarden-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

ASHWARDEN — a 3D ember arena roguelite. You are the Ashwarden, last knight of the ember, holding a ruined dusk circle through ten waves of ash-spawn — and breaking the crown of the Ash Tyrant.

## Run it

```sh
node serve.ts
# → http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=817k0hr2&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## How to play

Serve the game locally and open it in a desktop browser:

```sh
node serve.ts
# → http://localhost:8080
```

No build step, no network while playing: the game is plain static files in
`game/` (Three.js 0.187.0 is vendored as minified files under `game/vendor/`),
and all audio is synthesized WebAudio.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse | Aim |
| Hold left click / Space | Fire ember bolts |
| 1 / 2 / 3 (or click) | Pick a blessing between waves |
| P / Esc | Pause |
| M | Mute |
| R | Restart after game over / victory |
| Enter | Start from the title screen |

## The loop

- **Waves 1–10.** Drifters chase you, spitters shoot from range, brutes soak
  damage. Waves 5 and 10 bring **The Ash Tyrant** — the wave-10 Tyrant is the
  final boss; kill it and the run is won.
- **Embers.** Kills drop embers; they magnet toward you and add score.
- **Blessings.** After each cleared wave, draft 1 of 3: damage, fire rate,
  multishot, chain lightning, crit, shield, speed, magnet, max HP, pierce.
- **Lose** at 0 HP. Best score is saved in `localStorage`.

## Feel

Trauma-based screen shake, hit-stop on kills, squash & stretch on the knight
and enemies, floating damage numbers, ember particle bursts, kill flash,
wave banners, low-HP vignette pulse, muzzle-flash motes, spawn telegraphs —
plus synthesized SFX and a slow ambient pad (M to mute).

## Structure

```
game/
  index.html          HUD + screens + import map
  vendor/three.module.min.js   vendored Three.js 0.187.0
  src/
    main.js           bootstrap & fixed-step (1/60 s) loop
    config.js         all tuning numbers
    random.js         seeded RNG (mulberry32)
    input.js          keyboard + mouse
    audio.js          synthesized WebAudio SFX + music
    world.js          arena, lights, rune ring, ruins
    player.js         the Ashwarden
    enemies.js        drifter / spitter / brute / boss FSM
    projectiles.js    pooled bolts & orbs
    particles.js      pooled GPU ember particles
    blessings.js      the blessing pool
    waves.js          wave director / spawner
    hud.js            HUD DOM + screens
    juice.js          shake, hit-stop, flash, damage numbers
    shots.js          deterministic ?shot= scenes
    state.js          run state machine + best score
```

Deterministic screenshot scenes: `?shot=title|play|boss|victory&seed=N` stages
the scene and sets `window.__shotReady` when it is ready to capture.

## Credits

- Game code, design and tuning: built for the make.fun best-game-01 bounty.
- Three.js 0.187.0 (MIT) — vendored, see `game/vendor/`.
- No external assets, fonts, or audio files: system fonts only, all audio
  synthesized at runtime.
- License: MIT (see `LICENSE`).
