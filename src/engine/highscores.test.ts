import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    browserStorage,
    createHighScoreStore,
    MAX_ENTRIES,
    normalizeInitials,
    STORAGE_PREFIX,
    type ScoreStorage
} from './highscores.ts';

function memoryStorage(initial: Record<string, string> = {}): ScoreStorage & { data: Record<string, string> } {
    const data = { ...initial };
    return {
        data,
        getItem: (key) => data[key] ?? null,
        setItem: (key, value) => {
            data[key] = value;
        }
    };
}

const fixedNow = () => new Date('2026-10-21T10:00:00.000Z');

describe('createHighScoreStore', () => {
    it('starts empty', () => {
        const store = createHighScoreStore(memoryStorage(), fixedNow);
        expect(store.list('snake')).toEqual([]);
        expect(store.best('snake')).toBe(0);
    });

    it('stores entries sorted by score per game', () => {
        const storage = memoryStorage();
        const store = createHighScoreStore(storage, fixedNow);
        store.submit('snake', 'abc', 100);
        store.submit('snake', 'xyz', 300);
        store.submit('tetris', 'tet', 50);

        expect(store.list('snake').map((entry) => entry.score)).toEqual([300, 100]);
        expect(store.best('snake')).toBe(300);
        expect(store.list('tetris')).toEqual([{ initials: 'TET', score: 50, date: '2026-10-21T10:00:00.000Z' }]);
        expect(JSON.parse(storage.data[`${STORAGE_PREFIX}snake`] ?? '')).toHaveLength(2);
    });

    it('keeps older entries first on ties', () => {
        const store = createHighScoreStore(memoryStorage(), fixedNow);
        store.submit('snake', 'AAA', 100);
        store.submit('snake', 'BBB', 100);
        expect(store.list('snake').map((entry) => entry.initials)).toEqual(['AAA', 'BBB']);
    });

    it('keeps only the top entries', () => {
        const store = createHighScoreStore(memoryStorage(), fixedNow);
        for (let score = 1; score <= MAX_ENTRIES + 2; score++) {
            store.submit('snake', 'AAA', score * 10);
        }
        const entries = store.list('snake');
        expect(entries).toHaveLength(MAX_ENTRIES);
        expect(entries.at(-1)?.score).toBe(30);
    });

    it('only qualifies positive scores that beat the table', () => {
        const store = createHighScoreStore(memoryStorage(), fixedNow);
        expect(store.qualifies('snake', 0)).toBe(false);
        expect(store.qualifies('snake', 1)).toBe(true);
        for (let i = 0; i < MAX_ENTRIES; i++) {
            store.submit('snake', 'AAA', 100);
        }
        expect(store.qualifies('snake', 100)).toBe(false);
        expect(store.qualifies('snake', 101)).toBe(true);
        expect(store.submit('snake', 'LOW', 50).some((entry) => entry.initials === 'LOW')).toBe(false);
    });

    it('ignores corrupt or invalid stored data', () => {
        const store = createHighScoreStore(memoryStorage({
            [`${STORAGE_PREFIX}snake`]: '{not json',
            [`${STORAGE_PREFIX}tetris`]: '{"score": 1}',
            [`${STORAGE_PREFIX}blocks`]: JSON.stringify([
                { initials: 'OK!', score: 10, date: 'd' },
                { initials: 'BAD', score: 'x', date: 'd' },
                { initials: 'NAN', score: null, date: 'd' },
                null
            ])
        }), fixedNow);
        expect(store.list('snake')).toEqual([]);
        expect(store.list('tetris')).toEqual([]);
        expect(store.list('blocks')).toEqual([{ initials: 'OK!', score: 10, date: 'd' }]);
    });

    it('survives storage that throws', () => {
        const failing: ScoreStorage = {
            getItem: () => {
                throw new Error('denied');
            },
            setItem: () => {
                throw new Error('quota');
            }
        };
        const store = createHighScoreStore(failing, fixedNow);
        expect(store.list('snake')).toEqual([]);
        expect(store.submit('snake', 'AAA', 10)).toHaveLength(1);
    });

    it('works without storage', () => {
        const store = createHighScoreStore(null, fixedNow);
        expect(store.submit('snake', 'AAA', 10)).toHaveLength(1);
        expect(store.list('snake')).toEqual([]);
    });
});

describe('normalizeInitials', () => {
    it('uppercases, strips non-letters and pads to three', () => {
        expect(normalizeInitials('a1b')).toBe('ABA');
        expect(normalizeInitials('abcd')).toBe('ABC');
        expect(normalizeInitials('')).toBe('AAA');
    });
});

describe('browserStorage', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns localStorage when available', () => {
        const localStorage = memoryStorage();
        vi.stubGlobal('window', { localStorage });
        expect(browserStorage()).toBe(localStorage);
    });

    it('returns null when access throws', () => {
        vi.stubGlobal('window', {
            get localStorage() {
                throw new Error('SecurityError');
            }
        });
        expect(browserStorage()).toBeNull();
    });
});
