import type { GameDefinition } from '../../engine/types.ts';
import { create, SCREEN, SIZE, status, step, type DemoState } from './logic.ts';

export const demo: GameDefinition<DemoState> = {
    id: 'demo',
    title: 'TEST PATTERN',
    screen: SCREEN,
    controls: [
        { keys: 'SPACE', action: 'SCORE' },
        { keys: 'Z', action: 'GAME OVER' }
    ],
    create,
    step,
    status,
    render(ctx, state, palette) {
        ctx.fillStyle = palette.background;
        ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
        ctx.fillStyle = palette.accent;
        ctx.fillRect(Math.round(state.x), Math.round(state.y), SIZE, SIZE);
    }
};
