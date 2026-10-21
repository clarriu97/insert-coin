Status: accepted

# Spec: INVADERS

An original fixed-shooter in the spirit of the 1978 classic, built on the engine contract (`GameDefinition<InvadersState>`). All sprites, names and sounds are original.

## Screen

224 × 256 logical pixels, portrait like the original cabinet. Top line: score and wave. Bottom: ground line and remaining lives.

## Rules

- A 5 × 11 formation of three alien types (top row small, two middle rows medium, two bottom rows large) marches sideways one step at a time. When an alive alien would cross the side margin, the formation drops 8 px and reverses.
- The march interval shrinks as aliens die and with each wave.
- The player cannon moves left and right along its row and fires one shot at a time; a new shot needs the previous one to be gone.
- Aliens drop bombs from the bottom alien of a random (seeded) column, at most 3 on screen.
- 4 bunkers made of 2 px cells sit above the cannon. Shots and bombs erode them; aliens marching through erase the cells they overlap.
- A SAUCER crosses the top at seeded intervals while 8 or more aliens remain. It is worth a seeded value of 50, 100, 150 or 300.
- Being hit costs a life: the cannon explodes, the action freezes briefly and the cannon respawns at the centre.
- Clearing the formation starts a new wave after a short pause: faster march, formation starting 8 px lower per wave (capped), bunkers rebuilt.
- Game over when lives run out or an alien reaches the cannon row.

## Scoring

| Target | Points |
|---|---|
| Large alien (rows 4–5) | 10 |
| Medium alien (rows 2–3) | 20 |
| Small alien (row 1) | 30 |
| SAUCER | 50 / 100 / 150 / 300 |

3 lives at start, one extra life the first time the score reaches 1500.

## Controls

| Keys | Action |
|---|---|
| ← → / A D | move |
| SPACE / J | fire (edge-triggered) |

P pauses and ESC exits, handled by the shell.

## HUD

SCORE, LIVES, WAVE.

## Sounds

Derived in `sounds(previous, next)`: `shoot` on fire, `explode` on an alien or SAUCER kill, `hit` when the cannon is hit, `move` on every march step, `win` on wave clear, `die` on game over.

## Determinism

Randomness comes from a seed stored in state and re-derived each step, so `step` is pure and the same seed and inputs give the same game.

## Out of scope

Two-player mode, attract mode demo, shot/bomb mid-air collisions, the original's per-shot SAUCER scoring trick, pitch-varying march notes (the engine `move` effect has a single note).
