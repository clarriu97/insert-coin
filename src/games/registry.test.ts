import { describe, expect, it } from 'vitest';
import { findGame, gamePath, GAMES } from './registry.ts';

describe('registry', () => {
    it('has unique ids', () => {
        const ids = GAMES.map((entry) => entry.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(GAMES)('loads $id with matching metadata', async (entry) => {
        const definition = await entry.load();
        expect(definition.id).toBe(entry.id);
        expect(definition.title).toBe(entry.title);
    });

    it('builds paths and finds entries', () => {
        expect(GAMES.map(gamePath)).toContain('/play/demo');
        expect(findGame('demo')?.id).toBe('demo');
        expect(findGame(undefined)).toBeUndefined();
    });
});
