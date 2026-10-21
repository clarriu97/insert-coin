import type { GameDefinition } from '../../engine/types.ts';
import { create, SCREEN, sounds, status, step, type InvadersState } from './logic.ts';
import { render } from './render.ts';

export const invaders: GameDefinition<InvadersState> = {
    id: 'invaders',
    title: 'INVADERS',
    screen: SCREEN,
    controls: [
        { keys: '← → / A D', action: 'MOVE' },
        { keys: 'SPACE', action: 'FIRE' }
    ],
    create,
    step,
    render,
    status,
    sounds
};
