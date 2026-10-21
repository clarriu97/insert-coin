import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng.ts';
import type { Button, InputFrame } from '../../engine/types.ts';
import {
    BULLET_LIFE_MS,
    CENTER,
    create,
    centreClear,
    EXTRA_LIFE_EVERY,
    GAME_OVER_DELAY_MS,
    heading,
    INVULNERABLE_MS,
    MAX_BULLETS,
    MAX_SPEED,
    MAX_WAVE_ROCKS,
    RESPAWN_DELAY_MS,
    rock,
    ROCK_VERTICES,
    ROCKS,
    ROTATION_SPEED,
    SAUCER_FIRST_MS,
    SAUCER_INTERVAL_MS,
    SAUCER_TURN_MS,
    SAUCERS,
    SCREEN,
    sounds,
    START_LIVES,
    status,
    step,
    WAVE_DELAY_MS,
    waveRocks,
    type Asteroid,
    type AsteroidsState,
    type Bullet,
    type Saucer
} from './logic.ts';

const STEP_MS = 1000 / 60;

function frame(held: Button[] = [], pressed: Button[] = []): InputFrame {
    return { held: new Set(held), pressed: new Set(pressed) };
}

function run(state: AsteroidsState, ms: number, held: Button[] = [], stepMs = STEP_MS): AsteroidsState {
    let next = state;
    for (let elapsed = 0; elapsed < ms - 1e-6; elapsed += stepMs) {
        next = step(next, frame(held), stepMs);
    }
    return next;
}

function far(): Asteroid {
    return { ...rock(createRng(9), 'large', 0, 0), vx: 0, vy: 0, spin: 0 };
}

function quiet(overrides: Partial<AsteroidsState> = {}): AsteroidsState {
    return { ...create(createRng(1)), asteroids: [far()], invulnerableMs: 0, ...overrides };
}

function still(size: Asteroid['size'], x: number, y: number): Asteroid {
    return { ...rock(createRng(3), size, x, y), vx: 0, vy: 0 };
}

function bullet(x: number, y: number, vx = 0, vy = 0): Bullet {
    return { x, y, vx, vy, radius: 1, lifeMs: 500 };
}

function saucer(overrides: Partial<Saucer> = {}): Saucer {
    return { x: 100, y: 60, vx: 55, vy: 0, radius: 10, size: 'large', fireMs: 5000, turnMs: 5000, ...overrides };
}

function ship(state: AsteroidsState) {
    if (!state.ship) throw new Error('ship expected');
    return state.ship;
}

describe('asteroids setup', () => {
    it('starts with the ship centred and four large rocks on the edges', () => {
        const state = create(createRng(1));
        expect(state.ship).toMatchObject({ x: CENTER.x, y: CENTER.y, vx: 0, vy: 0, angle: 0 });
        expect(state.asteroids).toHaveLength(4);
        for (const target of state.asteroids) {
            expect(target.size).toBe('large');
            expect(target.x === 0 || target.y === 0).toBe(true);
        }
        expect(status(state)).toEqual({
            score: 0,
            over: false,
            hud: [
                { label: 'SCORE', value: 0 },
                { label: 'LIVES', value: START_LIVES },
                { label: 'WAVE', value: 1 }
            ]
        });
    });

    it('gives each rock an irregular seeded outline and a speed for its size', () => {
        const [first, second] = create(createRng(1)).asteroids;
        expect(first?.shape).toHaveLength(ROCK_VERTICES);
        expect(new Set(first?.shape).size).toBeGreaterThan(1);
        expect(first?.shape).not.toEqual(second?.shape);
        for (const target of create(createRng(7)).asteroids) {
            const speed = Math.hypot(target.vx, target.vy);
            expect(speed).toBeGreaterThanOrEqual(ROCKS.large.minSpeed);
            expect(speed).toBeLessThanOrEqual(ROCKS.large.maxSpeed);
            target.shape.forEach((scale) => expect(scale).toBeGreaterThan(0.7));
        }
    });

    it('is deterministic for a given seed', () => {
        const play = () => {
            let state = create(createRng(42));
            for (let index = 0; index < 120; index++) {
                state = step(state, frame(['up', 'left'], index % 10 === 0 ? ['action'] : []), STEP_MS);
            }
            return state;
        };
        expect(play()).toEqual(play());
    });

    it('does not mutate the previous state', () => {
        const state = quiet({ bullets: [bullet(10, 10, 50, 0)] });
        const snapshot = structuredClone(state);
        step(state, frame(['up', 'right'], ['action', 'secondary']), STEP_MS);
        expect(state).toEqual(snapshot);
    });
});

describe('asteroids ship', () => {
    it('rotates while left or right are held', () => {
        expect(ship(run(quiet(), 1000, ['right'])).angle).toBeCloseTo(ROTATION_SPEED, 5);
        expect(ship(run(quiet(), 500, ['left'])).angle).toBeCloseTo(-ROTATION_SPEED / 2, 5);
    });

    it('thrusts along its heading, keeps its inertia and slows down with drag', () => {
        const thrusted = run(quiet(), 500, ['up']);
        expect(ship(thrusted).vy).toBeLessThan(0);
        expect(ship(thrusted).y).toBeLessThan(CENTER.y);
        expect(ship(thrusted).thrusting).toBe(true);

        const coasting = run(thrusted, 500);
        expect(ship(coasting).thrusting).toBe(false);
        expect(ship(coasting).y).toBeLessThan(ship(thrusted).y);
        expect(Math.abs(ship(coasting).vy)).toBeLessThan(Math.abs(ship(thrusted).vy));
    });

    it('never exceeds the top speed', () => {
        const state = run(quiet(), 5000, ['up']);
        expect(Math.hypot(ship(state).vx, ship(state).vy)).toBeLessThanOrEqual(MAX_SPEED + 1e-9);
    });

    it('moves the same regardless of the frame rate', () => {
        const base = quiet({ ship: { ...ship(quiet()), vx: 80, vy: -40 } });
        const fast = run(base, 1000, ['up', 'right'], 1000 / 120);
        const slow = run(base, 1000, ['up', 'right'], 1000 / 30);
        expect(Math.abs(ship(fast).x - ship(slow).x)).toBeLessThan(1);
        expect(Math.abs(ship(fast).y - ship(slow).y)).toBeLessThan(1);
        expect(ship(fast).angle).toBeCloseTo(ship(slow).angle, 5);
    });

    it('wraps around the screen edges', () => {
        const sideways = quiet({ ship: { ...ship(quiet()), x: SCREEN.width - 1, vx: 120 } });
        expect(ship(step(sideways, frame(), 100)).x).toBeLessThan(20);
        const upwards = quiet({ ship: { ...ship(quiet()), y: 1, vy: -120 } });
        expect(ship(step(upwards, frame(), 100)).y).toBeGreaterThan(SCREEN.height - 20);
    });

    it('jumps to hyperspace, stopping at a random spot and sometimes exploding', () => {
        let survived = 0;
        let exploded = 0;
        for (let seed = 0; seed < 200; seed++) {
            const state = quiet({ seed, ship: { ...ship(quiet()), vx: 50 } });
            const next = step(state, frame([], ['secondary']), STEP_MS);
            if (next.ship) {
                survived += 1;
                expect(next.ship.vx).toBe(0);
                expect(next.ship.x).not.toBeCloseTo(CENTER.x + 50 * STEP_MS / 1000, 3);
            } else {
                exploded += 1;
                expect(next.lives).toBe(START_LIVES - 1);
            }
        }
        expect(exploded).toBeGreaterThan(0);
        expect(exploded).toBeLessThan(survived / 3);
    });
});

describe('asteroids bullets', () => {
    it('fires from the nose with at most four bullets alive', () => {
        let state = quiet();
        state = step(state, frame([], ['action']), STEP_MS);
        expect(state.bullets).toHaveLength(1);
        expect(state.bullets[0]?.vy).toBeLessThan(0);
        expect(state.bullets[0]?.y).toBeLessThan(CENTER.y);
        for (let index = 0; index < 6; index++) {
            state = step(state, frame([], ['action']), STEP_MS);
        }
        expect(state.bullets).toHaveLength(MAX_BULLETS);
        expect(state.shots).toBe(MAX_BULLETS);
    });

    it('expires after its lifetime and wraps meanwhile', () => {
        const state = quiet({ ship: null, lives: 1, overMs: 99999, bullets: [{ ...bullet(SCREEN.width - 2, 120, 300, 0), lifeMs: BULLET_LIFE_MS }] });
        const moved = step(state, frame(), 50);
        expect(moved.bullets[0]?.x).toBeLessThan(20);
        expect(run(state, BULLET_LIFE_MS + 20).bullets).toHaveLength(0);
    });
});

describe('asteroids rocks', () => {
    it.each([
        ['large', 'medium', 20],
        ['medium', 'small', 50]
    ] as const)('splits a shot %s rock into two %s ones for %i points', (size, child, points) => {
        const state = quiet({ ship: null, lives: 1, overMs: 99999, asteroids: [far(), still(size, 200, 50)], bullets: [bullet(200, 50)] });
        const next = step(state, frame(), STEP_MS);
        expect(next.asteroids.filter((target) => target.size === child)).toHaveLength(2);
        expect(next.bullets).toHaveLength(0);
        expect(next.score).toBe(points);
        expect(next.explosions).toBe(1);
        expect(next.debris.length).toBeGreaterThan(0);
    });

    it('destroys a shot small rock for 100 points', () => {
        const state = quiet({ ship: null, lives: 1, overMs: 99999, asteroids: [far(), still('small', 200, 50)], bullets: [bullet(200, 50)] });
        const next = step(state, frame(), STEP_MS);
        expect(next.asteroids).toHaveLength(1);
        expect(next.score).toBe(100);
    });

    it('detects collisions across the wrap', () => {
        const state = quiet({ ship: null, lives: 1, overMs: 99999, asteroids: [far(), still('small', 2, 150)], bullets: [bullet(SCREEN.width - 2, 150)] });
        expect(step(state, frame(), 1).score).toBe(100);
    });

    it('fades debris away', () => {
        const state = quiet({ ship: null, lives: 1, overMs: 99999, asteroids: [far(), still('small', 200, 50)], bullets: [bullet(200, 50)] });
        const exploded = step(state, frame(), STEP_MS);
        expect(run(exploded, 1000).debris).toHaveLength(0);
    });

    it('starts a new wave with one more large rock once cleared', () => {
        const cleared = quiet({ asteroids: [] });
        const waiting = run(cleared, WAVE_DELAY_MS / 2);
        expect(waiting.asteroids).toHaveLength(0);
        expect(waiting.wave).toBe(1);
        const next = run(waiting, WAVE_DELAY_MS);
        expect(next.wave).toBe(2);
        expect(next.asteroids).toHaveLength(5);
        expect(status(next).hud).toContainEqual({ label: 'WAVE', value: 2 });
    });

    it('caps the rocks per wave', () => {
        expect(waveRocks(createRng(1), 30)).toHaveLength(MAX_WAVE_ROCKS);
    });
});

describe('asteroids lives', () => {
    it('loses a ship when a rock hits it, breaking and scoring the rock', () => {
        const state = quiet({ asteroids: [far(), still('large', CENTER.x + 10, CENTER.y)] });
        const next = step(state, frame(), STEP_MS);
        expect(next.ship).toBeNull();
        expect(next.lives).toBe(START_LIVES - 1);
        expect(next.score).toBe(20);
        expect(next.asteroids.filter((target) => target.size === 'medium')).toHaveLength(2);
    });

    it('ignores collisions while invulnerable', () => {
        const state = quiet({ invulnerableMs: 500, asteroids: [far(), still('large', CENTER.x + 10, CENTER.y)] });
        const next = step(state, frame(), STEP_MS);
        expect(next.ship).not.toBeNull();
        expect(next.invulnerableMs).toBeCloseTo(500 - STEP_MS);
    });

    it('respawns after a delay once the centre is clear, invulnerable', () => {
        const dead = quiet({ ship: null, lives: 2, respawnMs: RESPAWN_DELAY_MS });
        expect(run(dead, RESPAWN_DELAY_MS - 100).ship).toBeNull();
        const back = run(dead, RESPAWN_DELAY_MS + 20);
        expect(back.ship).toMatchObject({ x: CENTER.x, y: CENTER.y });
        expect(back.invulnerableMs).toBeGreaterThan(INVULNERABLE_MS - 100);
    });

    it('waits for the centre to clear before respawning', () => {
        const blocked = quiet({ ship: null, lives: 2, respawnMs: 0, asteroids: [still('large', CENTER.x, CENTER.y)] });
        expect(centreClear(blocked)).toBe(false);
        expect(run(blocked, 3000).ship).toBeNull();
        expect(centreClear(quiet({ saucer: saucer() }))).toBe(false);
        expect(centreClear(quiet({ saucerBullets: [bullet(CENTER.x, CENTER.y)] }))).toBe(false);
        expect(centreClear(quiet())).toBe(true);
    });

    it('ends the game after the last ship explodes', () => {
        const state = quiet({ lives: 1, asteroids: [far(), still('small', CENTER.x, CENTER.y)] });
        const dead = step(state, frame(), STEP_MS);
        expect(dead.lives).toBe(0);
        expect(dead.over).toBe(false);
        const over = run(dead, GAME_OVER_DELAY_MS + 20);
        expect(status(over).over).toBe(true);
        expect(step(over, frame(), STEP_MS)).toBe(over);
    });

    it('awards an extra life every 10 000 points', () => {
        const state = quiet({ score: EXTRA_LIFE_EVERY - 100, asteroids: [far(), still('small', 40, 40)], bullets: [bullet(40, 40)] });
        const next = step(state, frame(), STEP_MS);
        expect(next.lives).toBe(START_LIVES + 1);
        expect(next.nextLifeAt).toBe(EXTRA_LIFE_EVERY * 2);
    });
});

describe('asteroids saucer', () => {
    it('appears after a while from one side', () => {
        const early = run(quiet(), SAUCER_FIRST_MS - 100);
        expect(early.saucer).toBeNull();
        const state = run(quiet(), SAUCER_FIRST_MS + 20);
        const visitor = state.saucer;
        expect(visitor).not.toBeNull();
        expect(state.saucers).toBe(1);
        expect(Math.abs(visitor?.vx ?? 0)).toBe(SAUCERS[visitor?.size ?? 'large'].speed);
    });

    it('spawns small saucers more often later on', () => {
        const sizes = Array.from({ length: 50 }, (_, seed) =>
            step(quiet({ seed, saucerMs: 1, score: 9000, wave: 6 }), frame(), STEP_MS).saucer?.size);
        expect(sizes.filter((size) => size === 'small').length).toBeGreaterThan(25);
        expect(sizes).toContain('large');
    });

    it('leaves on the other side and comes back later', () => {
        const state = quiet({ saucer: saucer({ x: SCREEN.width + 9 }) });
        const gone = step(state, frame(), STEP_MS * 10);
        expect(gone.saucer).toBeNull();
        expect(gone.saucerMs).toBe(SAUCER_INTERVAL_MS);
        const leftward = step(quiet({ saucer: saucer({ x: -9, vx: -55 }) }), frame(), STEP_MS * 10);
        expect(leftward.saucer).toBeNull();
    });

    it('changes its vertical course now and then', () => {
        const courses = new Set(Array.from({ length: 30 }, (_, seed) =>
            step(quiet({ seed, saucer: saucer({ turnMs: 1 }) }), frame(), STEP_MS).saucer?.vy));
        expect(courses.size).toBe(3);
        const turned = step(quiet({ saucer: saucer({ turnMs: 1 }) }), frame(), STEP_MS);
        expect(turned.saucer?.turnMs).toBeCloseTo(1 - STEP_MS + SAUCER_TURN_MS);
    });

    it('fires, the small one at the ship', () => {
        const state = quiet({ saucer: saucer({ size: 'small', radius: 5, x: CENTER.x - 100, y: CENTER.y, fireMs: 1 }) });
        const next = step(state, frame(), STEP_MS);
        const [shot] = next.saucerBullets;
        expect(shot?.vx).toBeGreaterThan(0);
        expect(Math.abs(shot?.vy ?? 1)).toBeLessThan(Math.abs(shot?.vx ?? 0) / 4);
        expect(next.saucer?.fireMs).toBeCloseTo(1 - STEP_MS + SAUCERS.small.fireMs);

        const blind = step({ ...state, ship: null, lives: 2, respawnMs: 9999 }, frame(), STEP_MS);
        expect(blind.saucerBullets).toHaveLength(1);
        const large = step(quiet({ saucer: saucer({ fireMs: 1 }) }), frame(), STEP_MS);
        expect(large.saucerBullets).toHaveLength(1);
    });

    it.each([['large', 200], ['small', 1000]] as const)('scores a shot %s saucer for %i points', (size, points) => {
        const state = quiet({ saucer: saucer({ size, radius: SAUCERS[size].radius, x: 100, y: 60, vx: 0 }), bullets: [bullet(100, 60)] });
        const next = step(state, frame(), STEP_MS);
        expect(next.saucer).toBeNull();
        expect(next.score).toBe(points);
        expect(next.saucerMs).toBe(SAUCER_INTERVAL_MS);
    });

    it('kills the ship with its bullets', () => {
        const state = quiet({ saucerBullets: [bullet(CENTER.x + 3, CENTER.y)] });
        const next = step(state, frame(), STEP_MS);
        expect(next.ship).toBeNull();
        expect(next.saucerBullets).toHaveLength(0);
    });

    it('breaks rocks with its bullets without scoring', () => {
        const state = quiet({ asteroids: [far(), still('small', 50, 50)], saucerBullets: [bullet(50, 50)] });
        const next = step(state, frame(), STEP_MS);
        expect(next.asteroids).toHaveLength(1);
        expect(next.score).toBe(0);
    });

    it('is destroyed by rocks it flies into', () => {
        const state = quiet({ asteroids: [far(), still('small', 100, 60)], saucer: saucer({ vx: 0 }) });
        const next = step(state, frame(), STEP_MS);
        expect(next.saucer).toBeNull();
        expect(next.asteroids).toHaveLength(1);
        expect(next.score).toBe(0);
    });

    it('takes the ship with it when they collide', () => {
        const state = quiet({ saucer: saucer({ x: CENTER.x + 8, y: CENTER.y, vx: 0 }) });
        const next = step(state, frame(), STEP_MS);
        expect(next.saucer).toBeNull();
        expect(next.ship).toBeNull();
        expect(next.score).toBe(SAUCERS.large.points);
    });
});

describe('asteroids sounds', () => {
    it('plays shoot when firing and thrust only when thrust starts', () => {
        const state = quiet();
        expect(sounds(state, step(state, frame([], ['action']), STEP_MS))).toEqual(['shoot']);
        const thrusting = step(state, frame(['up']), STEP_MS);
        expect(sounds(state, thrusting)).toEqual(['thrust']);
        expect(sounds(thrusting, step(thrusting, frame(['up']), STEP_MS))).toEqual([]);
    });

    it('plays explode for rocks and hit when the ship is lost', () => {
        const shot = quiet({ asteroids: [far(), still('small', 40, 40)], bullets: [bullet(40, 40)] });
        expect(sounds(shot, step(shot, frame(), STEP_MS))).toEqual(['explode']);
        const crash = quiet({ asteroids: [far(), still('small', CENTER.x, CENTER.y)] });
        expect(sounds(crash, step(crash, frame(), STEP_MS))).toEqual(['explode', 'hit']);
    });

    it('cues the saucer, extra lives and the game over', () => {
        const arriving = quiet({ saucerMs: 1 });
        expect(sounds(arriving, step(arriving, frame(), STEP_MS))).toEqual(['rotate']);
        const bonus = quiet({ score: EXTRA_LIFE_EVERY - 100, asteroids: [far(), still('small', 40, 40)], bullets: [bullet(40, 40)] });
        expect(sounds(bonus, step(bonus, frame(), STEP_MS))).toEqual(['explode', 'coin']);
        const ending = quiet({ ship: null, lives: 0, overMs: 1 });
        expect(sounds(ending, step(ending, frame(), STEP_MS))).toEqual(['die']);
    });
});

describe('asteroids heading', () => {
    it('points up at angle zero and right at a quarter turn', () => {
        expect(heading(0).y).toBeCloseTo(-1);
        expect(heading(Math.PI / 2).x).toBeCloseTo(1);
    });
});
