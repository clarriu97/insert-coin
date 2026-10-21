import { describe, expect, it } from 'vitest';
import type { Button, InputFrame } from '../../engine/types.ts';
import { create, SCREEN, SIZE, status, step } from './logic.ts';

function frame(pressed: Button[] = []): InputFrame {
    return { pressed: new Set(pressed), held: new Set() };
}

describe('demo logic', () => {
    it('moves diagonally', () => {
        const next = step(create(), frame(), 100);
        expect(next.x).toBeCloseTo(6);
        expect(next.y).toBeCloseTo(6);
    });

    it('bounces off every wall', () => {
        const right = step({ ...create(), x: SCREEN.width - SIZE - 1, vx: 0.1 }, frame(), 20);
        expect(right.vx).toBeLessThan(0);
        expect(right.x).toBeLessThanOrEqual(SCREEN.width - SIZE);

        const left = step({ ...create(), x: 1, vx: -0.1 }, frame(), 20);
        expect(left.vx).toBeGreaterThan(0);
        expect(left.x).toBeGreaterThanOrEqual(0);
    });

    it('scores on action and ends on secondary', () => {
        const scored = step(create(), frame(['action']), 16);
        expect(status(scored)).toEqual({ score: 10, over: false, hud: [{ label: 'SCORE', value: 10 }] });
        expect(status(step(scored, frame(['secondary']), 16)).over).toBe(true);
    });
});
