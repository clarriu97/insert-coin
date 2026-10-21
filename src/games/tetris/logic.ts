import { createRng, type Rng } from '../../engine/rng.ts';
import type { GameStatus, InputFrame } from '../../engine/types.ts';
import { cells, kicks, PIECE_KINDS, spawnColumn, type Offset, type PieceKind, type Rotation } from './srs.ts';

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;
export const SOFT_DROP_MS = 50;
export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const DAS_MS = 170;
export const ARR_MS = 50;
export const LINES_PER_LEVEL = 10;
const SEED_RANGE = 4294967296;
const MIN_QUEUE = 7;
const LINE_POINTS = [0, 100, 300, 500, 800];

type Direction = 'left' | 'right';
const DIRECTIONS: readonly Direction[] = ['left', 'right'];
const DIRECTION_DX: Readonly<Record<Direction, number>> = { left: -1, right: 1 };

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
    hold: PieceKind | null;
    holdUsed: boolean;
    gravityMs: number;
    lockMs: number;
    lockResets: number;
    lowestY: number;
    shiftDirection: Direction | null;
    shiftMs: number;
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

function grounded(state: TetrisState): boolean {
    return moved(state.board, state.active, 0, 1) === null;
}

export function ghost(state: TetrisState): Piece {
    let piece = state.active;
    for (let next = moved(state.board, piece, 0, 1); next; next = moved(state.board, piece, 0, 1)) {
        piece = next;
    }
    return piece;
}

function place(state: TetrisState, kind: PieceKind): TetrisState {
    const placed: Piece = { kind, rotation: 0, x: spawnColumn(kind), y: 0 };
    if (!fits(state.board, placed)) {
        return { ...state, over: true };
    }
    const active = moved(state.board, placed, 0, 1) ?? placed;
    return { ...state, active, gravityMs: 0, lockMs: 0, lockResets: 0, lowestY: active.y };
}

function spawn(state: TetrisState): TetrisState {
    const [kind, ...rest] = state.queue as [PieceKind, ...PieceKind[]];
    return place({ ...state, ...refill(rest, state.seed) }, kind);
}

export function create(rng: Rng): TetrisState {
    const { queue, seed } = refill([], rng.int(SEED_RANGE));
    return spawn({
        board: emptyBoard(),
        active: { kind: 'O', rotation: 0, x: 0, y: 0 },
        queue,
        seed,
        hold: null,
        holdUsed: false,
        gravityMs: 0,
        lockMs: 0,
        lockResets: 0,
        lowestY: 0,
        shiftDirection: null,
        shiftMs: 0,
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
        holdUsed: false,
        lines,
        level: Math.floor(lines / LINES_PER_LEVEL) + 1,
        score: state.score + (LINE_POINTS[cleared] ?? 0) * state.level
    });
}

function reposition(state: TetrisState, active: Piece): TetrisState {
    if (!grounded(state) || state.lockResets >= MAX_LOCK_RESETS) {
        return { ...state, active };
    }
    return { ...state, active, lockMs: 0, lockResets: state.lockResets + 1 };
}

function shiftBy(state: TetrisState, direction: Direction, count: number): TetrisState {
    let next = state;
    for (let index = 0; index < count; index++) {
        const active = moved(next.board, next.active, DIRECTION_DX[direction], 0);
        if (!active) break;
        next = reposition(next, active);
    }
    return next;
}

function autoShifts(heldMs: number): number {
    return heldMs < DAS_MS ? 0 : Math.floor((heldMs - DAS_MS) / ARR_MS) + 1;
}

function shift(state: TetrisState, { pressed, held }: InputFrame, dtMs: number): TetrisState {
    const fresh = DIRECTIONS.find((direction) => pressed.has(direction));
    if (fresh) {
        const shiftDirection = held.has(fresh) ? fresh : null;
        return { ...shiftBy(state, fresh, 1), shiftDirection, shiftMs: 0 };
    }
    const direction = state.shiftDirection;
    if (!direction || !held.has(direction)) {
        return { ...state, shiftDirection: null, shiftMs: 0 };
    }
    const shiftMs = state.shiftMs + dtMs;
    return { ...shiftBy(state, direction, autoShifts(shiftMs) - autoShifts(state.shiftMs)), shiftMs };
}

function turn(state: TetrisState, pressed: InputFrame['pressed']): TetrisState {
    const direction = (pressed.has('up') ? 1 : 0) - (pressed.has('secondary') ? 1 : 0);
    const active = direction === 0 ? null : rotate(state.board, state.active, direction as 1 | -1);
    return active ? reposition(state, active) : state;
}

function swapHold(state: TetrisState): TetrisState {
    if (state.holdUsed) return state;
    const swapped = { ...state, hold: state.active.kind, holdUsed: true };
    return state.hold ? place(swapped, state.hold) : spawn(swapped);
}

function hardDrop(state: TetrisState): TetrisState {
    const active = ghost(state);
    return lock({ ...state, active, score: state.score + 2 * (active.y - state.active.y) });
}

function descend(state: TetrisState, active: Piece, interval: number, softDrop: boolean): TetrisState {
    const lower = active.y > state.lowestY;
    return {
        ...state,
        active,
        gravityMs: state.gravityMs - interval,
        lowestY: lower ? active.y : state.lowestY,
        lockResets: lower ? 0 : state.lockResets,
        score: state.score + (softDrop ? 1 : 0)
    };
}

function settle(state: TetrisState, dtMs: number): TetrisState {
    if (!grounded(state)) return { ...state, lockMs: 0 };
    const lockMs = state.lockMs + dtMs;
    return lockMs >= LOCK_DELAY_MS ? lock(state) : { ...state, lockMs };
}

function fall(state: TetrisState, softDrop: boolean, dtMs: number): TetrisState {
    const gravity = gravityIntervalMs(state.level);
    const interval = softDrop ? Math.min(gravity, SOFT_DROP_MS) : gravity;
    let next = { ...state, gravityMs: state.gravityMs + dtMs };
    while (next.gravityMs >= interval) {
        const active = moved(next.board, next.active, 0, 1);
        if (!active) {
            next = { ...next, gravityMs: 0 };
            break;
        }
        next = descend(next, active, interval, softDrop);
    }
    return settle(next, dtMs);
}

export function step(state: TetrisState, input: InputFrame, dtMs: number): TetrisState {
    if (state.over) return state;
    const { pressed, held } = input;
    const ready = pressed.has('tertiary') ? swapHold(state) : state;
    if (ready.over) return ready;
    const controlled = turn(shift(ready, input, dtMs), pressed);
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
