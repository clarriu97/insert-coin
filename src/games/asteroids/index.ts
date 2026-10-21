import type { GameDefinition } from '../../engine/types.ts';
import { create, SCREEN, sounds, status, step, type AsteroidsState } from './logic.ts';
import { render } from './render.ts';

export const asteroids: GameDefinition<AsteroidsState> = {
    id: 'asteroids',
    title: 'ASTEROIDS',
    screen: SCREEN,
    controls: [
        { keys: '← →', action: 'ROTATE' },
        { keys: '↑', action: 'THRUST' },
        { keys: 'SPACE', action: 'FIRE' },
        { keys: 'Z X', action: 'HYPERSPACE' }
    ],
    create,
    step,
    render,
    status,
    sounds
};
