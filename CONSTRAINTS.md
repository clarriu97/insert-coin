# Constraints

The quality bar is enforced by `just` recipes. Thresholds live in each tool's own config, not here.

| Recipe | Runs | When |
|---|---|---|
| `just check-fast` | ESLint (zero warnings), `tsc --noEmit` | while iterating |
| `just check-task` | `check-fast` + Vitest | before each commit |
| `just check-full` | `check-fast` + Vitest with coverage thresholds + build + Playwright | before opening or merging a PR, and in CI |

| Dimension | Threshold | Defined in |
|---|---|---|
| Lint | 0 errors, 0 warnings | `eslint.config.js`, `--max-warnings 0` in `justfile` |
| Types | `strict`, `noUncheckedIndexedAccess` | `tsconfig.json` |
| Coverage of `src/engine` and `src/games/**/logic.ts` | ≥ 85 % lines, branches, functions, statements | `vitest.config.ts` |
| E2E | every registered game passes the smoke test | `e2e/`, `playwright.config.ts` |

Never lower a threshold, add `eslint-disable`/`@ts-ignore`/`@ts-expect-error`, or skip or delete a test to get green without asking first.
