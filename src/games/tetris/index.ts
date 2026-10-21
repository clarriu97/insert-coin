import type { GameDefinition } from '../../engine/types.ts';
import { create, sounds, status, step, type TetrisState } from './logic.ts';
import { render, SCREEN } from './render.ts';

export const tetris: GameDefinition<TetrisState> = {
    id: 'tetris',
    title: 'BLOCKS',
    screen: SCREEN,
    controls: [
        { keys: '← →', action: 'MOVE' },
        { keys: '↓', action: 'SOFT DROP' },
        { keys: 'SPACE', action: 'HARD DROP' },
        { keys: '↑', action: 'ROTATE RIGHT' },
        { keys: 'Z X', action: 'ROTATE LEFT' },
        { keys: 'C SHIFT', action: 'HOLD' }
    ],
    create,
    step,
    status,
    render,
    sounds
};
