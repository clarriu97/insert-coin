import type { Palette } from '../../engine/types.ts';
import { COLS, HIDDEN_ROWS, pieceCells, VISIBLE_ROWS, type TetrisState } from './logic.ts';
import { cells, type PieceKind } from './srs.ts';

export const CELL = 8;
const MARGIN = 8;
const BOARD_WIDTH = COLS * CELL;
const BOARD_HEIGHT = VISIBLE_ROWS * CELL;
const PANEL_X = MARGIN * 2 + BOARD_WIDTH;

export const SCREEN = { width: 160, height: BOARD_HEIGHT + MARGIN * 2 };

const PIECE_COLORS: Readonly<Record<PieceKind, string>> = {
    I: '#3fd8f0',
    J: '#4f7dff',
    L: '#ffa040',
    O: '#ffe566',
    S: '#5fe07a',
    T: '#b46cff',
    Z: '#ff5a5a'
};

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, CELL - 1, CELL - 1);
}

function drawBoardCell(ctx: CanvasRenderingContext2D, column: number, row: number, color: string) {
    if (row < HIDDEN_ROWS) return;
    drawCell(ctx, MARGIN + column * CELL, MARGIN + (row - HIDDEN_ROWS) * CELL, color);
}

function drawPreview(ctx: CanvasRenderingContext2D, kind: PieceKind, x: number, y: number) {
    for (const [dx, dy] of cells(kind, 0)) {
        drawCell(ctx, x + dx * CELL, y + dy * CELL, PIECE_COLORS[kind]);
    }
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, y: number, palette: Palette) {
    ctx.fillStyle = palette.muted;
    ctx.font = '8px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(text, PANEL_X, y);
}

export function render(ctx: CanvasRenderingContext2D, state: TetrisState, palette: Palette) {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
    ctx.fillStyle = palette.muted;
    ctx.fillRect(MARGIN - 1, MARGIN - 1, BOARD_WIDTH + 1, BOARD_HEIGHT + 1);
    ctx.fillStyle = palette.background;
    ctx.fillRect(MARGIN, MARGIN, BOARD_WIDTH - 1, BOARD_HEIGHT - 1);

    state.board.forEach((row, y) => row.forEach((cell, x) => {
        if (cell) drawBoardCell(ctx, x, y, PIECE_COLORS[cell]);
    }));
    for (const [x, y] of pieceCells(state.active)) {
        drawBoardCell(ctx, x, y, PIECE_COLORS[state.active.kind]);
    }

    drawLabel(ctx, 'NEXT', MARGIN, palette);
    const [next] = state.queue;
    if (next) drawPreview(ctx, next, PANEL_X, MARGIN + 12);
}
