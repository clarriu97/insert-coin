Status: accepted

# Spec: Insert Coin revamp

## Objective

Insert Coin is a browser arcade (GitHub Pages, `larri.dev/insert-coin`) started in 2023 as an AI-development experiment. It is outdated: games are vanilla JS pages inside iframes, there are no tests, tooling is two majors behind and the look is generic.

Goal: turn it into a polished, authentic-feeling 80s arcade that is pleasant to play on desktop and mobile, with a codebase where adding a game is a well-defined, tested task.

Target user: a casual visitor who opens the link and wants to play a classic game in under 5 seconds, with keyboard or touch.

User stories:

- As a player I pick a game from an arcade cabinet screen with keyboard, mouse or touch and start playing immediately.
- As a player I can pause, resume and exit any game with the same keys (P / ESC) and on-screen buttons.
- As a player my best scores are saved per game and I can enter my initials, arcade style.
- As a mobile player I get on-screen controls and a layout that fits my screen.
- As a player I hear chiptune sound effects, and I can mute them (persisted).
- As the maintainer I add a game by implementing one interface and registering it, with logic covered by unit tests.

## Capability map

| Module id | Responsibility | Depends on |
|---|---|---|
| `tooling` | pnpm, Vite, React, TypeScript, ESLint, Vitest, Playwright, `justfile`, PR CI, dead-code removal | — |
| `engine` | Game contract, fixed-timestep loop, input (keyboard + touch), audio synth, high-score storage | `tooling` |
| `design-system` | CRT theme: tokens, pixel fonts, palette shared with canvas renderers, CRT effects, reduced motion | `tooling` |
| `shell` | React app: cabinet UI, game select, game host (pause/ESC/HUD/high-score entry), routing | `engine`, `design-system` |
| `game-snake` | Snake ported to the engine + fixes | `engine` |
| `game-tetris` | Tetris ported to the engine + modern guideline fixes | `engine` |
| `game-invaders` | New: Space Invaders | `engine` |
| `game-asteroids` | New: Asteroids | `engine` |

Build order: `tooling` → `engine` → `shell` (minimal) → `game-snake`, `game-tetris` (parallel) → `design-system` + `shell` redesign → `game-invaders`, `game-asteroids` (parallel).

This document specs `tooling`, `engine`, `shell` and `design-system`, plus the scope of the two ported games. Each new game gets its own spec (`docs/specs/YYYY-MM-DD-game-<id>.md`) when its milestone starts.

### GitHub milestones

| Milestone | Modules |
|---|---|
| M1 Foundation | `tooling`, `engine`, minimal `shell` |
| M2 Games revamp | `game-snake`, `game-tetris`, high scores |
| M3 Visual redesign | `design-system`, `shell` redesign, audio |
| M4 New games | `game-invaders`, `game-asteroids` |

## Tech stack

- Node 24 LTS (CI), pnpm 12 (`packageManager` field)
- Vite 8, React 19, React Router 8 (hash routing, keeps static hosting refresh-safe)
- TypeScript, `strict: true`. If `typescript-eslint` does not support TS 7 yet, pin the latest supported TS major and record why.
- ESLint flat config + `typescript-eslint` + `eslint-plugin-react-hooks`
- Vitest (unit, coverage via v8), Playwright (e2e smoke, Chromium only)
- Canvas 2D for games, Web Audio API for synthesized sound (no audio assets)
- No runtime dependencies beyond React and React Router without asking first.

## Commands

All via `just` (no logic in `package.json` scripts beyond what Vite needs).

```
just install       # pnpm install --frozen-lockfile
just dev           # vite dev server
just build         # vite build (honours VITE_BASE_PATH)
just preview       # vite preview of dist/
just lint          # eslint .
just typecheck     # tsc --noEmit
just test          # vitest run
just test-watch    # vitest
just coverage      # vitest run --coverage
just e2e           # playwright test
just check-fast    # lint + typecheck
just check-task    # check-fast + test
just check-full    # check-task + coverage thresholds + build + e2e
```

## Project structure

```
src/
  main.tsx, App.tsx          → entry and routes
  shell/                     → React UI: Cabinet, GameSelect, GameHost, HighScoreEntry, TouchControls
  engine/                    → game contract, loop, input, audio, storage (framework-agnostic, no React)
  design/                    → tokens.css, crt.css, palette.ts (shared with canvas)
  games/<id>/
    logic.ts                 → pure state + step function (no DOM)
    logic.test.ts            → unit tests
    render.ts                → canvas renderer
    index.ts                 → GameDefinition export
  games/registry.ts          → list of GameDefinitions
public/                      → favicon, game cover art
e2e/                         → Playwright specs
docs/specs/                  → specs
```

Removed: `public/legacy/`, `src/games/*` vanilla copies, `src/index.html`, `src/main.js`, `src/public/`, `.eslintrc.json`.

## Code style

Pure, deterministic game logic; side effects (canvas, audio, storage, time, randomness) injected at the edges.

```ts
export interface GameDefinition<S> {
    id: string;
    title: string;
    screen: Screen;
    controls: ControlHint[];
    create(rng: Rng): S;
    step(state: S, input: InputFrame, dtMs: number): S;
    render(ctx: CanvasRenderingContext2D, state: S, palette: Palette): void;
    status(state: S): GameStatus;
}

export function step(state: SnakeState, input: InputFrame, dtMs: number): SnakeState {
    const direction = nextDirection(state.direction, input.direction);
    const elapsed = state.elapsedMs + dtMs;
    if (elapsed < state.tickMs) {
        return { ...state, direction, elapsedMs: elapsed };
    }
    return advance({ ...state, direction, elapsedMs: elapsed - state.tickMs });
}
```

- 4-space indent, single quotes, semicolons (as today).
- Named exports, no default exports except React route components if needed.
- `camelCase` functions/variables, `PascalCase` types/components, kebab-case file names for non-components.
- No comments unless something non-obvious can't be expressed in code.
- Randomness only through an injected seeded `Rng` so tests are deterministic.

## Testing strategy

- **Unit (Vitest)**: every `games/*/logic.ts` and `engine/*` module. Coverage ≥ 85 % lines and branches for `src/engine` and `src/games/**/logic.ts`, enforced in `vitest.config.ts`.
- **Bug fixes**: prove-it pattern, a failing test first.
- **Component (Vitest + Testing Library)**: only for shell behaviour with logic (high-score entry, keyboard navigation). Ask first before adding Testing Library.
- **E2E (Playwright, Chromium)**: smoke per game: open home, select game, start, pause, ESC back to menu. Runs on built `dist/` via `vite preview`.
- **Visual**: manual check in a real browser for every UI PR, desktop and 375 px width, screenshots in the PR description.

## Boundaries

- **Always**: one issue → one branch → one PR, Conventional Commits, `just check-full` green before asking to merge, link the issue and spec section in the PR, keep the deploy working.
- **Ask first**: adding runtime dependencies, changing repository settings (branch protection, Pages), changing the deploy workflow semantics, merging PRs to `master` (until told otherwise), deleting anything on GitHub.
- **Never**: commit `.env` or print the token, push to `master` directly, disable lint rules or skip tests to get green, lower coverage thresholds, use copyrighted game assets (sprites, sounds, the Tetris trademark artwork); all art is original.

## Feature requirements

### Engine

- Fixed timestep (1000/60 ms) with accumulator; render once per animation frame; pauses automatically on `visibilitychange` hidden.
- Input normalised into an `InputFrame` (direction, `action`, `secondary`, `pause`, edge-triggered `pressed` set) from keyboard (arrows/WASD, Space, Enter, P, ESC) and touch controls.
- Audio: small synth (square/triangle/noise + envelopes) exposing named effects; lazily created on first user gesture; global mute persisted in `localStorage`.
- Session phases: ready → playing ↔ paused → over; restart from over is locked out for 750 ms so mashed inputs don't skip it. Hiding the tab pauses the session, not the loop.
- High scores: top 10 per game `{ initials, score, date }`, versioned key in `localStorage`, tolerant to corrupt or missing data and to `localStorage` throwing.

### Shell

- Cabinet with game select grid driven by the registry; arrows/Enter, mouse and touch.
- `GameHost` mounts a canvas scaled with integer-ish pixel scaling to fit the screen, shows HUD (score, best, game-specific fields), pause overlay, game-over overlay with high-score entry (3 initials), ESC/back always returns to menu.
- Touch controls (d-pad + A/B + pause) shown on coarse pointers.
- Each game is lazy-loaded (`import()`), so the home bundle does not include game code.

### Snake (port + fixes)

- Same rules; starts moving immediately on start; input buffer of 2 turns so fast turns are not lost; no 180° reversal; win state when board is full (no infinite loop); speed presets kept.

### Tetris (port + fixes)

- 7-bag randomizer, SRS rotation with wall kicks, ghost piece, hold, lock delay, DAS/ARR for horizontal movement, hard drop (Space) / rotate (Up, X, Z), guideline scoring and level speed curve.
- Named "Tetris" only in code ids; UI title "BLOCKS" or similar original name to avoid trademark use (open question).

### Design system (M3)

- Authentic 80s cabinet: marquee with lit sign, bezel, CRT screen with curvature, scanlines, vignette, subtle phosphor glow and flicker; attract mode on idle (demo/high-score table cycling); "INSERT COIN" blink and coin sound on start.
- Pixel fonts self-hosted (no Google Fonts request), palette as CSS tokens and a matching `palette.ts` for canvases.
- `prefers-reduced-motion` disables flicker and animations; WCAG AA contrast on text; visible focus.

## Success criteria

- `just check-full` passes locally and in a PR CI workflow on every pull request.
- No iframes and no `public/legacy` in the build; four games playable from the menu.
- Each game logic module ≥ 85 % line and branch coverage.
- Playwright smoke passes for every registered game.
- Home route initial JS ≤ 120 kB gzip; each game chunk loaded on demand.
- Lighthouse (mobile) Performance ≥ 90, Accessibility ≥ 95 on the home page.
- Playable at 375 × 667 with touch controls and at 1440 × 900 with keyboard, verified with screenshots.
- High scores survive reload; mute survives reload.
- Deployed site works under `/insert-coin/` base path.

## Open questions

1. Tetris trademark: keep the name "TETRIS" in the UI (current state) or rename to an original title? Default: rename to "BLOCKS" in UI.
2. Merging: may I merge my own PRs once CI and review are green, or do you want to review each one? Default: I ask before each merge.
3. Branch protection on `master` requiring the CI check: enable it? Default: no, ask first.
