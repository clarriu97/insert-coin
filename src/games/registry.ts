import type { GameDefinition } from '../engine/types.ts';

interface BaseEntry {
    id: string;
    title: string;
    cover: string;
    players: string;
    hidden?: boolean;
}

export interface NativeEntry extends BaseEntry {
    kind: 'native';
    load(): Promise<GameDefinition<unknown>>;
}

export interface LegacyEntry extends BaseEntry {
    kind: 'legacy';
    src: string;
}

export type GameEntry = NativeEntry | LegacyEntry;

export const GAMES: GameEntry[] = [
    {
        kind: 'native',
        id: 'snake',
        title: 'SNAKE',
        cover: 'games/snake.svg',
        players: '1 PLAYER',
        load: () => import('./snake/index.ts').then((module) => module.snake)
    },
    {
        kind: 'legacy',
        id: 'tetris',
        title: 'TETRIS',
        cover: 'games/tetris.svg',
        players: '1 PLAYER',
        src: 'legacy/games/tetris/index.html'
    },
    {
        kind: 'native',
        id: 'demo',
        title: 'TEST PATTERN',
        cover: 'favicon.svg',
        players: '1 PLAYER',
        hidden: true,
        load: () => import('./demo/index.ts').then((module) => module.demo)
    }
];

export function gamePath(entry: GameEntry): string {
    return entry.kind === 'native' ? `/play/${entry.id}` : `/${entry.id}`;
}

export function findGame(id: string | undefined): GameEntry | undefined {
    return GAMES.find((entry) => entry.id === id);
}
