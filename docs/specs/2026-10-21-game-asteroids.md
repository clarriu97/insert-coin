Status: accepted

# Spec: Asteroids (M4)

Parent spec: `2026-10-16-insert-coin-revamp.md` (`game-asteroids`). Issues #23 (logic) and #24 (renderer, sound, registration).

## Screen

320 × 240 logical units. Everything wraps around the edges except the saucer, which crosses the screen horizontally and leaves.

## Rules

- **Ship**: rotates while ← / → are held, thrusts while ↑ is held. Velocity keeps its inertia, decays with a slight drag and is capped.
- **Bullets**: SPACE fires; at most 4 alive, each lives under a second and wraps.
- **Asteroids**: large, medium and small, each an irregular polygon from the seed with a random velocity and spin. A hit large rock splits into two medium ones, a medium into two small ones; small ones vanish.
- **Hyperspace**: Z / X teleports the ship to a random spot, stopped, with a 1 in 10 chance of exploding.
- **Saucer**: after a while a saucer crosses the screen, changing vertical direction now and then and firing. The large one fires at random, the small one aims at the ship. Its bullets also break rocks (no points).
- **Lives**: 3, plus one every 10 000 points. After losing a ship the next one waits at least 2 s and until the centre is clear of rocks, saucer and saucer bullets, then spawns with 2 s of invulnerability.
- **Waves**: wave 1 has 4 large rocks; every cleared wave starts the next after a short pause with one more large rock (capped at 11), spawned on the edges.
- **Collisions**: circles, measured across the wrap. Rocks hitting the ship or the saucer also break and score as if shot.
- **Game over** when the last ship is lost, after a short pause to show the explosion.

Logic is deterministic: the state keeps a seed instead of an `Rng`, and every movement scales with `dtMs`.

## Scoring

| Target | Points |
|---|---|
| Large / medium / small rock | 20 / 50 / 100 |
| Large / small saucer | 200 / 1000 |

## Controls

| Keys | Action |
|---|---|
| ← → | rotate |
| ↑ | thrust |
| SPACE | fire |
| Z X | hyperspace |

## Rendering

Vector-monitor look: strokes only, `lineWidth` 1 and a small `shadowBlur` glow. Palette colours: `foreground` for ship and rocks, `secondary` for bullets, `danger` for the saucer and its bullets, `accent` for canvas text. The thrust flame flickers, explosions throw debris lines, and the ship blinks while invulnerable. HUD: SCORE, LIVES, WAVE.

## Sounds

| Event | Sound |
|---|---|
| Ship fires | `shoot` |
| Rock or saucer destroyed | `explode` |
| Thrust starts | `thrust` |
| Ship lost | `hit` |
| Game over | `die` |
| Saucer appears | `rotate` |
| Extra life | `coin` |

## Out of scope

Two-player alternation, rock counts/speeds tuned per arcade revision, saucer bullets scoring, attract mode demo, sound loops (heartbeat, continuous saucer siren).
