import type { Palette } from '../../engine/types.ts';
import { COLS, ghost, HIDDEN_ROWS, pieceCells, VISIBLE_ROWS, type TetrisState } from './logic.ts';
import { cells, type PieceKind } from './srs.ts';

export const CELL = 8;
const MARGIN = 8;
const BOARD_WIDTH = COLS * CELL;
const BOARD_HEIGHT = VISIBLE_ROWS * CELL;
const PANEL_X = MARGIN * 2 + BOARD_WIDTH;
const NEXT_COUNT = 3;
const LABEL_GAP = 12;
const PREVIEW_SLOT = 3 * CELL;

export const SCREEN = { width: 160, height: BOARD_HEIGHT + MARGIN * 2 };

const FONT = '8px "Press Start 2P", monospace';

const colorCache = new WeakMap<Palette, Readonly<Record<PieceKind, string>>>();

function pieceColors(palette: Palette): Readonly<Record<PieceKind, string>> {
    const cached = colorCache.get(palette);
    if (cached) return cached;
    const colors = {
        I: palette.secondary,
        J: palette.blue,
        L: palette.orange,
        O: palette.yellow,
        S: palette.primary,
        T: palette.danger,
        Z: palette.accent
    };
    colorCache.set(palette, colors);
    return colors;
}

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, palette: Palette) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, CELL - 1, CELL - 1);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = palette.foreground;
    ctx.fillRect(x, y, CELL - 1, 1);
    ctx.fillRect(x, y, 1, CELL - 1);
    ctx.fillStyle = palette.background;
    ctx.fillRect(x + 1, y + CELL - 2, CELL - 2, 1);
    ctx.fillRect(x + CELL - 2, y + 1, 1, CELL - 2);
    ctx.globalAlpha = 1;
}

function drawBoardCell(ctx: CanvasRenderingContext2D, column: number, row: number, color: string, palette: Palette) {
    if (row < HIDDEN_ROWS) return;
    drawCell(ctx, MARGIN + column * CELL, MARGIN + (row - HIDDEN_ROWS) * CELL, color, palette);
}

function drawGhostCell(ctx: CanvasRenderingContext2D, column: number, row: number, color: string) {
    if (row < HIDDEN_ROWS) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN + column * CELL + 0.5, MARGIN + (row - HIDDEN_ROWS) * CELL + 0.5, CELL - 2, CELL - 2);
}

function drawPreview(ctx: CanvasRenderingContext2D, kind: PieceKind, x: number, y: number, color: string, palette: Palette) {
    for (const [dx, dy] of cells(kind, 0)) {
        drawCell(ctx, x + dx * CELL, y + dy * CELL, color, palette);
    }
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, y: number, palette: Palette) {
    ctx.fillStyle = palette.muted;
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    ctx.fillText(text, PANEL_X, y);
}

export function render(ctx: CanvasRenderingContext2D, state: TetrisState, palette: Palette) {
    const colors = pieceColors(palette);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
    ctx.fillStyle = palette.muted;
    ctx.fillRect(MARGIN - 1, MARGIN - 1, BOARD_WIDTH + 1, BOARD_HEIGHT + 1);
    ctx.fillStyle = palette.background;
    ctx.fillRect(MARGIN, MARGIN, BOARD_WIDTH - 1, BOARD_HEIGHT - 1);

    state.board.forEach((row, y) => row.forEach((cell, x) => {
        if (cell) drawBoardCell(ctx, x, y, colors[cell], palette);
    }));
    const color = colors[state.active.kind];
    for (const [x, y] of pieceCells(ghost(state))) {
        drawGhostCell(ctx, x, y, color);
    }
    for (const [x, y] of pieceCells(state.active)) {
        drawBoardCell(ctx, x, y, color, palette);
    }

    drawLabel(ctx, 'NEXT', MARGIN, palette);
    state.queue.slice(0, NEXT_COUNT).forEach((kind, index) => {
        drawPreview(ctx, kind, PANEL_X, MARGIN + LABEL_GAP + index * PREVIEW_SLOT, colors[kind], palette);
    });

    const holdY = MARGIN + LABEL_GAP + NEXT_COUNT * PREVIEW_SLOT + MARGIN;
    drawLabel(ctx, 'HOLD', holdY, palette);
    if (state.hold) {
        const holdColor = state.holdUsed ? palette.muted : colors[state.hold];
        drawPreview(ctx, state.hold, PANEL_X, holdY + LABEL_GAP, holdColor, palette);
    }
}
