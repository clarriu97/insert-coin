import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng.ts';
import type { Button, InputFrame } from '../../engine/types.ts';
import { create, GRID, SPEEDS, status, step, type Point, type SnakeState } from './logic.ts';

function frame(pressed: Button[] = []): InputFrame {
    return { pressed: new Set(pressed), held: new Set() };
}

function started(seed = 1): SnakeState {
    return step(create(createRng(seed)), frame(['action']), 0);
}

function tick(state: SnakeState, ticks = 1): SnakeState {
    let next = state;
    for (let i = 0; i < ticks; i++) {
        next = step(next, frame(), next.tickMs);
    }
    return next;
}

function head(state: SnakeState): Point | undefined {
    return state.snake[0];
}

function serpentine(): Point[] {
    const path: Point[] = [];
    for (let y = 0; y < GRID; y++) {
        for (let i = 0; i < GRID; i++) {
            path.push({ x: y % 2 === 0 ? i : GRID - 1 - i, y });
        }
    }
    return path;
}

describe('snake logic', () => {
    it('starts in speed selection without moving', () => {
        const state = create(createRng(1));
        expect(state.mode).toBe('select');
        expect(head(step(state, frame(), 1000))).toEqual(head(state));
        expect(status(state)).toEqual({
            score: 0,
            over: false,
            hud: [
                { label: 'SCORE', value: 0 },
                { label: 'LENGTH', value: 3 },
                { label: 'SPEED', value: 'EASY' }
            ]
        });
    });

    it('cycles the speed with the arrows and confirms with action or start', () => {
        let state = create(createRng(1));
        state = step(state, frame(['right']), 16);
        expect(SPEEDS[state.speedIndex]?.label).toBe('MEDIUM');
        state = step(state, frame(['down']), 16);
        expect(SPEEDS[state.speedIndex]?.label).toBe('HARD');
        state = step(state, frame(['right']), 16);
        expect(SPEEDS[state.speedIndex]?.label).toBe('EASY');
        state = step(state, frame(['left']), 16);
        expect(SPEEDS[state.speedIndex]?.label).toBe('HARD');
        state = step(state, frame(['up']), 16);
        expect(SPEEDS[state.speedIndex]?.label).toBe('MEDIUM');

        const running = step(state, frame(['start']), 16);
        expect(running.mode).toBe('running');
        expect(running.tickMs).toBe(100);
        expect(status(running).hud).toContainEqual({ label: 'SPEED', value: 'MEDIUM' });
    });

    it('moves right immediately after starting, one tile per tick', () => {
        const state = started();
        const start = head(state);
        expect(head(step(state, frame(), state.tickMs - 1))).toEqual(start);
        expect(head(tick(state))).toEqual({ x: (start?.x ?? 0) + 1, y: start?.y });
        expect(head(step(state, frame(), state.tickMs * 2))).toEqual({ x: (start?.x ?? 0) + 2, y: start?.y });
    });

    it('keeps two quick turns pressed within one tick', () => {
        let state = started();
        const start = head(state);
        state = step(state, frame(['up']), 0);
        state = step(state, frame(['left']), 0);
        state = tick(state);
        expect(head(state)).toEqual({ x: start?.x, y: (start?.y ?? 0) - 1 });
        state = tick(state);
        expect(head(state)).toEqual({ x: (start?.x ?? 0) - 1, y: (start?.y ?? 0) - 1 });
        expect(state.mode).toBe('running');
    });

    it('ignores a third turn while two are buffered', () => {
        let state = started();
        state = step(state, frame(['up']), 0);
        state = step(state, frame(['left']), 0);
        state = step(state, frame(['down']), 0);
        expect(state.queue).toEqual(['up', 'left']);
    });

    it('never reverses directly', () => {
        const state = started();
        const start = head(state);
        const next = tick(step(state, frame(['left']), 0));
        expect(head(next)).toEqual({ x: (start?.x ?? 0) + 1, y: start?.y });
        expect(next.mode).toBe('running');
    });

    it('never reverses through two buffered turns', () => {
        let state = started();
        const start = head(state);
        state = step(state, frame(['up']), 0);
        state = step(state, frame(['down']), 0);
        state = tick(state, 2);
        expect(head(state)).toEqual({ x: start?.x, y: (start?.y ?? 0) - 2 });
        expect(state.mode).toBe('running');
    });

    it('grows and scores when eating', () => {
        const state = started();
        const start = head(state) ?? { x: 0, y: 0 };
        const next = tick({ ...state, food: { x: start.x + 1, y: start.y } });
        expect(next.snake).toHaveLength(4);
        expect(status(next).score).toBe(10);
        expect(status(next).hud).toContainEqual({ label: 'LENGTH', value: 4 });
    });

    it('dies against a wall', () => {
        const state = started();
        const dead = tick(state, GRID);
        expect(dead.mode).toBe('dead');
        expect(status(dead).over).toBe(true);
        expect(tick(dead)).toBe(dead);
    });

    it('dies against itself', () => {
        const state: SnakeState = {
            ...started(),
            snake: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }],
            direction: 'down',
            food: { x: 0, y: 0 }
        };
        expect(tick(state).mode).toBe('dead');
    });

    it('may move into the cell the tail is leaving', () => {
        const state: SnakeState = {
            ...started(),
            snake: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }],
            direction: 'down',
            food: { x: 0, y: 0 }
        };
        expect(tick(state).mode).toBe('running');
    });

    it('never spawns food on the snake', () => {
        const path = serpentine();
        const free = path.slice(-2);
        const body = path.slice(0, -2).reverse();
        const state: SnakeState = { ...started(), snake: body, direction: 'left', food: free[0] ?? null };
        const next = tick(state);
        expect(next.food).toEqual(free[1]);
    });

    it('places the first food off the snake for any seed', () => {
        for (let seed = 0; seed < 50; seed++) {
            const state = create(createRng(seed));
            expect(state.snake).not.toContainEqual(state.food);
        }
    });

    it('wins when the board is full', () => {
        const path = serpentine();
        const body = path.slice(0, -1).reverse();
        const state: SnakeState = { ...started(), snake: body, direction: 'left', food: path.at(-1) ?? null };
        const won = tick(state);
        expect(won.mode).toBe('won');
        expect(won.food).toBeNull();
        expect(won.snake).toHaveLength(GRID * GRID);
        expect(status(won).over).toBe(true);
    });

    it('is deterministic for a given seed', () => {
        expect(tick(started(42), 5)).toEqual(tick(started(42), 5));
    });
});
