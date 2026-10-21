import type { GameDefinition } from '../../engine/types.ts';
import { create, SCREEN, status, step, type SnakeState } from './logic.ts';
import { render } from './render.ts';

export const snake: GameDefinition<SnakeState> = {
    id: 'snake',
    title: 'SNAKE',
    screen: SCREEN,
    controls: [
        { keys: 'ARROWS / WASD', action: 'STEER' },
        { keys: 'SPACE / ENTER', action: 'CONFIRM SPEED' }
    ],
    create,
    step,
    render,
    status
};
