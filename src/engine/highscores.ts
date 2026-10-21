export const MAX_ENTRIES = 10;
export const STORAGE_PREFIX = 'insert-coin:highscores:v1:';

export interface HighScore {
    initials: string;
    score: number;
    date: string;
}

export type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface HighScoreStore {
    list(gameId: string): HighScore[];
    best(gameId: string): number;
    qualifies(gameId: string, score: number): boolean;
    submit(gameId: string, initials: string, score: number): HighScore[];
}

function isHighScore(value: unknown): value is HighScore {
    const entry = value as Partial<HighScore> | null;
    return typeof entry?.initials === 'string'
        && typeof entry.score === 'number'
        && Number.isFinite(entry.score)
        && typeof entry.date === 'string';
}

export function normalizeInitials(initials: string): string {
    return initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'A');
}

export function browserStorage(): ScoreStorage | null {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

export function createHighScoreStore(
    storage: ScoreStorage | null = browserStorage(),
    now: () => Date = () => new Date()
): HighScoreStore {
    const list = (gameId: string): HighScore[] => {
        try {
            const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_PREFIX + gameId) ?? '[]');
            return Array.isArray(parsed)
                ? parsed.filter(isHighScore).sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES)
                : [];
        } catch {
            return [];
        }
    };

    const qualifies = (gameId: string, score: number) => {
        if (score <= 0) return false;
        const entries = list(gameId);
        const last = entries[MAX_ENTRIES - 1];
        return !last || score > last.score;
    };

    return {
        list,
        best: (gameId) => list(gameId)[0]?.score ?? 0,
        qualifies,
        submit(gameId, initials, score) {
            const entries = list(gameId);
            if (!qualifies(gameId, score)) return entries;
            const entry = { initials: normalizeInitials(initials), score, date: now().toISOString() };
            const position = entries.findIndex((existing) => score > existing.score);
            entries.splice(position === -1 ? entries.length : position, 0, entry);
            const next = entries.slice(0, MAX_ENTRIES);
            try {
                storage?.setItem(STORAGE_PREFIX + gameId, JSON.stringify(next));
            } catch {
                return next;
            }
            return next;
        }
    };
}
