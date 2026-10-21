import { useCallback, useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_PALETTE } from '../design/palette.ts';
import { appAudio } from '../engine/audio.ts';
import { createHighScoreStore, type HighScore } from '../engine/highscores.ts';
import { createEntry, entryText, updateEntry, type InitialsEntry } from '../engine/initials.ts';
import { createInput, type Input } from '../engine/input.ts';
import { createLoop } from '../engine/loop.ts';
import { createRng, randomSeed } from '../engine/rng.ts';
import { advanceSession, createSession, pauseSession, sessionSounds, type Phase } from '../engine/session.ts';
import type { Button, GameDefinition, GameStatus, Screen } from '../engine/types.ts';
import type { GameEntry } from '../games/registry.ts';
import { GameCabinet } from './GameCabinet.tsx';
import { GameOverlay } from './GameOverlay.tsx';
import { pixelScale } from './pixel-scale.ts';
import { TouchControls } from './TouchControls.tsx';

interface GameHostProps {
    entry: GameEntry;
}

export function GameHost({ entry }: GameHostProps) {
    const navigate = useNavigate();
    const [definition, setDefinition] = useState<GameDefinition<unknown> | null>(null);
    const exit = useCallback(() => navigate('/'), [navigate]);

    useEffect(() => {
        let active = true;
        entry.load().then((loaded) => {
            if (active) {
                setDefinition(loaded);
            }
        });
        return () => {
            active = false;
        };
    }, [entry]);

    return (
        <GameCabinet title={entry.title} subtitle="P PAUSES · ESC RETURNS TO MENU" onBack={exit}>
            {definition ? <GameScreen definition={definition} onExit={exit} /> : <p className="host-message">LOADING…</p>}
        </GameCabinet>
    );
}

export interface View {
    phase: Phase;
    status: GameStatus | null;
    best: number;
    entry: InitialsEntry | null;
    table: HighScore[];
}

interface GameScreenProps {
    definition: GameDefinition<unknown>;
    onExit(): void;
}

function GameScreen({ definition, onExit }: GameScreenProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inputRef = useRef<Input | null>(null);
    const scale = usePixelScale(frameRef, definition.screen);
    const [view, setView] = useState<View>({ phase: 'ready', status: null, best: 0, entry: null, table: [] });
    const exit = useEffectEvent(onExit);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const rng = createRng(randomSeed());
        const input = createInput();
        inputRef.current = input;
        const audio = appAudio();
        const store = createHighScoreStore();
        let session = createSession(definition, rng);
        let best = store.best(definition.id);
        let entry: InitialsEntry | null = null;
        let table: HighScore[] = [];
        let published = '';
        let exited = false;

        const publish = () => {
            const status = definition.status(session.state);
            const key = [
                session.phase,
                status.score,
                status.won,
                best,
                entry ? `${entryText(entry)}${entry.position}` : '',
                table.length,
                ...status.hud.map((field) => field.value)
            ].join('|');
            if (key !== published) {
                published = key;
                setView({ phase: session.phase, status, best, entry, table });
            }
        };

        const finishEntry = (finished: InitialsEntry) => {
            table = store.submit(definition.id, entryText(finished), definition.status(session.state).score);
            best = store.best(definition.id);
            entry = null;
        };

        const enterGameOver = () => {
            const { score } = definition.status(session.state);
            if (store.qualifies(definition.id, score)) {
                entry = createEntry();
            } else {
                table = store.list(definition.id);
            }
        };

        const loop = createLoop({
            update(dtMs) {
                if (exited) return;
                const frame = input.frame();
                if (frame.pressed.has('mute')) {
                    audio.toggleMute();
                }
                if (entry && !frame.pressed.has('back')) {
                    const updated = updateEntry(entry, frame.pressed);
                    if (updated.done) {
                        finishEntry(updated);
                    } else {
                        entry = updated;
                    }
                    publish();
                    return;
                }
                const previous = session;
                const result = advanceSession(definition, session, frame, dtMs, rng);
                session = result.session;
                if (result.exit) {
                    exited = true;
                    exit();
                    return;
                }
                const previousPhase = previous.phase;
                const effects = sessionSounds(definition, previous, session);
                effects.forEach((effect) => audio.play(effect));
                if (session.phase === 'over' && previousPhase !== 'over') {
                    enterGameOver();
                }
                publish();
            },
            render() {
                definition.render(ctx, session.state, DEFAULT_PALETTE);
            },
            onHidden() {
                session = pauseSession(session);
                publish();
            }
        });

        const unlock = () => audio.unlock();
        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('pointerdown', unlock, { once: true });

        loop.start();
        return () => {
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('pointerdown', unlock);
            loop.stop();
            input.dispose();
            inputRef.current = null;
        };
    }, [definition]);

    const { width, height } = definition.screen;
    const score = view.status?.score ?? 0;
    return (
        <div className="host">
            <dl className="host-hud" aria-live="polite">
                {view.status?.hud.map((field) => (
                    <div key={field.label} className="host-hud-field">
                        <dt>{field.label}</dt>
                        <dd>{field.value}</dd>
                    </div>
                ))}
                {view.status && (
                    <div className="host-hud-field">
                        <dt>HI</dt>
                        <dd>{Math.max(view.best, score)}</dd>
                    </div>
                )}
            </dl>
            <div ref={frameRef} className="host-frame">
                <canvas
                    ref={canvasRef}
                    className="host-canvas"
                    width={width}
                    height={height}
                    style={{ width: width * scale, height: height * scale }}
                    aria-label={`${definition.title} game screen`}
                />
                <GameOverlay view={view} definition={definition} />
            </div>
            <TouchControls
                onPress={(button: Button, source: string) => inputRef.current?.press(button, source)}
                onRelease={(button: Button, source: string) => inputRef.current?.release(button, source)}
            />
        </div>
    );
}

function usePixelScale(ref: RefObject<HTMLElement | null>, screen: Screen): number {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => {
            if (!entry) return;
            const { width, height } = entry.contentRect;
            setScale(pixelScale(Math.min(width / screen.width, height / screen.height), window.devicePixelRatio || 1));
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref, screen]);

    return scale;
}
