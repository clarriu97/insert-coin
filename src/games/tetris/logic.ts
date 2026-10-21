import { createRng, type Rng } from '../../engine/rng.ts';
import type { GameStatus, InputFrame } from '../../engine/types.ts';
import { cells, kicks, PIECE_KINDS, spawnColumn, type Offset, type PieceKind, type Rotation } from './srs.ts';

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;
export const SOFT_DROP_MS = 50;
export const LINES_PER_LEVEL = 10;
const SEED_RANGE = 4294967296;
const MIN_QUEUE = 7;
const LINE_POINTS = [0, 100, 300, 500, 800];

export type Cell = PieceKind | null;
export type Board = Cell[][];

export interface Piece {
    kind: PieceKind;
    rotation: Rotation;
    x: number;
    y: number;
}

export interface TetrisState {
    board: Board;
    active: Piece;
    queue: PieceKind[];
    seed: number;
    gravityMs: number;
    score: number;
    level: number;
    lines: number;
    over: boolean;
}

export function emptyBoard(): Board {
    return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

export function pieceCells({ kind, rotation, x, y }: Piece): Offset[] {
    return cells(kind, rotation).map(([dx, dy]) => [x + dx, y + dy]);
}

export function fits(board: Board, piece: Piece): boolean {
    return pieceCells(piece).every(([x, y]) => x >= 0 && x < COLS && board[y]?.[x] === null);
}

export function rotate(board: Board, piece: Piece, direction: 1 | -1): Piece | null {
    const rotation = ((piece.rotation + direction + 4) % 4) as Rotation;
    for (const [dx, dy] of kicks(piece.kind, piece.rotation, rotation)) {
        const candidate = { ...piece, rotation, x: piece.x + dx, y: piece.y + dy };
        if (fits(board, candidate)) return candidate;
    }
    return null;
}

export function gravityIntervalMs(level: number): number {
    return (0.8 - (level - 1) * 0.007) ** (level - 1) * 1000;
}

function shuffledBag(rng: Rng): PieceKind[] {
    const bag = [...PIECE_KINDS];
    for (let index = bag.length - 1; index > 0; index--) {
        const swap = rng.int(index + 1);
        [bag[index], bag[swap]] = [bag[swap] as PieceKind, bag[index] as PieceKind];
    }
    return bag;
}

function refill(queue: PieceKind[], seed: number): { queue: PieceKind[]; seed: number } {
    let next = { queue, seed };
    while (next.queue.length < MIN_QUEUE) {
        const rng = createRng(next.seed);
        next = { queue: [...next.queue, ...shuffledBag(rng)], seed: rng.int(SEED_RANGE) };
    }
    return next;
}

function moved(board: Board, piece: Piece, dx: number, dy: number): Piece | null {
    const candidate = { ...piece, x: piece.x + dx, y: piece.y + dy };
    return fits(board, candidate) ? candidate : null;
}

function spawn(state: TetrisState): TetrisState {
    const [kind, ...rest] = state.queue;
    if (!kind) return state;
    const { queue, seed } = refill(rest, state.seed);
    const placed: Piece = { kind, rotation: 0, x: spawnColumn(kind), y: 0 };
    if (!fits(state.board, placed)) {
        return { ...state, queue, seed, over: true };
    }
    const active = moved(state.board, placed, 0, 1) ?? placed;
    return { ...state, active, queue, seed, gravityMs: 0 };
}

export function create(rng: Rng): TetrisState {
    const { queue, seed } = refill([], rng.int(SEED_RANGE));
    const placeholder: Piece = { kind: 'O', rotation: 0, x: 0, y: 0 };
    return spawn({
        board: emptyBoard(),
        active: placeholder,
        queue,
        seed,
        gravityMs: 0,
        score: 0,
        level: 1,
        lines: 0,
        over: false
    });
}

function clearLines(board: Board): { board: Board; cleared: number } {
    const kept = board.filter((row) => row.some((cell) => cell === null));
    const cleared = ROWS - kept.length;
    return { board: [...emptyBoard().slice(0, cleared), ...kept], cleared };
}

function lock(state: TetrisState): TetrisState {
    const board = state.board.map((row) => [...row]);
    for (const [x, y] of pieceCells(state.active)) {
        const row = board[y];
        if (row) row[x] = state.active.kind;
    }
    const { board: clearedBoard, cleared } = clearLines(board);
    const lines = state.lines + cleared;
    return spawn({
        ...state,
        board: clearedBoard,
        lines,
        level: Math.floor(lines / LINES_PER_LEVEL) + 1,
        score: state.score + (LINE_POINTS[cleared] ?? 0) * state.level
    });
}

function shift(state: TetrisState, pressed: InputFrame['pressed']): TetrisState {
    const dx = (pressed.has('right') ? 1 : 0) - (pressed.has('left') ? 1 : 0);
    const active = dx === 0 ? null : moved(state.board, state.active, dx, 0);
    return active ? { ...state, active } : state;
}

function turn(state: TetrisState, pressed: InputFrame['pressed']): TetrisState {
    const direction = (pressed.has('up') ? 1 : 0) - (pressed.has('secondary') ? 1 : 0);
    const active = direction === 0 ? null : rotate(state.board, state.active, direction as 1 | -1);
    return active ? { ...state, active } : state;
}

function hardDrop(state: TetrisState): TetrisState {
    let active = state.active;
    let distance = 0;
    for (let next = moved(state.board, active, 0, 1); next; next = moved(state.board, active, 0, 1)) {
        active = next;
        distance++;
    }
    return lock({ ...state, active, score: state.score + 2 * distance });
}

function fall(state: TetrisState, softDrop: boolean, dtMs: number): TetrisState {
    const gravity = gravityIntervalMs(state.level);
    const interval = softDrop ? Math.min(gravity, SOFT_DROP_MS) : gravity;
    let next = { ...state, gravityMs: state.gravityMs + dtMs };
    while (next.gravityMs >= interval) {
        const active = moved(next.board, next.active, 0, 1);
        if (!active) return lock(next);
        next = {
            ...next,
            active,
            gravityMs: next.gravityMs - interval,
            score: next.score + (softDrop ? 1 : 0)
        };
    }
    return next;
}

export function step(state: TetrisState, input: InputFrame, dtMs: number): TetrisState {
    if (state.over) return state;
    const { pressed, held } = input;
    const controlled = turn(shift(state, pressed), pressed);
    if (pressed.has('action')) return hardDrop(controlled);
    return fall(controlled, held.has('down') || pressed.has('down'), dtMs);
}

export function status(state: TetrisState): GameStatus {
    return {
        score: state.score,
        over: state.over,
        hud: [
            { label: 'SCORE', value: state.score },
            { label: 'LEVEL', value: state.level },
            { label: 'LINES', value: state.lines }
        ]
    };
}
