import { createRng, type Rng } from '../../engine/rng.ts';
import type { Button, GameStatus, InputFrame } from '../../engine/types.ts';

export const GRID = 20;
export const TILE = 8;
export const SCREEN = { width: GRID * TILE, height: GRID * TILE };
export const SPEEDS = [
    { label: 'EASY', tickMs: 150 },
    { label: 'MEDIUM', tickMs: 100 },
    { label: 'HARD', tickMs: 60 }
] as const;

const SEED_RANGE = 4294967296;
const INITIAL_LENGTH = 3;
const FOOD_SCORE = 10;
const BUFFER_SIZE = 2;

export type Direction = 'up' | 'down' | 'left' | 'right';
export type Mode = 'select' | 'running' | 'won' | 'dead';

export interface Point {
    x: number;
    y: number;
}

export interface SnakeState {
    mode: Mode;
    speedIndex: number;
    tickMs: number;
    snake: Point[];
    direction: Direction;
    queue: Direction[];
    food: Point | null;
    score: number;
    elapsedMs: number;
    seed: number;
}

const VECTORS: Record<Direction, Point> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

const OPPOSITES: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DIRECTIONS = Object.keys(VECTORS) as Direction[];

function same(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
}

function placeFood(snake: Point[], seed: number): { food: Point | null; seed: number } {
    const occupied = new Set(snake.map((segment) => segment.y * GRID + segment.x));
    const free = Array.from({ length: GRID * GRID }, (_, cell) => cell).filter((cell) => !occupied.has(cell));
    const rng = createRng(seed);
    const cell = free[rng.int(free.length)];
    const food = cell === undefined ? null : { x: cell % GRID, y: Math.floor(cell / GRID) };
    return { food, seed: rng.int(SEED_RANGE) };
}

export function create(rng: Rng): SnakeState {
    const center = Math.floor(GRID / 2);
    const snake = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({ x: center - i, y: center }));
    const { food, seed } = placeFood(snake, rng.int(SEED_RANGE));
    return {
        mode: 'select',
        speedIndex: 0,
        tickMs: SPEEDS[0].tickMs,
        snake,
        direction: 'right',
        queue: [],
        food,
        score: 0,
        elapsedMs: 0,
        seed
    };
}

function select(state: SnakeState, pressed: ReadonlySet<Button>): SnakeState {
    if (pressed.has('action') || pressed.has('start')) {
        return { ...state, mode: 'running', elapsedMs: 0 };
    }
    const delta = (pressed.has('right') || pressed.has('down') ? 1 : 0) - (pressed.has('left') || pressed.has('up') ? 1 : 0);
    const speedIndex = (state.speedIndex + delta + SPEEDS.length) % SPEEDS.length;
    return { ...state, speedIndex, tickMs: SPEEDS[speedIndex]?.tickMs ?? state.tickMs };
}

function enqueue(state: SnakeState, pressed: ReadonlySet<Button>): Direction[] {
    const queue = [...state.queue];
    for (const direction of DIRECTIONS.filter((candidate) => pressed.has(candidate))) {
        const last = queue.at(-1) ?? state.direction;
        if (queue.length < BUFFER_SIZE && direction !== last && direction !== OPPOSITES[last]) {
            queue.push(direction);
        }
    }
    return queue;
}

function advance(state: SnakeState): SnakeState {
    const [turn, ...queue] = state.queue;
    const direction = turn ?? state.direction;
    const [head] = state.snake;
    if (!head) return state;
    const vector = VECTORS[direction];
    const next = { x: head.x + vector.x, y: head.y + vector.y };
    const moved = { ...state, direction, queue };

    if (next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID) {
        return { ...moved, mode: 'dead' };
    }
    const eating = state.food !== null && same(next, state.food);
    const body = eating ? state.snake : state.snake.slice(0, -1);
    if (body.some((segment) => same(segment, next))) {
        return { ...moved, mode: 'dead' };
    }
    const snake = [next, ...body];
    if (!eating) {
        return { ...moved, snake };
    }
    const { food, seed } = placeFood(snake, state.seed);
    return { ...moved, snake, food, seed, score: state.score + FOOD_SCORE, mode: food ? 'running' : 'won' };
}

export function step(state: SnakeState, input: InputFrame, dtMs: number): SnakeState {
    if (state.mode === 'select') return select(state, input.pressed);
    if (state.mode !== 'running') return state;

    let next: SnakeState = { ...state, queue: enqueue(state, input.pressed), elapsedMs: state.elapsedMs + dtMs };
    while (next.mode === 'running' && next.elapsedMs >= next.tickMs) {
        next = advance({ ...next, elapsedMs: next.elapsedMs - next.tickMs });
    }
    return next;
}

export function status(state: SnakeState): GameStatus {
    return {
        score: state.score,
        over: state.mode === 'won' || state.mode === 'dead',
        hud: [
            { label: 'SCORE', value: state.score },
            { label: 'LENGTH', value: state.snake.length },
            { label: 'SPEED', value: SPEEDS[state.speedIndex]?.label ?? '' }
        ]
    };
}
