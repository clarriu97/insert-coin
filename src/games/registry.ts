import type { GameDefinition } from '../engine/types.ts';

export interface GameEntry {
    id: string;
    title: string;
    cover: string;
    players: string;
    hidden?: boolean;
    load(): Promise<GameDefinition<unknown>>;
}

export const GAMES: GameEntry[] = [
    {
        id: 'snake',
        title: 'SNAKE',
        cover: 'games/snake.svg',
        players: '1 PLAYER',
        load: () => import('./snake/index.ts').then((module) => module.snake)
    },
    {
        id: 'tetris',
        title: 'BLOCKS',
        cover: 'games/tetris.svg',
        players: '1 PLAYER',
        load: () => import('./tetris/index.ts').then((module) => module.tetris)
    },
    {
        id: 'invaders',
        title: 'INVADERS',
        cover: 'games/invaders.svg',
        players: '1 PLAYER',
        load: () => import('./invaders/index.ts').then((module) => module.invaders)
    },
    {
        id: 'demo',
        title: 'TEST PATTERN',
        cover: 'favicon.svg',
        players: '1 PLAYER',
        hidden: true,
        load: () => import('./demo/index.ts').then((module) => module.demo)
    }
];

export function gamePath(entry: GameEntry): string {
    return `/play/${entry.id}`;
}

export function findGame(id: string | undefined): GameEntry | undefined {
    return GAMES.find((entry) => entry.id === id);
}
