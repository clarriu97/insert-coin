import type { SoundName } from '../../engine/audio.ts';
import { createRng, type Rng } from '../../engine/rng.ts';
import type { GameStatus, InputFrame } from '../../engine/types.ts';

export const SCREEN = { width: 320, height: 240 };
export const CENTER = { x: SCREEN.width / 2, y: SCREEN.height / 2 };

export const SHIP_RADIUS = 6;
export const ROTATION_SPEED = 4.5;
export const THRUST = 180;
export const DRAG = 0.4;
export const MAX_SPEED = 220;

export const BULLET_SPEED = 300;
export const BULLET_LIFE_MS = 900;
export const MAX_BULLETS = 4;
export const BULLET_RADIUS = 1;

export const START_LIVES = 3;
export const EXTRA_LIFE_EVERY = 10000;
export const RESPAWN_DELAY_MS = 2000;
export const INVULNERABLE_MS = 2000;
export const SAFE_RADIUS = 48;
export const GAME_OVER_DELAY_MS = 1500;

export const HYPERSPACE_RISK = 0.1;

export const FIRST_WAVE_ROCKS = 4;
export const MAX_WAVE_ROCKS = 11;
export const WAVE_DELAY_MS = 2000;
export const ROCK_VERTICES = 10;

export const SAUCER_FIRST_MS = 15000;
export const SAUCER_INTERVAL_MS = 12000;
export const SAUCER_TURN_MS = 1000;
export const SAUCER_BULLET_SPEED = 160;
export const SAUCER_BULLET_LIFE_MS = 1300;

export const DEBRIS_LIFE_MS = 900;
const MAX_DEBRIS = 80;
const SEED_RANGE = 4294967296;
const SMALL_SAUCER_AIM_ERROR = 0.15;

export type RockSize = 'large' | 'medium' | 'small';
export type SaucerSize = 'large' | 'small';

export interface Body {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export interface Ship extends Body {
    angle: number;
    thrusting: boolean;
}

export interface Bullet extends Body {
    lifeMs: number;
}

export interface Asteroid extends Body {
    size: RockSize;
    angle: number;
    spin: number;
    shape: number[];
}

export interface Saucer extends Body {
    size: SaucerSize;
    fireMs: number;
    turnMs: number;
}

export interface Debris {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    spin: number;
    length: number;
    lifeMs: number;
}

export interface AsteroidsState {
    ship: Ship | null;
    bullets: Bullet[];
    saucerBullets: Bullet[];
    asteroids: Asteroid[];
    saucer: Saucer | null;
    debris: Debris[];
    score: number;
    lives: number;
    wave: number;
    nextLifeAt: number;
    invulnerableMs: number;
    respawnMs: number;
    waveMs: number;
    saucerMs: number;
    overMs: number;
    over: boolean;
    shots: number;
    explosions: number;
    saucers: number;
    elapsedMs: number;
    seed: number;
}

interface RockSpec {
    radius: number;
    minSpeed: number;
    maxSpeed: number;
    points: number;
    child: RockSize | null;
    debris: number;
}

export const ROCKS: Readonly<Record<RockSize, RockSpec>> = {
    large: { radius: 24, minSpeed: 15, maxSpeed: 40, points: 20, child: 'medium', debris: 8 },
    medium: { radius: 12, minSpeed: 30, maxSpeed: 65, points: 50, child: 'small', debris: 6 },
    small: { radius: 6, minSpeed: 45, maxSpeed: 95, points: 100, child: null, debris: 4 }
};

interface SaucerSpec {
    radius: number;
    speed: number;
    fireMs: number;
    points: number;
}

export const SAUCERS: Readonly<Record<SaucerSize, SaucerSpec>> = {
    large: { radius: 10, speed: 55, fireMs: 1200, points: 200 },
    small: { radius: 5, speed: 75, fireMs: 900, points: 1000 }
};

function wrap(value: number, size: number): number {
    return ((value % size) + size) % size;
}

function shortest(delta: number, size: number): number {
    return wrap(delta + size / 2, size) - size / 2;
}

export function offset(from: { x: number; y: number }, to: { x: number; y: number }): { dx: number; dy: number } {
    return { dx: shortest(to.x - from.x, SCREEN.width), dy: shortest(to.y - from.y, SCREEN.height) };
}

export function overlaps(a: Body, b: Body): boolean {
    const { dx, dy } = offset(a, b);
    return Math.hypot(dx, dy) < a.radius + b.radius;
}

function between(rng: Rng, min: number, max: number): number {
    return min + rng.next() * (max - min);
}

export function heading(angle: number): { x: number; y: number } {
    return { x: Math.sin(angle), y: -Math.cos(angle) };
}

function move<T extends Body>(body: T, seconds: number): T {
    return { ...body, x: wrap(body.x + body.vx * seconds, SCREEN.width), y: wrap(body.y + body.vy * seconds, SCREEN.height) };
}

export function rock(rng: Rng, size: RockSize, x: number, y: number): Asteroid {
    const spec = ROCKS[size];
    const direction = rng.next() * Math.PI * 2;
    const speed = between(rng, spec.minSpeed, spec.maxSpeed);
    return {
        x,
        y,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        radius: spec.radius,
        size,
        angle: 0,
        spin: between(rng, -1, 1),
        shape: Array.from({ length: ROCK_VERTICES }, () => between(rng, 0.72, 1.1))
    };
}

function edgePoint(rng: Rng): { x: number; y: number } {
    return rng.next() < 0.5
        ? { x: rng.next() * SCREEN.width, y: 0 }
        : { x: 0, y: rng.next() * SCREEN.height };
}

export function waveRocks(rng: Rng, wave: number): Asteroid[] {
    const count = Math.min(MAX_WAVE_ROCKS, FIRST_WAVE_ROCKS + wave - 1);
    return Array.from({ length: count }, () => {
        const { x, y } = edgePoint(rng);
        return rock(rng, 'large', x, y);
    });
}

export function newShip(): Ship {
    return { x: CENTER.x, y: CENTER.y, vx: 0, vy: 0, radius: SHIP_RADIUS, angle: 0, thrusting: false };
}

export function create(rng: Rng): AsteroidsState {
    const seed = rng.int(SEED_RANGE);
    const waveRng = createRng(seed);
    return {
        ship: newShip(),
        bullets: [],
        saucerBullets: [],
        asteroids: waveRocks(waveRng, 1),
        saucer: null,
        debris: [],
        score: 0,
        lives: START_LIVES,
        wave: 1,
        nextLifeAt: EXTRA_LIFE_EVERY,
        invulnerableMs: INVULNERABLE_MS,
        respawnMs: 0,
        waveMs: 0,
        saucerMs: SAUCER_FIRST_MS,
        overMs: 0,
        over: false,
        shots: 0,
        explosions: 0,
        saucers: 0,
        elapsedMs: 0,
        seed: waveRng.int(SEED_RANGE)
    };
}

function burst(rng: Rng, x: number, y: number, count: number): Debris[] {
    return Array.from({ length: count }, () => {
        const direction = rng.next() * Math.PI * 2;
        const speed = between(rng, 15, 60);
        return {
            x,
            y,
            vx: Math.cos(direction) * speed,
            vy: Math.sin(direction) * speed,
            angle: rng.next() * Math.PI,
            spin: between(rng, -6, 6),
            length: between(rng, 2, 6),
            lifeMs: between(rng, DEBRIS_LIFE_MS / 2, DEBRIS_LIFE_MS)
        };
    });
}

interface World {
    state: AsteroidsState;
    rng: Rng;
}

function explode(world: World, x: number, y: number, count: number) {
    const { state, rng } = world;
    state.debris = [...state.debris, ...burst(rng, x, y, count)].slice(-MAX_DEBRIS);
    state.explosions += 1;
}

function breakRock(world: World, target: Asteroid, scored: boolean) {
    const spec = ROCKS[target.size];
    const { state, rng } = world;
    state.asteroids = state.asteroids.filter((candidate) => candidate !== target);
    if (spec.child) {
        state.asteroids = [...state.asteroids, rock(rng, spec.child, target.x, target.y), rock(rng, spec.child, target.x, target.y)];
    }
    if (scored) state.score += spec.points;
    explode(world, target.x, target.y, spec.debris);
}

function destroySaucer(world: World, scored: boolean) {
    const { state } = world;
    if (!state.saucer) return;
    if (scored) state.score += SAUCERS[state.saucer.size].points;
    explode(world, state.saucer.x, state.saucer.y, 6);
    state.saucer = null;
    state.saucerMs = SAUCER_INTERVAL_MS;
}

function destroyShip(world: World) {
    const { state } = world;
    if (!state.ship) return;
    explode(world, state.ship.x, state.ship.y, 8);
    state.ship = null;
    state.lives -= 1;
    state.respawnMs = RESPAWN_DELAY_MS;
    state.overMs = GAME_OVER_DELAY_MS;
}

function steer(world: World, input: InputFrame, seconds: number) {
    const { state, rng } = world;
    const ship = state.ship;
    if (!ship) return;
    const turn = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
    const angle = ship.angle + turn * ROTATION_SPEED * seconds;
    const thrusting = input.held.has('up');
    const push = thrusting ? THRUST * seconds : 0;
    const direction = heading((ship.angle + angle) / 2);
    const drag = Math.exp(-DRAG * seconds);
    let vx = (ship.vx + direction.x * push) * drag;
    let vy = (ship.vy + direction.y * push) * drag;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SPEED) {
        vx = (vx / speed) * MAX_SPEED;
        vy = (vy / speed) * MAX_SPEED;
    }
    state.ship = {
        ...ship,
        angle,
        thrusting,
        vx,
        vy,
        x: wrap(ship.x + ((ship.vx + vx) / 2) * seconds, SCREEN.width),
        y: wrap(ship.y + ((ship.vy + vy) / 2) * seconds, SCREEN.height)
    };

    if (input.pressed.has('action') && state.bullets.length < MAX_BULLETS) {
        const nose = heading(angle);
        const current = state.ship;
        state.bullets = [...state.bullets, {
            x: wrap(current.x + nose.x * SHIP_RADIUS, SCREEN.width),
            y: wrap(current.y + nose.y * SHIP_RADIUS, SCREEN.height),
            vx: current.vx + nose.x * BULLET_SPEED,
            vy: current.vy + nose.y * BULLET_SPEED,
            radius: BULLET_RADIUS,
            lifeMs: BULLET_LIFE_MS
        }];
        state.shots += 1;
    }

    if (input.pressed.has('secondary')) {
        state.ship = { ...state.ship, x: rng.next() * SCREEN.width, y: rng.next() * SCREEN.height, vx: 0, vy: 0 };
        if (rng.next() < HYPERSPACE_RISK) destroyShip(world);
    }
}

function ageBullets(bullets: Bullet[], seconds: number, dtMs: number): Bullet[] {
    return bullets
        .map((bullet) => ({ ...move(bullet, seconds), lifeMs: bullet.lifeMs - dtMs }))
        .filter((bullet) => bullet.lifeMs > 0);
}

function spawnSaucer(world: World) {
    const { state, rng } = world;
    const smallChance = Math.min(0.9, 0.1 * state.wave + state.score / EXTRA_LIFE_EVERY / 2);
    const size: SaucerSize = rng.next() < smallChance ? 'small' : 'large';
    const spec = SAUCERS[size];
    const fromLeft = rng.next() < 0.5;
    state.saucer = {
        x: fromLeft ? -spec.radius : SCREEN.width + spec.radius,
        y: between(rng, 20, SCREEN.height - 20),
        vx: fromLeft ? spec.speed : -spec.speed,
        vy: 0,
        radius: spec.radius,
        size,
        fireMs: spec.fireMs,
        turnMs: SAUCER_TURN_MS
    };
    state.saucers += 1;
}

function saucerAim(world: World, saucer: Saucer): number {
    const { state, rng } = world;
    if (saucer.size === 'small' && state.ship) {
        const { dx, dy } = offset(saucer, state.ship);
        return Math.atan2(dy, dx) + between(rng, -SMALL_SAUCER_AIM_ERROR, SMALL_SAUCER_AIM_ERROR);
    }
    return rng.next() * Math.PI * 2;
}

function flySaucer(world: World, seconds: number, dtMs: number) {
    const { state, rng } = world;
    const current = state.saucer;
    if (!current) {
        state.saucerMs -= dtMs;
        if (state.saucerMs <= 0) spawnSaucer(world);
        return;
    }
    let saucer: Saucer = {
        ...current,
        x: current.x + current.vx * seconds,
        y: wrap(current.y + current.vy * seconds, SCREEN.height),
        turnMs: current.turnMs - dtMs,
        fireMs: current.fireMs - dtMs
    };
    if (saucer.turnMs <= 0) {
        const speed = SAUCERS[saucer.size].speed * 0.6;
        saucer = { ...saucer, vy: [-speed, 0, speed][rng.int(3)] ?? 0, turnMs: saucer.turnMs + SAUCER_TURN_MS };
    }
    if (saucer.fireMs <= 0) {
        const aim = saucerAim(world, saucer);
        state.saucerBullets = [...state.saucerBullets, {
            x: saucer.x,
            y: saucer.y,
            vx: Math.cos(aim) * SAUCER_BULLET_SPEED,
            vy: Math.sin(aim) * SAUCER_BULLET_SPEED,
            radius: BULLET_RADIUS,
            lifeMs: SAUCER_BULLET_LIFE_MS
        }];
        saucer = { ...saucer, fireMs: saucer.fireMs + SAUCERS[saucer.size].fireMs };
    }
    const gone = saucer.vx > 0 ? saucer.x > SCREEN.width + saucer.radius : saucer.x < -saucer.radius;
    if (gone) {
        state.saucer = null;
        state.saucerMs = SAUCER_INTERVAL_MS;
        return;
    }
    state.saucer = saucer;
}

function drift(world: World, seconds: number, dtMs: number) {
    const { state } = world;
    state.bullets = ageBullets(state.bullets, seconds, dtMs);
    state.saucerBullets = ageBullets(state.saucerBullets, seconds, dtMs);
    state.asteroids = state.asteroids.map((target) => ({ ...move(target, seconds), angle: target.angle + target.spin * seconds }));
    state.debris = state.debris
        .map((piece) => ({
            ...piece,
            x: wrap(piece.x + piece.vx * seconds, SCREEN.width),
            y: wrap(piece.y + piece.vy * seconds, SCREEN.height),
            angle: piece.angle + piece.spin * seconds,
            lifeMs: piece.lifeMs - dtMs
        }))
        .filter((piece) => piece.lifeMs > 0);
    flySaucer(world, seconds, dtMs);
}

function firstRock(state: AsteroidsState, body: Body): Asteroid | undefined {
    return state.asteroids.find((target) => overlaps(target, body));
}

function shootBullets(world: World, key: 'bullets' | 'saucerBullets', scored: boolean) {
    const { state } = world;
    const survivors: Bullet[] = [];
    for (const bullet of state[key]) {
        const target = firstRock(state, bullet);
        if (target) {
            breakRock(world, target, scored);
        } else if (scored && state.saucer && overlaps(state.saucer, bullet)) {
            destroySaucer(world, true);
        } else if (!scored && state.ship && state.invulnerableMs <= 0 && overlaps(state.ship, bullet)) {
            destroyShip(world);
        } else {
            survivors.push(bullet);
        }
    }
    state[key] = survivors;
}

function collide(world: World) {
    const { state } = world;
    shootBullets(world, 'bullets', true);
    shootBullets(world, 'saucerBullets', false);

    if (state.saucer) {
        const target = firstRock(state, state.saucer);
        if (target) {
            breakRock(world, target, false);
            destroySaucer(world, false);
        }
    }

    if (!state.ship || state.invulnerableMs > 0) return;
    const target = firstRock(state, state.ship);
    if (target) {
        breakRock(world, target, true);
        destroyShip(world);
        return;
    }
    if (state.saucer && overlaps(state.saucer, state.ship)) {
        destroySaucer(world, true);
        destroyShip(world);
    }
}

export function centreClear(state: AsteroidsState): boolean {
    const zone = { ...CENTER, vx: 0, vy: 0, radius: SAFE_RADIUS };
    return !state.saucer
        && !state.asteroids.some((target) => overlaps(target, zone))
        && !state.saucerBullets.some((bullet) => overlaps(bullet, zone));
}

function progress(world: World, dtMs: number) {
    const { state, rng } = world;
    while (state.score >= state.nextLifeAt) {
        state.lives += 1;
        state.nextLifeAt += EXTRA_LIFE_EVERY;
    }
    state.invulnerableMs = Math.max(0, state.invulnerableMs - dtMs);

    if (!state.ship) {
        if (state.lives <= 0) {
            state.overMs -= dtMs;
            state.over = state.overMs <= 0;
        } else {
            state.respawnMs -= dtMs;
            if (state.respawnMs <= 0 && centreClear(state)) {
                state.ship = newShip();
                state.invulnerableMs = INVULNERABLE_MS;
            }
        }
    }

    if (state.asteroids.length > 0) return;
    if (state.waveMs <= 0) {
        state.waveMs = WAVE_DELAY_MS;
        return;
    }
    state.waveMs -= dtMs;
    if (state.waveMs <= 0) {
        state.wave += 1;
        state.waveMs = 0;
        state.asteroids = waveRocks(rng, state.wave);
    }
}

export function step(state: AsteroidsState, input: InputFrame, dtMs: number): AsteroidsState {
    if (state.over) return state;
    const rng = createRng(state.seed);
    const world: World = { state: { ...state, elapsedMs: state.elapsedMs + dtMs }, rng };
    const seconds = dtMs / 1000;

    steer(world, input, seconds);
    drift(world, seconds, dtMs);
    collide(world);
    progress(world, dtMs);

    return { ...world.state, seed: rng.int(SEED_RANGE) };
}

export function status(state: AsteroidsState): GameStatus {
    return {
        score: state.score,
        over: state.over,
        hud: [
            { label: 'SCORE', value: state.score },
            { label: 'LIVES', value: state.lives },
            { label: 'WAVE', value: state.wave }
        ]
    };
}

export function sounds(previous: AsteroidsState, next: AsteroidsState): SoundName[] {
    const effects: SoundName[] = [];
    if (next.shots > previous.shots) effects.push('shoot');
    if (next.explosions > previous.explosions) effects.push('explode');
    if (next.ship?.thrusting && !previous.ship?.thrusting) effects.push('thrust');
    if (next.saucers > previous.saucers) effects.push('rotate');
    if (next.lives < previous.lives) effects.push('hit');
    if (next.nextLifeAt > previous.nextLifeAt) effects.push('coin');
    if (next.over && !previous.over) effects.push('die');
    return effects;
}
