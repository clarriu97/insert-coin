import type { Palette } from '../../engine/types.ts';
import { GRID, SCREEN, SPEEDS, TILE, type Direction, type Point, type SnakeState } from './logic.ts';

const FONT = '8px "Press Start 2P", monospace';
const LINE = 14;
const PULSE_MS = 400;

const EYES: Record<Direction, [number, number][]> = {
    up: [[2, 1], [5, 1]],
    down: [[2, 6], [5, 6]],
    left: [[1, 2], [1, 5]],
    right: [[6, 2], [6, 5]]
};

function text(ctx: CanvasRenderingContext2D, value: string, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillText(value, SCREEN.width / 2, y);
}

function drawGrid(ctx: CanvasRenderingContext2D, palette: Palette) {
    ctx.fillStyle = palette.muted;
    ctx.globalAlpha = 0.18;
    for (let y = 1; y < GRID; y++) {
        for (let x = 1; x < GRID; x++) {
            ctx.fillRect(x * TILE, y * TILE, 1, 1);
        }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.muted;
    ctx.strokeRect(0.5, 0.5, SCREEN.width - 1, SCREEN.height - 1);
}

function drawBody(ctx: CanvasRenderingContext2D, snake: Point[], palette: Palette) {
    ctx.fillStyle = palette.primary;
    snake.forEach((segment, index) => {
        ctx.fillRect(segment.x * TILE + 1, segment.y * TILE + 1, TILE - 2, TILE - 2);
        const next = snake[index + 1];
        if (next && Math.abs(next.x - segment.x) + Math.abs(next.y - segment.y) === 1) {
            const x = Math.min(segment.x, next.x) * TILE + 1;
            const y = Math.min(segment.y, next.y) * TILE + 1;
            const horizontal = next.y === segment.y;
            ctx.fillRect(x, y, horizontal ? TILE * 2 - 2 : TILE - 2, horizontal ? TILE - 2 : TILE * 2 - 2);
        }
    });
}

function drawHead(ctx: CanvasRenderingContext2D, head: Point, direction: Direction, palette: Palette) {
    ctx.fillStyle = palette.yellow;
    ctx.fillRect(head.x * TILE, head.y * TILE, TILE, TILE);
    ctx.fillStyle = palette.background;
    for (const [x, y] of EYES[direction]) {
        ctx.fillRect(head.x * TILE + x, head.y * TILE + y, 1, 1);
    }
}

function drawFood(ctx: CanvasRenderingContext2D, food: Point, elapsedMs: number, palette: Palette) {
    const inset = Math.floor(elapsedMs / PULSE_MS) % 2 === 0 ? 1 : 2;
    ctx.fillStyle = palette.danger;
    ctx.fillRect(food.x * TILE + inset, food.y * TILE + inset, TILE - inset * 2, TILE - inset * 2);
    ctx.fillStyle = palette.primary;
    ctx.fillRect(food.x * TILE + 4, food.y * TILE, 1, 2);
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
    ctx.lineWidth = 1;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
    drawGrid(ctx, palette);

    if (state.mode === 'select') {
        renderSelect(ctx, state, palette);
        return;
    }

    if (state.food) {
        drawFood(ctx, state.food, state.elapsedMs + state.score * PULSE_MS, palette);
    }
    drawBody(ctx, state.snake, palette);
    const [head] = state.snake;
    if (head) {
        drawHead(ctx, head, state.direction, palette);
    }

    if (state.mode === 'won') {
        ctx.fillStyle = palette.background;
        ctx.fillRect(0, SCREEN.height / 2 - LINE, SCREEN.width, LINE * 2);
        text(ctx, 'YOU WIN', SCREEN.height / 2, palette.accent);
    }
}
