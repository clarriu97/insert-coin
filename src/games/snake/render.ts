import type { Palette } from '../../engine/types.ts';
import { SCREEN, SPEEDS, TILE, type Point, type SnakeState } from './logic.ts';

const FONT = '8px monospace';
const LINE = 12;

function tile(ctx: CanvasRenderingContext2D, point: Point, inset: number) {
    ctx.fillRect(point.x * TILE + inset, point.y * TILE + inset, TILE - inset * 2, TILE - inset * 2);
}

function text(ctx: CanvasRenderingContext2D, value: string, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillText(value, SCREEN.width / 2, y);
}

function renderSelect(ctx: CanvasRenderingContext2D, state: SnakeState, palette: Palette) {
    const top = SCREEN.height / 2 - LINE * 2;
    text(ctx, 'SELECT SPEED', top, palette.foreground);
    SPEEDS.forEach((speed, index) => {
        const selected = index === state.speedIndex;
        text(ctx, selected ? `> ${speed.label} <` : speed.label, top + LINE * (index + 1.5), selected ? palette.accent : palette.muted);
    });
}

export function render(ctx: CanvasRenderingContext2D, state: SnakeState, palette: Palette) {
    ctx.imageSmoothingEnabled = false;
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);

    if (state.mode === 'select') {
        renderSelect(ctx, state, palette);
        return;
    }

    if (state.food) {
        ctx.fillStyle = palette.danger;
        tile(ctx, state.food, 1);
    }
    ctx.fillStyle = palette.foreground;
    state.snake.slice(1).forEach((segment) => tile(ctx, segment, 1));
    const [head] = state.snake;
    if (head) {
        ctx.fillStyle = palette.accent;
        tile(ctx, head, 0);
    }

    if (state.mode === 'won') {
        ctx.fillStyle = palette.background;
        ctx.fillRect(0, SCREEN.height / 2 - LINE, SCREEN.width, LINE * 2);
        text(ctx, 'YOU WIN', SCREEN.height / 2, palette.accent);
    }
}
