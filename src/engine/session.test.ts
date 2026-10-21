import { describe, expect, it, vi } from 'vitest';
import { createRng } from './rng.ts';
import { advanceSession, createSession, pauseSession, RESTART_LOCKOUT_MS, sessionSounds, type Session } from './session.ts';
import type { Button, GameDefinition, InputFrame } from './types.ts';

interface CounterState {
    ticks: number;
    over: boolean;
}

const counter: GameDefinition<CounterState> = {
    id: 'counter',
    title: 'COUNTER',
    screen: { width: 10, height: 10 },
    controls: [],
    create: () => ({ ticks: 0, over: false }),
    step: (state, input) => ({ ticks: state.ticks + 1, over: input.held.has('down') }),
    render: vi.fn(),
    status: (state) => ({ score: state.ticks, over: state.over, hud: [] })
};

const rng = createRng(1);

function frame(pressed: Button[] = [], held: Button[] = []): InputFrame {
    return { pressed: new Set(pressed), held: new Set(held) };
}

function at(phase: Session<CounterState>['phase'], ticks = 3, phaseMs = 0): Session<CounterState> {
    return { phase, phaseMs, state: { ticks, over: false } };
}

describe('session', () => {
    it('starts in the ready phase with a fresh state', () => {
        expect(createSession(counter, rng)).toEqual(at('ready', 0));
    });

    it('waits in ready until start or action is pressed', () => {
        expect(advanceSession(counter, at('ready'), frame(), 16, rng).session).toEqual(at('ready', 3, 16));
        expect(advanceSession(counter, at('ready'), frame(['start']), 16, rng).session).toEqual(at('playing'));
        expect(advanceSession(counter, at('ready'), frame(['action']), 16, rng).session.phase).toBe('playing');
    });

    it('steps the game while playing', () => {
        const { session, exit } = advanceSession(counter, at('playing'), frame(), 16, rng);
        expect(session).toEqual(at('playing', 4, 16));
        expect(exit).toBe(false);
    });

    it('moves to over when the game reports it', () => {
        expect(advanceSession(counter, at('playing'), frame([], ['down']), 16, rng).session.phase).toBe('over');
    });

    it('pauses and resumes without stepping', () => {
        const paused = advanceSession(counter, at('playing'), frame(['pause']), 16, rng).session;
        expect(paused).toEqual(at('paused'));
        expect(advanceSession(counter, paused, frame(), 16, rng).session).toEqual(at('paused', 3, 16));
        expect(advanceSession(counter, paused, frame(['pause']), 16, rng).session).toEqual(at('playing'));
        expect(advanceSession(counter, paused, frame(['start']), 16, rng).session.phase).toBe('playing');
    });

    it('restarts with a fresh state after game over', () => {
        const over = at('over', 3, RESTART_LOCKOUT_MS);
        expect(advanceSession(counter, over, frame(), 16, rng).session.phase).toBe('over');
        expect(advanceSession(counter, over, frame(['start']), 16, rng).session).toEqual(at('playing', 0));
    });

    it('ignores restart presses right after game over', () => {
        const justOver = advanceSession(counter, at('playing'), frame([], ['down']), 16, rng).session;
        expect(justOver.phaseMs).toBe(0);
        expect(advanceSession(counter, justOver, frame(['action']), 16, rng).session.phase).toBe('over');
    });

    it('requests exit on back from any phase', () => {
        for (const phase of ['ready', 'playing', 'paused', 'over'] as const) {
            expect(advanceSession(counter, at(phase), frame(['back']), 16, rng).exit).toBe(true);
        }
    });

    it('pauses only a playing session when the page is hidden', () => {
        expect(pauseSession(at('playing')).phase).toBe('paused');
        const ready = at('ready');
        expect(pauseSession(ready)).toBe(ready);
    });
});

describe('sessionSounds', () => {
    const noisy: GameDefinition<CounterState> = {
        ...counter,
        sounds: (_previous, next) => (next.ticks % 2 === 0 ? ['shoot'] : [])
    };

    it('plays the game sounds while playing and start when play begins', () => {
        expect(sessionSounds(noisy, at('playing', 3), at('playing', 4))).toEqual(['shoot']);
        expect(sessionSounds(noisy, at('ready'), at('playing'))).toEqual(['start']);
        expect(sessionSounds(noisy, at('over'), at('playing', 0))).toEqual(['start']);
        expect(sessionSounds(counter, at('paused'), at('playing'))).toEqual([]);
    });

    it('ignores unchanged state', () => {
        const session = at('playing', 4);
        expect(sessionSounds(noisy, session, session)).toEqual([]);
    });

    it('adds a die sound on game over even when the game played something else', () => {
        const over: Session<CounterState> = { phase: 'over', phaseMs: 0, state: { ticks: 4, over: true } };
        expect(sessionSounds(noisy, at('playing', 3), over)).toEqual(['shoot', 'die']);
    });

    it('plays win for a won game and nothing extra when the game already ended it', () => {
        const winner: GameDefinition<CounterState> = {
            ...counter,
            status: (state) => ({ score: state.ticks, over: state.over, won: true, hud: [] })
        };
        const over: Session<CounterState> = { phase: 'over', phaseMs: 0, state: { ticks: 5, over: true } };
        expect(sessionSounds(winner, at('playing', 4), over)).toEqual(['win']);
        const ending: GameDefinition<CounterState> = { ...counter, sounds: () => ['die'] };
        expect(sessionSounds(ending, at('playing', 4), over)).toEqual(['die']);
    });
});
