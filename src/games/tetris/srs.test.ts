import { describe, expect, it } from 'vitest';
import { cells, kicks, PIECE_KINDS } from './srs.ts';

const sorted = (offsets: readonly (readonly [number, number])[]) => [...offsets].map(([x, y]) => `${x},${y}`).sort();

describe('srs', () => {
    it('rotates T clockwise to point right', () => {
        expect(sorted(cells('T', 1))).toEqual(sorted([[1, 0], [1, 1], [1, 2], [2, 1]]));
    });

    it('places vertical I in the third column of its box', () => {
        expect(cells('I', 1).every(([x]) => x === 2)).toBe(true);
        expect(cells('I', 3).every(([x]) => x === 1)).toBe(true);
    });

    it('keeps O identical in every rotation', () => {
        for (const rotation of [1, 2, 3] as const) {
            expect(sorted(cells('O', rotation))).toEqual(sorted(cells('O', 0)));
        }
        expect(kicks('O', 0, 1)).toEqual([[0, 0]]);
    });

    it('gives every piece four cells in every rotation', () => {
        for (const kind of PIECE_KINDS) {
            for (const rotation of [0, 1, 2, 3] as const) {
                expect(cells(kind, rotation)).toHaveLength(4);
            }
        }
    });

    it('converts kick offsets to screen coordinates with y growing downwards', () => {
        expect(kicks('T', 0, 1)[2]).toEqual([-1, -1]);
        expect(kicks('I', 0, 1)[4]).toEqual([1, -2]);
    });

    it('uses a separate table for I', () => {
        expect(kicks('I', 1, 2)).not.toEqual(kicks('T', 1, 2));
    });
});
