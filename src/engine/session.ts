import type { Rng } from './rng.ts';
import type { GameDefinition, InputFrame } from './types.ts';

export const RESTART_LOCKOUT_MS = 750;

export type Phase = 'ready' | 'playing' | 'paused' | 'over';

export interface Session<S> {
    phase: Phase;
    phaseMs: number;
    state: S;
}

export interface SessionStep<S> {
    session: Session<S>;
    exit: boolean;
}

export function createSession<S>(definition: GameDefinition<S>, rng: Rng): Session<S> {
    return { phase: 'ready', phaseMs: 0, state: definition.create(rng) };
}

export function pauseSession<S>(session: Session<S>): Session<S> {
    return session.phase === 'playing' ? { ...session, phase: 'paused', phaseMs: 0 } : session;
}

function enter<S>(phase: Phase, state: S): SessionStep<S> {
    return { session: { phase, phaseMs: 0, state }, exit: false };
}

function stay<S>(session: Session<S>, dtMs: number): SessionStep<S> {
    return { session: { ...session, phaseMs: session.phaseMs + dtMs }, exit: false };
}

export function advanceSession<S>(
    definition: GameDefinition<S>,
    session: Session<S>,
    input: InputFrame,
    dtMs: number,
    rng: Rng
): SessionStep<S> {
    const { pressed } = input;
    if (pressed.has('back')) {
        return { session, exit: true };
    }

    const startPressed = pressed.has('start') || pressed.has('action');
    switch (session.phase) {
    case 'ready':
        return startPressed ? enter('playing', session.state) : stay(session, dtMs);
    case 'paused':
        return pressed.has('pause') || pressed.has('start') ? enter('playing', session.state) : stay(session, dtMs);
    case 'over':
        return startPressed && session.phaseMs >= RESTART_LOCKOUT_MS
            ? enter('playing', definition.create(rng))
            : stay(session, dtMs);
    case 'playing': {
        if (pressed.has('pause')) {
            return enter('paused', session.state);
        }
        const state = definition.step(session.state, input, dtMs);
        return definition.status(state).over
            ? enter('over', state)
            : { session: { phase: 'playing', phaseMs: session.phaseMs + dtMs, state }, exit: false };
    }
    }
}
