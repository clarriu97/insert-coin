import { describe, expect, it } from 'vitest';
import { createRng, randomSeed } from './rng.ts';

describe('createRng', () => {
    it('produces the same sequence for the same seed', () => {
        const a = createRng(42);
        const b = createRng(42);
        expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
    });

    it('produces different sequences for different seeds', () => {
        expect(createRng(1).next()).not.toEqual(createRng(2).next());
    });

    it('keeps next() within [0, 1)', () => {
        const rng = createRng(7);
        for (let i = 0; i < 1000; i++) {
            const value = rng.next();
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });

    it('keeps int() within [0, max) and covers the whole range', () => {
        const rng = createRng(3);
        const seen = new Set<number>();
        for (let i = 0; i < 500; i++) {
            seen.add(rng.int(7));
        }
        expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });
});

describe('randomSeed', () => {
    it('returns an unsigned 32-bit integer', () => {
        const seed = randomSeed();
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThan(4294967296);
    });
});
