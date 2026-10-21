# INSERT COIN

A browser arcade cabinet with four classic-style games, built to feel like an early-80s upright: backlit marquee, CRT screen with scanlines, chiptune sound and high-score tables.

[![CI](https://github.com/clarriu97/insert-coin/actions/workflows/ci.yml/badge.svg)](https://github.com/clarriu97/insert-coin/actions/workflows/ci.yml)
[![Deploy](https://github.com/clarriu97/insert-coin/actions/workflows/deploy.yml/badge.svg)](https://github.com/clarriu97/insert-coin/actions/workflows/deploy.yml)

**Play: https://larri.dev/insert-coin/**

## Games

| Game | Controls |
|---|---|
| **SNAKE** | Arrows / WASD steer · pick a speed, then eat and grow; fill the board to win |
| **BLOCKS** | ← → move · ↓ soft drop · SPACE hard drop · ↑ / Z X rotate · C hold. 7-bag, SRS wall kicks, ghost piece, lock delay |
| **INVADERS** | ← → move · SPACE fire. Marching formation, destructible bunkers, mystery saucer |
| **ASTEROIDS** | ← → rotate · ↑ thrust · SPACE fire · Z X hyperspace. Vector graphics, splitting rocks, saucers |

Everywhere: **ENTER** start · **P** pause · **ESC** back to the menu · **M** sound on/off. On phones, on-screen controls appear automatically.

Scores that make the top 10 ask for your initials and are kept in your browser. Leave the menu idle and the cabinet goes into attract mode.

## Development

Requirements: Node 24+, pnpm 12, [just](https://github.com/casey/just).

```bash
just install
```

```bash
just dev
```

| Recipe | What it does |
|---|---|
| `just dev` | Vite dev server |
| `just build` / `just preview` | Production build and local preview |
| `just test` / `just test-watch` | Vitest unit tests |
| `just e2e` | Builds under `/insert-coin/` and runs Playwright (desktop + phone) |
| `just check-fast` | ESLint (zero warnings) + TypeScript |
| `just check-task` | `check-fast` + unit tests |
| `just check-full` | `check-fast` + coverage thresholds + e2e + bundle budgets (what CI runs) |

The quality bar is described in [CONSTRAINTS.md](CONSTRAINTS.md). Specs live in [docs/specs](docs/specs).

## Architecture

```
src/
  engine/     framework-agnostic runtime: game contract, fixed-timestep loop,
              input (keyboard + touch), session phases, audio synth, high scores
  games/      one folder per game: pure logic.ts + tests, canvas render.ts, index.ts
  shell/      React UI: cabinet, menu, attract mode, game host, overlays, touch controls
  design/     tokens.css (colours, fonts, spacing), CRT effect, palette.ts for canvases
e2e/          Playwright specs
```

Games are pure: `create(rng)` builds a state, `step(state, input, dtMs)` returns the next one, and `render` draws it. The host owns the loop, input, pause, game over and high scores, so a game never touches the DOM, timers or storage.

### Adding a game

1. Create `src/games/<id>/` with `logic.ts` (pure, seeded randomness kept in state), `logic.test.ts` (≥ 85 % coverage), `render.ts` (palette colours only) and `index.ts` exporting a `GameDefinition` (optionally with `sounds(previous, next)`).
2. Register it in `src/games/registry.ts` with a title and an original cover in `public/games/`.
3. `just check-full`: the menu, routing and the generic e2e smoke test pick it up automatically.

## Deployment

Every push to `master` runs the checks and deploys `dist/` to GitHub Pages through GitHub Actions. Routing uses hash URLs (`#/play/snake`) so refreshes work on static hosting.

## License

MIT, see [LICENSE](LICENSE). Fonts: Press Start 2P and VT323 (SIL Open Font License), self-hosted via Fontsource. All game art and sound are original.
