import { describe, expect, it } from 'vitest';
import { pixelScale } from './pixel-scale.ts';

describe('pixelScale', () => {
    it('snaps to whole device pixels when the screen fits at least twice', () => {
        expect(pixelScale(2.95, 1)).toBe(2);
        expect(pixelScale(3.4, 1)).toBe(3);
        expect(pixelScale(1.6, 2)).toBe(1.5);
        expect(pixelScale(1.2, 2)).toBe(1);
    });

    it('keeps the exact fit when the screen is too small for 2 device pixels', () => {
        expect(pixelScale(1.7, 1)).toBe(1.7);
        expect(pixelScale(0.6, 1)).toBe(0.6);
        expect(pixelScale(0.9, 2)).toBe(0.9);
    });
});
