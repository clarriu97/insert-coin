import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng.ts';
import type { Button, InputFrame } from '../../engine/types.ts';
import {
    ALIEN_EXPLOSION_MS,
    alienBox,
    alienKind,
    aliveCount,
    bombInterval,
    BUNKER_COLS,
    BUNKER_Y,
    bunkerBox,
    CLEARED_MS,
    COLS,
    create,
    DYING_MS,
    EXTRA_LIFE_SCORE,
    FORMATION_Y,
    MARCH_DROP,
    MARCH_STEP,
    marchInterval,
    MARGIN,
    MAX_BOMBS,
    PLAYER_WIDTH,
    PLAYER_Y,
    ROWS,
    SAUCER_POINTS,
    SAUCER_WIDTH,
    SAUCER_Y,
    SCREEN,
    SHOT_HEIGHT,
    sounds,
    status,
    step,
    type InvadersState
} from './logic.ts';

const DT = 1000 / 60;
const FORMATION_WIDTH = (COLS - 1) * 16 + 12;

function frame(pressed: Button[] = [], held: Button[] = []): InputFrame {
    return { pressed: new Set(pressed), held: new Set(held) };
}

function fresh(seed = 1): InvadersState {
    return create(createRng(seed));
}

function run(state: InvadersState, ms: number, input: InputFrame = frame()): InvadersState {
    let next = state;
    for (let elapsed = 0; elapsed < ms; elapsed += DT) {
        next = step(next, input, DT);
    }
    return next;
}

function only(indices: number[]): boolean[] {
    return Array.from({ length: ROWS * COLS }, (_, index) => indices.includes(index));
}

function quiet(state: InvadersState): InvadersState {
    return { ...state, bombMs: -1e9, saucerMs: 1e9, marchMs: -1e9 };
}

describe('invaders setup', () => {
    it('starts a full formation, 3 lives, centred cannon and 4 intact bunkers', () => {
        const state = fresh();
        expect(state.mode).toBe('playing');
        expect(aliveCount(state)).toBe(55);
        expect(state.lives).toBe(3);
        expect(state.player).toBe(Math.round((SCREEN.width - PLAYER_WIDTH) / 2));
        expect(state.bunkers).toHaveLength(4);
        expect(state.bunkers.every((bunker) => bunker.cells.filter(Boolean).length === 70)).toBe(true);
        expect(status(state)).toEqual({
            score: 0,
            over: false,
            won: false,
            hud: [
                { label: 'SCORE', value: 0 },
                { label: 'LIVES', value: 3 },
                { label: 'WAVE', value: 1 }
            ]
        });
    });

    it('maps rows to three alien kinds', () => {
        expect([0, 1, 2, 3, 4].map(alienKind)).toEqual(['small', 'medium', 'medium', 'large', 'large']);
    });

    it('speeds up the march as aliens die and with each wave', () => {
        expect(marchInterval(55, 1)).toBeGreaterThan(marchInterval(30, 1));
        expect(marchInterval(30, 1)).toBeGreaterThan(marchInterval(1, 1));
        expect(marchInterval(55, 3)).toBeLessThan(marchInterval(55, 1));
        expect(marchInterval(0, 20)).toBe(16);
        expect(bombInterval(2)).toBeLessThan(bombInterval(1));
    });

    it('is deterministic for a given seed', () => {
        const input = frame(['action'], ['left']);
        expect(run(fresh(7), 5000, input)).toEqual(run(fresh(7), 5000, input));
    });
});

describe('invaders cannon', () => {
    it('moves with held arrows and stays inside the margins', () => {
        const state = quiet(fresh());
        expect(run(state, 200, frame([], ['right'])).player).toBeGreaterThan(state.player);
        expect(run(state, 200, frame([], ['left'])).player).toBeLessThan(state.player);
        expect(run(state, 5000, frame([], ['left'])).player).toBe(MARGIN);
        expect(run(state, 5000, frame([], ['right'])).player).toBe(SCREEN.width - MARGIN - PLAYER_WIDTH);
    });

    it('fires one shot at a time on action presses', () => {
        const state = quiet(fresh());
        const fired = step(state, frame(['action']), DT);
        expect(fired.shot).not.toBeNull();
        expect(fired.shotsFired).toBe(1);
        const again = step(fired, frame(['action']), DT);
        expect(again.shotsFired).toBe(1);
        expect(step(state, frame([], ['action']), DT).shot).toBeNull();
    });

    it('loses the shot at the top of the screen', () => {
        const state = { ...quiet(fresh()), aliens: only([]), player: 0, shot: { x: 2, y: 20 } };
        expect(step(state, frame(), DT * 2).shot).toBeNull();
    });
});

describe('invaders shooting', () => {
    it('kills an alien and scores by row', () => {
        const base = quiet(fresh());
        for (const [row, points] of [[0, 30], [1, 20], [2, 20], [3, 10], [4, 10]] as const) {
            const index = row * COLS + 3;
            const box = alienBox(base.formation, index);
            const state = { ...base, shot: { x: box.x + 4, y: box.y + box.height } };
            const next = step(state, frame(), DT);
            expect(next.aliens[index]).toBe(false);
            expect(next.score).toBe(points);
            expect(next.shot).toBeNull();
            expect(next.explosions).toContainEqual(expect.objectContaining({ kind: 'alien', points }));
            expect(sounds(state, next)).toContain('explode');
        }
    });

    it('erodes a bunker from below and consumes the shot', () => {
        const state = quiet(fresh());
        const bunker = state.bunkers[0];
        if (!bunker) throw new Error('missing bunker');
        const x = bunker.x + 2;
        const shooting = { ...state, shot: { x, y: BUNKER_Y + 16 } };
        const next = step(shooting, frame(), DT);
        expect(next.shot).toBeNull();
        expect(next.bunkers[0]?.cells.filter(Boolean).length).toBeLessThan(bunker.cells.filter(Boolean).length);
    });

    it('hits the saucer for its seeded value', () => {
        const state = { ...quiet(fresh()), saucer: { x: 100, direction: 1 as const, points: 150 }, shot: { x: 108, y: SAUCER_Y + 8 } };
        const next = step(state, frame(), DT);
        expect(next.saucer).toBeNull();
        expect(next.score).toBe(150);
        expect(next.explosions).toContainEqual(expect.objectContaining({ kind: 'saucer', points: 150 }));
    });

    it('awards one extra life at 1500 points', () => {
        const state = { ...quiet(fresh()), score: EXTRA_LIFE_SCORE - 10 };
        const box = alienBox(state.formation, 4 * COLS);
        const next = step({ ...state, shot: { x: box.x + 4, y: box.y + box.height } }, frame(), DT);
        expect(next.lives).toBe(4);
        expect(next.extraLifeAwarded).toBe(true);
        const later = step({ ...next, score: EXTRA_LIFE_SCORE * 2 }, frame(), DT);
        expect(later.lives).toBe(4);
    });

    it('lets explosions fade', () => {
        const state = { ...quiet(fresh()), explosions: [{ kind: 'alien' as const, x: 0, y: 0, ms: ALIEN_EXPLOSION_MS, points: 10 }] };
        expect(run(state, ALIEN_EXPLOSION_MS + DT).explosions).toEqual([]);
    });
});

describe('invaders march', () => {
    it('steps sideways on each march interval', () => {
        const state = { ...fresh(), bombMs: -1e9, saucerMs: 1e9 };
        const interval = marchInterval(55, 1);
        const before = step(state, frame(), interval - 1);
        expect(before.formation.x).toBe(state.formation.x);
        const after = step(before, frame(), 1);
        expect(after.formation.x).toBe(state.formation.x + MARCH_STEP);
        expect(after.marches).toBe(1);
        expect(sounds(before, after)).toEqual(['move']);
    });

    it('drops and reverses at the right edge, then at the left edge', () => {
        const state = { ...fresh(), bombMs: -1e9, saucerMs: 1e9, aliens: only([COLS - 1]) };
        const right = SCREEN.width - MARGIN - FORMATION_WIDTH;
        const atEdge = { ...state, formation: { ...state.formation, x: right } };
        const dropped = step(atEdge, frame(), marchInterval(1, 1));
        expect(dropped.formation).toEqual({ x: right, y: state.formation.y + MARCH_DROP, direction: -1 });
        const leftEdge = { ...state, aliens: only([0]), formation: { x: MARGIN, y: state.formation.y, direction: -1 as const } };
        expect(step(leftEdge, frame(), marchInterval(1, 1)).formation).toEqual({ x: MARGIN, y: state.formation.y + MARCH_DROP, direction: 1 });
    });

    it('erases bunker cells the aliens march through', () => {
        const state = { ...fresh(), bombMs: -1e9, saucerMs: 1e9, aliens: only([0]) };
        const bunker = state.bunkers[1];
        if (!bunker) throw new Error('missing bunker');
        const formation = { x: bunker.x, y: BUNKER_Y - 2, direction: 1 as const };
        const next = step({ ...state, formation }, frame(), marchInterval(1, 1));
        expect(bunkerBox(bunker, 2 * BUNKER_COLS + 2).y).toBe(BUNKER_Y + 4);
        expect(next.bunkers[1]?.cells[2 * BUNKER_COLS + 2]).toBe(false);
    });

    it('ends the game when an alien reaches the cannon row', () => {
        const state = { ...fresh(), bombMs: -1e9, saucerMs: 1e9, aliens: only([0]) };
        const formation = { x: 100, y: PLAYER_Y - 7, direction: 1 as const };
        const next = step({ ...state, formation }, frame(), marchInterval(1, 1));
        expect(next.mode).toBe('over');
        expect(status(next).over).toBe(true);
        expect(step(next, frame(), DT)).toBe(next);
        expect(sounds(state, next)).toContain('die');
    });
});

describe('invaders bombs', () => {
    it('drops seeded bombs from the bottom alien of a column, at most 3', () => {
        const state = { ...fresh(3), saucerMs: 1e9, marchMs: -1e9 };
        const next = step(state, frame(), bombInterval(1));
        expect(next.bombs).toHaveLength(1);
        const bomb = next.bombs[0];
        expect(bomb?.y).toBe(FORMATION_Y + (ROWS - 1) * 16 + 8);
        const full = { ...state, bombs: [{ x: 10, y: 140 }, { x: 40, y: 140 }, { x: 70, y: 140 }] };
        expect(step(full, frame(), bombInterval(1)).bombs).toHaveLength(MAX_BOMBS);
    });

    it('drops from a higher row when the bottom alien of a column is gone', () => {
        const state = { ...fresh(3), saucerMs: 1e9, marchMs: -1e9, aliens: only([5]) };
        const next = step(state, frame(), bombInterval(1));
        expect(next.bombs[0]?.y).toBe(FORMATION_Y + 8);
    });

    it('disappears at the ground', () => {
        const state = { ...quiet(fresh()), bombs: [{ x: 2, y: 230 }] };
        expect(step(state, frame(), DT).bombs).toEqual([]);
    });

    it('erodes bunkers from above', () => {
        const state = quiet(fresh());
        const bunker = state.bunkers[2];
        if (!bunker) throw new Error('missing bunker');
        const next = step({ ...state, bombs: [{ x: bunker.x + 8, y: BUNKER_Y - 7 }] }, frame(), DT);
        expect(next.bombs).toEqual([]);
        expect(next.bunkers[2]?.cells.slice(0, BUNKER_COLS).filter(Boolean).length).toBeLessThan(7);
    });

    it('costs a life, freezes and respawns the cannon', () => {
        const state = { ...quiet(fresh()), player: 20, shot: { x: 100, y: 100 } };
        const bombs = [{ x: 24, y: PLAYER_Y - 6 }, { x: 150, y: 100 }];
        const hit = step({ ...state, bombs }, frame(), DT);
        expect(hit.mode).toBe('dying');
        expect(hit.lives).toBe(2);
        expect(hit.bombs).toEqual([]);
        expect(hit.shot).toBeNull();
        expect(sounds({ ...state, bombs }, hit)).toEqual(['hit']);
        const frozen = step(hit, frame([], ['right']), DT);
        expect(frozen.player).toBe(20);
        const back = run(hit, DYING_MS + DT);
        expect(back.mode).toBe('playing');
        expect(back.player).toBe(Math.round((SCREEN.width - PLAYER_WIDTH) / 2));
    });

    it('ends the game when the last life is lost', () => {
        const state = { ...quiet(fresh()), lives: 1, player: 20, bombs: [{ x: 24, y: PLAYER_Y - 6 }] };
        const hit = step(state, frame(), DT);
        expect(hit.lives).toBe(0);
        const over = run(hit, DYING_MS + DT);
        expect(over.mode).toBe('over');
        expect(sounds(hit, step(hit, frame(), DYING_MS))).toEqual(['die']);
    });
});

describe('invaders saucer', () => {
    it('crosses the top at a seeded time and leaves the screen', () => {
        const state = { ...fresh(5), bombMs: -1e9, marchMs: -1e9, saucerMs: DT };
        const spawned = step(state, frame(), DT);
        const saucer = spawned.saucer;
        expect(saucer).not.toBeNull();
        expect(SAUCER_POINTS).toContain(saucer?.points);
        expect([-SAUCER_WIDTH, SCREEN.width]).toContain(saucer?.x);
        expect(spawned.saucerMs).toBeGreaterThan(10000);
        const moved = step(spawned, frame(), DT);
        expect(moved.saucer?.x).not.toBe(saucer?.x);
        expect(run(spawned, 6000).saucer).toBeNull();
    });

    it('spawns from both sides across seeds', () => {
        const sides = new Set<number>();
        for (let seed = 0; seed < 20; seed++) {
            const state = { ...fresh(seed), bombMs: -1e9, marchMs: -1e9, saucerMs: DT };
            sides.add(step(state, frame(), DT).saucer?.direction ?? 0);
        }
        expect(sides).toEqual(new Set([1, -1]));
    });

    it('does not appear when few aliens remain', () => {
        const state = { ...fresh(5), bombMs: -1e9, marchMs: -1e9, saucerMs: DT, aliens: only([0, 1, 2]) };
        expect(step(state, frame(), DT).saucer).toBeNull();
    });
});

describe('invaders waves', () => {
    it('clears the wave and starts a faster, lower one', () => {
        const state = { ...quiet(fresh()), aliens: only([0]), score: 100 };
        const box = alienBox(state.formation, 0);
        const shooting = { ...state, shot: { x: box.x + 4, y: box.y + box.height } };
        const cleared = step(shooting, frame(), DT);
        expect(cleared.mode).toBe('cleared');
        expect(sounds(shooting, cleared)).toEqual(['explode', 'win']);
        const waiting = step(cleared, frame(), DT);
        expect(waiting.mode).toBe('cleared');
        const next = run(cleared, CLEARED_MS + DT);
        expect(next.mode).toBe('playing');
        expect(next.wave).toBe(2);
        expect(aliveCount(next)).toBe(55);
        expect(next.formation.y).toBe(FORMATION_Y + MARCH_DROP);
        expect(next.score).toBe(130);
        expect(status(next).hud).toContainEqual({ label: 'WAVE', value: 2 });
    });

    it('caps how low later waves start', () => {
        let state = quiet(fresh());
        for (let wave = 1; wave < 10; wave++) {
            state = run({ ...state, aliens: only([]), saucerMs: 1e9, bombMs: -1e9 }, CLEARED_MS + DT * 3);
        }
        expect(state.wave).toBe(10);
        expect(state.formation.y).toBe(FORMATION_Y + MARCH_DROP * 4);
    });
});

describe('invaders sounds', () => {
    it('plays shoot when firing and nothing when idle', () => {
        const state = quiet(fresh());
        expect(sounds(state, step(state, frame(['action']), DT))).toEqual(['shoot']);
        expect(sounds(state, step(state, frame(), DT))).toEqual([]);
    });

    it('keeps the shot below its spawn height', () => {
        const state = quiet(fresh());
        const fired = step(state, frame(['action']), DT);
        expect(fired.shot?.y).toBeLessThan(PLAYER_Y - SHOT_HEIGHT);
    });
});
