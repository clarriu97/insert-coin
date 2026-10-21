set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

install:
    pnpm install --frozen-lockfile

dev:
    pnpm exec vite

build:
    pnpm exec vite build

preview: build
    pnpm exec vite preview

lint:
    pnpm exec eslint . --max-warnings 0

typecheck:
    pnpm exec tsc --noEmit

test:
    pnpm exec vitest run

test-watch:
    pnpm exec vitest

coverage:
    pnpm exec vitest run --coverage

e2e:
    VITE_BASE_PATH=/insert-coin/ pnpm exec vite build
    pnpm exec playwright test

check-fast: lint typecheck

check-task: check-fast test

check-full: check-fast coverage e2e
