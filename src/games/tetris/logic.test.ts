import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng.ts';
import type { Button, InputFrame } from '../../engine/types.ts';
import {
    ARR_MS,
    COLS,
    create,
    DAS_MS,
    emptyBoard,
    ghost,
    gravityIntervalMs,
    LOCK_DELAY_MS,
    MAX_LOCK_RESETS,
    pieceCells,
    ROWS,
    rotate,
    status,
    step,
    type Board,
    type Piece,
    type TetrisState
} from './logic.ts';
import { PIECE_KINDS, type PieceKind } from './srs.ts';

function frame(pressed: Button[] = [], held: Button[] = []): InputFrame {
    return { pressed: new Set(pressed), held: new Set(held) };
}

function boardWith(filled: [number, number][]): Board {
    const board = emptyBoard();
    for (const [x, y] of filled) {
        const row = board[y];
        if (row) row[x] = 'Z';
    }
    return board;
}

function fullRows(rows: number[], gapColumn: number): [number, number][] {
    return rows.flatMap((y) => Array.from({ length: COLS }, (_, x) => [x, y] as [number, number]).filter(([x]) => x !== gapColumn));
}

function game(overrides: Partial<TetrisState> = {}): TetrisState {
    return { ...create(createRng(1)), ...overrides };
}

function piece(kind: PieceKind, rotation: Piece['rotation'], x: number, y: number): Piece {
    return { kind, rotation, x, y };
}

describe('bag randomizer', () => {
    it('deals every piece once in each bag of seven', () => {
        const state = create(createRng(42));
        const dealt = [state.active.kind, ...state.queue].slice(0, 14);
        expect([...dealt.slice(0, 7)].sort()).toEqual([...PIECE_KINDS]);
        expect([...dealt.slice(7, 14)].sort()).toEqual([...PIECE_KINDS]);
    });

    it('is deterministic for a seed', () => {
        const a = create(createRng(7));
        const b = create(createRng(7));
        expect([a.active.kind, ...a.queue]).toEqual([b.active.kind, ...b.queue]);
    });

    it('refills the queue with a fresh bag as pieces are used', () => {
        let state = game();
        const dealt: PieceKind[] = [state.active.kind];
        for (let index = 0; index < 13; index++) {
            state = step({ ...state, board: emptyBoard() }, frame(['action']), 16);
            dealt.push(state.active.kind);
        }
        expect(state.queue.length).toBeGreaterThanOrEqual(7);
        expect([...dealt.slice(7, 14)].sort()).toEqual([...PIECE_KINDS]);
    });
});

describe('spawning', () => {
    it('spawns in the top rows and drops one row when free', () => {
        const state = game();
        const rows = pieceCells(state.active).map(([, y]) => y);
        expect(Math.min(...rows)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...rows)).toBe(2);
    });
});

describe('rotation with wall kicks', () => {
    it('kicks T away from the left wall', () => {
        const rotated = rotate(emptyBoard(), piece('T', 1, -1, 10), 1);
        expect(rotated).toEqual(piece('T', 2, 0, 10));
    });

    it('kicks I away from the right wall using the I table', () => {
        expect(rotate(emptyBoard(), piece('I', 1, 7, 10), 1)).toEqual(piece('I', 2, 6, 10));
    });

    it('kicks I away from the left wall using the I table', () => {
        expect(rotate(emptyBoard(), piece('I', 3, -1, 10), 1)).toEqual(piece('I', 0, 0, 10));
    });

    it('kicks I up from the floor', () => {
        expect(rotate(emptyBoard(), piece('I', 0, 3, ROWS - 2), 1)).toEqual(piece('I', 1, 4, ROWS - 4));
    });

    it('kicks T around a block in the stack', () => {
        const board = boardWith([[5, 12]]);
        expect(rotate(board, piece('T', 0, 4, 10), 1)).toEqual(piece('T', 1, 3, 10));
    });

    it('rotates counter-clockwise', () => {
        expect(rotate(emptyBoard(), piece('T', 0, 4, 10), -1)).toEqual(piece('T', 3, 4, 10));
    });

    it('returns null when every kick is blocked', () => {
        const board = boardWith(fullRows([9, 10, 11, 12, 13], 4).filter(([x]) => x !== 5 && x !== 6));
        expect(rotate(board, piece('I', 1, 3, 9), 1)).toBeNull();
    });

    it('never shifts O', () => {
        expect(rotate(emptyBoard(), piece('O', 0, 8, ROWS - 2), 1)).toEqual(piece('O', 1, 8, ROWS - 2));
    });
});

describe('controls', () => {
    it('moves left and right and stops at walls', () => {
        const state = game({ active: piece('T', 0, 4, 5) });
        expect(step(state, frame(['left']), 16).active.x).toBe(3);
        expect(step(state, frame(['right']), 16).active.x).toBe(5);
        const atWall = game({ active: piece('T', 0, 0, 5) });
        expect(step(atWall, frame(['left']), 16).active.x).toBe(0);
    });

    it('rotates clockwise with up and counter-clockwise with secondary', () => {
        const state = game({ active: piece('T', 0, 4, 5) });
        expect(step(state, frame(['up']), 16).active.rotation).toBe(1);
        expect(step(state, frame(['secondary']), 16).active.rotation).toBe(3);
    });

    it('keeps the piece when a rotation is blocked', () => {
        const board = boardWith(fullRows([9, 10, 11, 12, 13], 4).filter(([x]) => x !== 5 && x !== 6));
        const state = game({ board, active: piece('I', 1, 3, 9) });
        expect(step(state, frame(['up']), 16).active).toEqual(piece('I', 1, 3, 9));
    });

    it('soft drops while down is held and scores one point per cell', () => {
        const state = game({ active: piece('T', 0, 4, 5) });
        const next = step(state, frame([], ['down']), 100);
        expect(next.active.y).toBe(7);
        expect(next.score).toBe(2);
    });

    it('hard drops to the floor, scores two points per cell and locks', () => {
        const state = game({ active: piece('O', 0, 0, 5) });
        const next = step(state, frame(['action']), 16);
        expect(next.score).toBe(2 * (ROWS - 2 - 5));
        expect(next.board[ROWS - 1]?.[0]).toBe('O');
        expect(next.board[ROWS - 2]?.[1]).toBe('O');
        expect(next.active.kind).toBe(state.queue[0]);
    });

    it('does not mutate the previous state', () => {
        const state = game({ active: piece('O', 0, 0, 5) });
        const before = JSON.stringify(state);
        step(state, frame(['action']), 16);
        expect(JSON.stringify(state)).toBe(before);
    });
});

describe('gravity', () => {
    it('follows the guideline curve', () => {
        expect(gravityIntervalMs(1)).toBeCloseTo(1000);
        expect(gravityIntervalMs(2)).toBeCloseTo(793);
        expect(gravityIntervalMs(15)).toBeCloseTo(7.08, 1);
    });

    it('drops one row per interval', () => {
        const state = game({ active: piece('T', 0, 4, 5) });
        expect(step(state, frame(), 999).active.y).toBe(5);
        expect(step(step(state, frame(), 999), frame(), 1).active.y).toBe(6);
    });

    it('drops several rows in one step at high levels', () => {
        const state = game({ active: piece('T', 0, 4, 5), level: 15 });
        expect(step(state, frame(), 16).active.y).toBe(7);
    });
});

describe('line clears and scoring', () => {
    it('clears four lines with I and scores 800 times the level', () => {
        const board = boardWith(fullRows([18, 19, 20, 21], 9));
        const state = game({ board, active: piece('I', 1, 7, 0), level: 2, lines: 10 });
        const next = step(state, frame(['action']), 16);
        expect(next.lines).toBe(14);
        expect(next.score).toBe(800 * 2 + 2 * 18);
        expect(next.board.every((row) => row.every((cell) => cell === null))).toBe(true);
    });

    it.each([
        [1, 100],
        [2, 300],
        [3, 500]
    ])('scores %i lines as %i per level', (count, points) => {
        const rows = Array.from({ length: count }, (_, index) => ROWS - 1 - index);
        const board = boardWith(fullRows(rows, 9));
        const state = game({ board, active: piece('I', 1, 7, ROWS - 4) });
        expect(step(state, frame(['action']), 16).score).toBe(points);
    });

    it('shifts the rows above a cleared line down', () => {
        const board = boardWith([...fullRows([ROWS - 1], 9), [0, ROWS - 2]]);
        const state = game({ board, active: piece('I', 1, 7, ROWS - 4) });
        const next = step(state, frame(['action']), 16);
        expect(next.board[ROWS - 1]?.[0]).toBe('Z');
        expect(next.board[ROWS - 1]?.[9]).toBe('I');
        expect(next.board[ROWS - 2]?.[9]).toBe('I');
    });

    it('levels up every ten lines', () => {
        const board = boardWith(fullRows([ROWS - 1], 9));
        const state = game({ board, active: piece('I', 1, 7, ROWS - 4), lines: 9 });
        const next = step(state, frame(['action']), 16);
        expect(next.lines).toBe(10);
        expect(next.level).toBe(2);
        expect(next.score).toBe(100);
    });
});

describe('game over', () => {
    it('ends on block out when the next piece cannot spawn', () => {
        const board = boardWith([[3, 1], [4, 1], [5, 1], [6, 1], [3, 2], [4, 2], [5, 2], [6, 2]]);
        const state = game({ board, active: piece('O', 0, 0, 5) });
        const next = step(state, frame(['action']), 16);
        expect(next.over).toBe(true);
        expect(status(next).over).toBe(true);
        expect(step(next, frame(['left']), 1000)).toBe(next);
    });
});

describe('status', () => {
    it('reports score, level and lines', () => {
        expect(status(game({ score: 120, level: 3, lines: 21 }))).toEqual({
            score: 120,
            over: false,
            hud: [
                { label: 'SCORE', value: 120 },
                { label: 'LEVEL', value: 3 },
                { label: 'LINES', value: 21 }
            ]
        });
    });
});

describe('ghost piece', () => {
    it('shows where the piece would land', () => {
        expect(ghost(game({ active: piece('T', 0, 4, 5) }))).toEqual(piece('T', 0, 4, ROWS - 2));
        const board = boardWith([[5, 15]]);
        expect(ghost(game({ board, active: piece('T', 0, 4, 5) }))).toEqual(piece('T', 0, 4, 13));
    });
});

describe('hold', () => {
    it('stores the active piece and spawns the next one', () => {
        const state = game();
        const next = step(state, frame(['tertiary']), 16);
        expect(next.hold).toBe(state.active.kind);
        expect(next.active.kind).toBe(state.queue[0]);
        expect(next.holdUsed).toBe(true);
    });

    it('can only be used once per piece', () => {
        const held = step(game(), frame(['tertiary']), 16);
        expect(step(held, frame(['tertiary']), 16).active).toEqual(held.active);
    });

    it('swaps with the held piece after the next lock', () => {
        const held = step(game(), frame(['tertiary']), 16);
        const dropped = step(held, frame(['action']), 16);
        expect(dropped.holdUsed).toBe(false);
        const swapped = step(dropped, frame(['tertiary']), 16);
        expect(swapped.active.kind).toBe(held.hold);
        expect(swapped.hold).toBe(dropped.active.kind);
    });

    it('ends the game when the swapped piece cannot spawn', () => {
        const board = boardWith([[3, 1], [4, 1], [5, 1], [6, 1]]);
        const state = game({ board, hold: 'T', active: piece('O', 0, 0, 10) });
        expect(step(state, frame(['tertiary']), 16).over).toBe(true);
    });
});

describe('lock delay', () => {
    const grounded = () => game({ active: piece('T', 0, 4, ROWS - 2), lowestY: ROWS - 2 });
    const isEmpty = (board: Board) => board.every((row) => row.every((cell) => cell === null));

    it('locks 500 ms after the piece touches down', () => {
        const waiting = step(grounded(), frame(), LOCK_DELAY_MS - 1);
        expect(waiting.active).toEqual(piece('T', 0, 4, ROWS - 2));
        expect(isEmpty(waiting.board)).toBe(true);
        const locked = step(waiting, frame(), 1);
        expect(locked.board[ROWS - 1]?.[4]).toBe('T');
        expect(locked.active.kind).toBe(waiting.queue[0]);
    });

    it('resets the timer when the piece moves or rotates', () => {
        const waiting = step(grounded(), frame(), 400);
        const moved = step(waiting, frame(['left']), 400);
        const rotated = step(moved, frame(['up']), 0);
        expect(rotated.active.rotation).toBe(1);
        expect(isEmpty(step(rotated, frame(), 400).board)).toBe(true);
    });

    it('stops resetting after 15 moves', () => {
        let state = grounded();
        for (let reset = 0; reset < MAX_LOCK_RESETS; reset++) {
            state = step(state, frame([reset % 2 === 0 ? 'left' : 'right']), 100);
        }
        expect(isEmpty(state.board)).toBe(true);
        const locked = step(state, frame(['left']), 400);
        expect(isEmpty(locked.board)).toBe(false);
    });

    it('restores the resets when the piece reaches a new lowest row', () => {
        const board = boardWith([[0, 20], [1, 20]]);
        const state = game({ board, active: piece('O', 0, 0, 18), lowestY: 18, lockResets: MAX_LOCK_RESETS });
        const offLedge = step(step(state, frame(['right']), 16), frame(['right']), 16);
        expect(offLedge.lockMs).toBe(0);
        const fallen = step(offLedge, frame(), 1000);
        expect(fallen.active.y).toBe(19);
        expect(fallen.lockResets).toBe(0);
    });

    it('applies while soft dropping on the floor', () => {
        const state = step(grounded(), frame([], ['down']), 100);
        expect(state.active).toEqual(piece('T', 0, 4, ROWS - 2));
        expect(state.score).toBe(0);
    });
});

describe('auto shift', () => {
    const start = () => game({ active: piece('I', 0, 0, 5) });

    it('moves once, waits 170 ms, then repeats every 50 ms', () => {
        let state = step(start(), frame(['right'], ['right']), 16);
        expect(state.active.x).toBe(1);
        state = step(state, frame([], ['right']), DAS_MS - 1);
        expect(state.active.x).toBe(1);
        state = step(state, frame([], ['right']), 1);
        expect(state.active.x).toBe(2);
        state = step(state, frame([], ['right']), ARR_MS);
        expect(state.active.x).toBe(3);
        state = step(state, frame([], ['right']), ARR_MS * 2);
        expect(state.active.x).toBe(5);
        state = step(state, frame([], ['right']), ARR_MS * 10);
        expect(state.active.x).toBe(COLS - 4);
    });

    it('stops when released and moves once on a tap', () => {
        const released = step(step(start(), frame(['right'], ['right']), 16), frame(), 500);
        expect(released.active.x).toBe(1);
        const tapped = step(released, frame(['right']), 16);
        expect(step(tapped, frame(), 500).active.x).toBe(2);
    });

    it('follows the most recently pressed direction', () => {
        const right = step(game({ active: piece('I', 0, 3, 5) }), frame(['right'], ['right']), 16);
        const left = step(right, frame(['left'], ['left', 'right']), 16);
        expect(left.active.x).toBe(3);
        expect(step(left, frame([], ['left', 'right']), DAS_MS).active.x).toBe(2);
    });
});
