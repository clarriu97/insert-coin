Status: accepted

# Spec: CRT arcade design system (M3)

Parent spec: `2026-10-16-insert-coin-revamp.md` (Design system section). Issues #15, #16, #18, #19.

## Direction

An original, authentic early-80s upright cabinet seen head-on, not a "neon synthwave" page. The reference is the physical object: backlit marquee, black bezel with a printed instruction card, a curved CRT with visible scanlines and phosphor bloom, and a control panel. No real cabinet's branding, artwork or game names are reproduced.

Patterns to reject: purple/indigo gradients, glassmorphism, card grids with drop shadows, rounded-2xl everything, emoji as icons, glow on every element.

## Screens and their job

| Screen | Job | Primary action |
|---|---|---|
| Menu | Pick a game in under 5 s | Arrows + ENTER / tap a row |
| Attract (idle menu) | Make the cabinet feel alive | Any input returns to the menu |
| Game | Play with nothing in the way | Game controls; P pause, ESC back |

The menu is a vertical list of games (like a multi-game cabinet's select screen), with the selected game's cover art and best score shown beside it. It replaces the current two-card grid.

## Tokens

Colours are CSS custom properties in `src/design/tokens.css`, mirrored in `src/design/palette.ts` for canvases. Semantic names only in components.

| Token | Value | Use |
|---|---|---|
| `--crt-black` | `#06070a` | screen background |
| `--phosphor-white` | `#f1eee4` | primary text on screen |
| `--phosphor-amber` | `#ffb52e` | titles, selection, score |
| `--phosphor-cyan` | `#44e0ff` | secondary accents, keys |
| `--phosphor-magenta` | `#ff4f8b` | danger, enemies, A button |
| `--phosphor-green` | `#58ff7a` | player, success |
| `--phosphor-dim` | `#8d8a9a` | helper text (≥ 4.5:1 on `--crt-black`) |
| `--cabinet-body` | `#17141c` | cabinet panels |
| `--cabinet-edge` | `#050407` | t-molding, bezel |
| `--side-art-1/2/3` | `#ff5a1f` `#ffb52e` `#ffe066` | 80s stripe side art |

Spacing scale: 4, 8, 12, 16, 24, 32 px (`--space-1` … `--space-6`). Radii: 2 px (controls), 6 px (panels), CRT corners use an elliptical radius.

## Typography

Self-hosted via `@fontsource` (OFL-1.1), no third-party requests:
- **Press Start 2P**: marquee, headings, game titles, buttons.
- **VT323**: body, HUD values, helper text and tables. It stays readable at small sizes where Press Start 2P becomes noise.

## CRT effect

On `.crt-screen` only, layered with pseudo-elements so content stays crisp and accessible:
- elliptical corner radius and an inner vignette to suggest curvature;
- scanlines (`repeating-linear-gradient`, 3 px period, ~12 % opacity);
- subtle phosphor bloom: text-shadow on screen text, `drop-shadow` on the game canvas;
- a very slow, low-amplitude flicker and a rolling scan band.

`prefers-reduced-motion: reduce` removes flicker, the rolling band, blink and attract-mode transitions. The effect must not drop the game below 60 fps on a mid-range laptop.

## Accessibility

- WCAG AA contrast for all text, using the tokens above.
- The menu is a real list of buttons with roving focus; keyboard, mouse and touch all work, and the focus ring is visible (amber outline).
- One `h1` per screen (marquee title); overlays use `h2`.

## Success criteria

- No hard-coded colours outside `tokens.css` and `palette.ts`.
- No requests to fonts.googleapis.com or fonts.gstatic.com.
- Lighthouse (mobile) Accessibility ≥ 95 on the menu.
- Screenshots at 1440 × 900 and 375 × 667 for menu, game and game over in each PR.
- Reduced motion verified with `page.emulateMedia({ reducedMotion: 'reduce' })` in e2e.
