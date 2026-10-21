import type { SoundName } from '../../engine/audio.ts';
import { createRng, type Rng } from '../../engine/rng.ts';
import type { GameStatus, InputFrame } from '../../engine/types.ts';

export const SCREEN = { width: 224, height: 256 };
export const MARGIN = 8;

export const ROWS = 5;
export const COLS = 11;
export const ALIEN_WIDTH = 12;
export const ALIEN_HEIGHT = 8;
export const ALIEN_SPACING_X = 16;
export const ALIEN_SPACING_Y = 16;
export const FORMATION_X = 24;
export const FORMATION_Y = 48;
export const MARCH_STEP = 2;
export const MARCH_DROP = 8;
export const MAX_WAVE_DROPS = 4;

export const PLAYER_WIDTH = 13;
export const PLAYER_HEIGHT = 8;
export const PLAYER_Y = 216;
export const PLAYER_SPEED = 0.075;

export const SHOT_HEIGHT = 4;
export const SHOT_SPEED = 0.24;
export const SHOT_TOP = 16;

export const BOMB_WIDTH = 3;
export const BOMB_HEIGHT = 7;
export const BOMB_SPEED = 0.08;
export const MAX_BOMBS = 3;
export const GROUND_Y = 232;

export const BUNKER_COUNT = 4;
export const BUNKER_CELL = 2;
export const BUNKER_Y = 184;
export const BUNKER_SHAPE = [
    '..XXXXXXX..',
    '.XXXXXXXXX.',
    'XXXXXXXXXXX',
    'XXXXXXXXXXX',
    'XXXXXXXXXXX',
    'XXXXXXXXXXX',
    'XXX.....XXX',
    'XX.......XX'
];
export const BUNKER_COLS = BUNKER_SHAPE[0]?.length ?? 0;
export const BUNKER_ROWS = BUNKER_SHAPE.length;

export const SAUCER_WIDTH = 16;
export const SAUCER_HEIGHT = 7;
export const SAUCER_Y = 24;
export const SAUCER_SPEED = 0.05;
export const SAUCER_POINTS = [50, 100, 150, 300] as const;
export const SAUCER_MIN_ALIENS = 8;

export const ROW_POINTS = [30, 20, 20, 10, 10] as const;
export const START_LIVES = 3;
export const EXTRA_LIFE_SCORE = 1500;
export const DYING_MS = 1200;
export const CLEARED_MS = 1500;
export const ALIEN_EXPLOSION_MS = 250;
export const SAUCER_EXPLOSION_MS = 1000;

const SEED_RANGE = 4294967296;
const SAUCER_BASE_MS = 15000;
const SAUCER_JITTER_MS = 10000;

export type Mode = 'playing' | 'dying' | 'cleared' | 'over';
export type AlienKind = 'small' | 'medium' | 'large';

export interface Point {
    x: number;
    y: number;
}

export interface Bunker {
    x: number;
    cells: boolean[];
}

export interface Saucer {
    x: number;
    direction: 1 | -1;
    points: number;
}

export interface Explosion extends Point {
    kind: 'alien' | 'saucer';
    ms: number;
    points: number;
}

export interface Formation extends Point {
    direction: 1 | -1;
}

export interface InvadersState {
    mode: Mode;
    modeMs: number;
    wave: number;
    score: number;
    lives: number;
    extraLifeAwarded: boolean;
    player: number;
    shot: Point | null;
    shotsFired: number;
    aliens: boolean[];
    formation: Formation;
    marchMs: number;
    marches: number;
    bombs: Point[];
    bombMs: number;
    bunkers: Bunker[];
    saucer: Saucer | null;
    saucerMs: number;
    explosions: Explosion[];
    kills: number;
    seed: number;
}

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

function overlaps(a: Box, b: Box): boolean {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function alienKind(row: number): AlienKind {
    if (row === 0) return 'small';
    return row < 3 ? 'medium' : 'large';
}

export function alienBox(formation: Point, index: number): Box {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    return {
        x: formation.x + col * ALIEN_SPACING_X,
        y: formation.y + row * ALIEN_SPACING_Y,
        width: ALIEN_WIDTH,
        height: ALIEN_HEIGHT
    };
}

export function aliveCount(state: Pick<InvadersState, 'aliens'>): number {
    return state.aliens.filter(Boolean).length;
}

export function marchInterval(alive: number, wave: number): number {
    const factor = Math.max(0.5, 1 - 0.1 * (wave - 1));
    return Math.max(16, Math.round((20 + alive * 14) * factor));
}

export function bombInterval(wave: number): number {
    return Math.max(300, 900 - 80 * (wave - 1));
}

export function bunkerBox(bunker: Bunker, cell: number): Box {
    return {
        x: bunker.x + (cell % BUNKER_COLS) * BUNKER_CELL,
        y: BUNKER_Y + Math.floor(cell / BUNKER_COLS) * BUNKER_CELL,
        width: BUNKER_CELL,
        height: BUNKER_CELL
    };
}

function newBunkers(): Bunker[] {
    const width = BUNKER_COLS * BUNKER_CELL;
    const gap = (SCREEN.width - BUNKER_COUNT * width) / (BUNKER_COUNT + 1);
    const cells = BUNKER_SHAPE.flatMap((line) => [...line].map((char) => char === 'X'));
    return Array.from({ length: BUNKER_COUNT }, (_, index) => ({
        x: Math.round(gap + index * (width + gap)),
        cells: [...cells]
    }));
}

function playerStart(): number {
    return Math.round((SCREEN.width - PLAYER_WIDTH) / 2);
}

function nextSaucerMs(rng: Rng): number {
    return SAUCER_BASE_MS + rng.int(SAUCER_JITTER_MS);
}

function waveSetup(wave: number) {
    return {
        aliens: Array<boolean>(ROWS * COLS).fill(true),
        formation: { x: FORMATION_X, y: FORMATION_Y + MARCH_DROP * Math.min(wave - 1, MAX_WAVE_DROPS), direction: 1 as const },
        marchMs: 0,
        bombs: [],
        bombMs: 0,
        bunkers: newBunkers(),
        shot: null,
        saucer: null,
        player: playerStart()
    };
}

export function create(rng: Rng): InvadersState {
    return {
        mode: 'playing',
        modeMs: 0,
        wave: 1,
        score: 0,
        lives: START_LIVES,
        extraLifeAwarded: false,
        shotsFired: 0,
        marches: 0,
        explosions: [],
        kills: 0,
        saucerMs: nextSaucerMs(rng),
        seed: rng.int(SEED_RANGE),
        ...waveSetup(1)
    };
}

function erode(bunker: Bunker, cell: number) {
    const col = cell % BUNKER_COLS;
    const row = Math.floor(cell / BUNKER_COLS);
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const x = col + dx;
        const y = row + dy;
        if (x >= 0 && x < BUNKER_COLS && y >= 0 && y < BUNKER_ROWS) {
            bunker.cells[y * BUNKER_COLS + x] = false;
        }
    }
}

function hitBunker(bunkers: Bunker[], box: Box, fromBelow: boolean): boolean {
    for (const bunker of bunkers) {
        const hits = bunker.cells
            .map((alive, cell) => (alive && overlaps(box, bunkerBox(bunker, cell)) ? cell : -1))
            .filter((cell) => cell >= 0);
        const cell = fromBelow ? hits.at(-1) : hits[0];
        if (cell !== undefined) {
            erode(bunker, cell);
            return true;
        }
    }
    return false;
}

function shotBox(shot: Point): Box {
    return { x: shot.x, y: shot.y, width: 1, height: SHOT_HEIGHT };
}

function bombBox(bomb: Point): Box {
    return { x: bomb.x, y: bomb.y, width: BOMB_WIDTH, height: BOMB_HEIGHT };
}

function saucerBox(saucer: Saucer): Box {
    return { x: saucer.x, y: SAUCER_Y, width: SAUCER_WIDTH, height: SAUCER_HEIGHT };
}

function playerBox(player: number): Box {
    return { x: player, y: PLAYER_Y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };
}

function moveShot(state: InvadersState, dtMs: number) {
    if (!state.shot) return;
    const shot = { x: state.shot.x, y: state.shot.y - SHOT_SPEED * dtMs };
    state.shot = null;
    if (shot.y < SHOT_TOP) return;
    const box = shotBox(shot);
    if (hitBunker(state.bunkers, box, true)) return;
    const target = state.aliens.findIndex((alive, index) => alive && overlaps(box, alienBox(state.formation, index)));
    if (target >= 0) {
        const { x, y } = alienBox(state.formation, target);
        const points = ROW_POINTS[Math.floor(target / COLS)] ?? 0;
        state.aliens[target] = false;
        state.score += points;
        state.kills += 1;
        state.explosions.push({ kind: 'alien', x, y, ms: ALIEN_EXPLOSION_MS, points });
        return;
    }
    if (state.saucer && overlaps(box, saucerBox(state.saucer))) {
        state.score += state.saucer.points;
        state.kills += 1;
        state.explosions.push({ kind: 'saucer', x: state.saucer.x, y: SAUCER_Y, ms: SAUCER_EXPLOSION_MS, points: state.saucer.points });
        state.saucer = null;
        return;
    }
    state.shot = shot;
}

function aliveBoxes(state: InvadersState): Box[] {
    return state.aliens.flatMap((alive, index) => (alive ? [alienBox(state.formation, index)] : []));
}

function march(state: InvadersState) {
    const boxes = aliveBoxes(state);
    const { direction } = state.formation;
    const left = Math.min(...boxes.map((box) => box.x));
    const right = Math.max(...boxes.map((box) => box.x + box.width));
    const blocked = direction > 0
        ? right + MARCH_STEP > SCREEN.width - MARGIN
        : left - MARCH_STEP < MARGIN;
    state.formation = blocked
        ? { ...state.formation, y: state.formation.y + MARCH_DROP, direction: direction > 0 ? -1 : 1 }
        : { ...state.formation, x: state.formation.x + direction * MARCH_STEP };
    state.marches += 1;
    const moved = aliveBoxes(state);
    for (const bunker of state.bunkers) {
        bunker.cells = bunker.cells.map((alive, cell) => alive && !moved.some((box) => overlaps(box, bunkerBox(bunker, cell))));
    }
    if (moved.some((box) => box.y + box.height > PLAYER_Y)) {
        state.mode = 'over';
    }
}

function marchAliens(state: InvadersState, dtMs: number) {
    state.marchMs += dtMs;
    let interval = marchInterval(aliveCount(state), state.wave);
    while (state.mode === 'playing' && aliveCount(state) > 0 && state.marchMs >= interval) {
        state.marchMs -= interval;
        march(state);
        interval = marchInterval(aliveCount(state), state.wave);
    }
}

function moveBombs(state: InvadersState, dtMs: number) {
    const bombs: Point[] = [];
    for (const bomb of state.bombs) {
        const moved = { x: bomb.x, y: bomb.y + BOMB_SPEED * dtMs };
        const box = bombBox(moved);
        if (moved.y + BOMB_HEIGHT >= GROUND_Y || hitBunker(state.bunkers, box, false)) continue;
        if (state.mode === 'playing' && overlaps(box, playerBox(state.player))) {
            state.lives -= 1;
            state.mode = 'dying';
            state.modeMs = DYING_MS;
            continue;
        }
        bombs.push(moved);
    }
    state.bombs = state.mode === 'dying' ? [] : bombs;
    if (state.mode === 'dying') {
        state.shot = null;
    }
}

function dropBomb(state: InvadersState, dtMs: number, rng: Rng) {
    state.bombMs += dtMs;
    const interval = bombInterval(state.wave);
    if (state.bombMs < interval) return;
    state.bombMs -= interval;
    if (state.bombs.length >= MAX_BOMBS) return;
    const shooters = Array.from({ length: COLS }, (_, col) => {
        const row = [...Array(ROWS).keys()].reverse().find((candidate) => state.aliens[candidate * COLS + col]);
        return row === undefined ? -1 : row * COLS + col;
    }).filter((index) => index >= 0);
    const shooter = shooters[rng.int(shooters.length)];
    if (shooter === undefined) return;
    const box = alienBox(state.formation, shooter);
    state.bombs.push({ x: box.x + Math.floor((box.width - BOMB_WIDTH) / 2), y: box.y + box.height });
}

function moveSaucer(state: InvadersState, dtMs: number, rng: Rng) {
    if (state.saucer) {
        const x = state.saucer.x + state.saucer.direction * SAUCER_SPEED * dtMs;
        state.saucer = x < -SAUCER_WIDTH || x > SCREEN.width ? null : { ...state.saucer, x };
        return;
    }
    state.saucerMs -= dtMs;
    if (state.saucerMs > 0) return;
    state.saucerMs = nextSaucerMs(rng);
    if (aliveCount(state) < SAUCER_MIN_ALIENS) return;
    const direction = rng.int(2) === 0 ? 1 : -1;
    const points = SAUCER_POINTS[rng.int(SAUCER_POINTS.length)] ?? SAUCER_POINTS[0];
    state.saucer = { x: direction > 0 ? -SAUCER_WIDTH : SCREEN.width, direction, points };
}

function decayExplosions(state: InvadersState, dtMs: number) {
    state.explosions = state.explosions
        .map((explosion) => ({ ...explosion, ms: explosion.ms - dtMs }))
        .filter((explosion) => explosion.ms > 0);
}

function play(state: InvadersState, input: InputFrame, dtMs: number, rng: Rng) {
    const dx = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
    state.player = Math.min(SCREEN.width - MARGIN - PLAYER_WIDTH, Math.max(MARGIN, state.player + dx * PLAYER_SPEED * dtMs));
    if (input.pressed.has('action') && !state.shot) {
        state.shot = { x: Math.floor(state.player + PLAYER_WIDTH / 2), y: PLAYER_Y - SHOT_HEIGHT };
        state.shotsFired += 1;
    }
    moveShot(state, dtMs);
    marchAliens(state, dtMs);
    if (state.mode !== 'playing') return;
    moveBombs(state, dtMs);
    if (state.mode !== 'playing') return;
    dropBomb(state, dtMs, rng);
    moveSaucer(state, dtMs, rng);
    if (aliveCount(state) === 0) {
        state.mode = 'cleared';
        state.modeMs = CLEARED_MS;
        state.shot = null;
        state.bombs = [];
        state.saucer = null;
    }
}

function wait(state: InvadersState, dtMs: number) {
    state.modeMs -= dtMs;
    if (state.modeMs > 0) return;
    state.modeMs = 0;
    if (state.mode === 'cleared') {
        state.wave += 1;
        Object.assign(state, waveSetup(state.wave), { mode: 'playing' });
        return;
    }
    state.mode = state.lives > 0 ? 'playing' : 'over';
    state.player = playerStart();
}

export function step(state: InvadersState, input: InputFrame, dtMs: number): InvadersState {
    if (state.mode === 'over') return state;
    const next = structuredClone(state);
    const rng = createRng(state.seed);
    decayExplosions(next, dtMs);
    if (next.mode === 'playing') {
        play(next, input, dtMs, rng);
    } else {
        wait(next, dtMs);
    }
    if (!next.extraLifeAwarded && next.score >= EXTRA_LIFE_SCORE) {
        next.extraLifeAwarded = true;
        next.lives += 1;
    }
    next.seed = rng.int(SEED_RANGE);
    return next;
}

export function status(state: InvadersState): GameStatus {
    return {
        score: state.score,
        over: state.mode === 'over',
        won: false,
        hud: [
            { label: 'SCORE', value: state.score },
            { label: 'LIVES', value: state.lives },
            { label: 'WAVE', value: state.wave }
        ]
    };
}

export function sounds(previous: InvadersState, next: InvadersState): SoundName[] {
    const effects: SoundName[] = [];
    if (next.shotsFired > previous.shotsFired) effects.push('shoot');
    if (next.kills > previous.kills) effects.push('explode');
    if (next.marches > previous.marches) effects.push('move');
    if (previous.mode !== next.mode) {
        if (next.mode === 'dying') effects.push('hit');
        if (next.mode === 'cleared') effects.push('win');
        if (next.mode === 'over') effects.push('die');
    }
    return effects;
}
