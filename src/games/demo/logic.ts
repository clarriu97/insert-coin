import type { GameStatus, InputFrame } from '../../engine/types.ts';

export const SCREEN = { width: 160, height: 120 };
export const SIZE = 8;
const SPEED = 0.06;

export interface DemoState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    score: number;
    over: boolean;
}

export function create(): DemoState {
    return { x: 0, y: 0, vx: SPEED, vy: SPEED, score: 0, over: false };
}

function bounce(position: number, velocity: number, max: number): [number, number] {
    if (position < 0) return [-position, Math.abs(velocity)];
    if (position > max) return [2 * max - position, -Math.abs(velocity)];
    return [position, velocity];
}

export function step(state: DemoState, input: InputFrame, dtMs: number): DemoState {
    const [x, vx] = bounce(state.x + state.vx * dtMs, state.vx, SCREEN.width - SIZE);
    const [y, vy] = bounce(state.y + state.vy * dtMs, state.vy, SCREEN.height - SIZE);
    return {
        x,
        y,
        vx,
        vy,
        score: state.score + (input.pressed.has('action') ? 10 : 0),
        over: input.pressed.has('secondary')
    };
}

export function status(state: DemoState): GameStatus {
    return { score: state.score, over: state.over, hud: [{ label: 'SCORE', value: state.score }] };
}
