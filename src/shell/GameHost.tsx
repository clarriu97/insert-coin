import { useCallback, useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_PALETTE } from '../design/palette.ts';
import { createInput } from '../engine/input.ts';
import { createLoop } from '../engine/loop.ts';
import { createRng, randomSeed } from '../engine/rng.ts';
import { advanceSession, createSession, pauseSession, type Phase } from '../engine/session.ts';
import type { GameDefinition, GameStatus, Screen } from '../engine/types.ts';
import type { NativeEntry } from '../games/registry.ts';
import { GameCabinet } from './GameCabinet.tsx';

interface GameHostProps {
    entry: NativeEntry;
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

interface View {
    phase: Phase;
    status: GameStatus | null;
}

interface GameScreenProps {
    definition: GameDefinition<unknown>;
    onExit(): void;
}

function GameScreen({ definition, onExit }: GameScreenProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scale = usePixelScale(frameRef, definition.screen);
    const [view, setView] = useState<View>({ phase: 'ready', status: null });
    const exit = useEffectEvent(onExit);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const rng = createRng(randomSeed());
        const input = createInput();
        let session = createSession(definition, rng);
        let published = '';
        let exited = false;

        const publish = () => {
            const status = definition.status(session.state);
            const key = `${session.phase}|${status.score}|${status.won}|${status.hud.map((field) => field.value).join('|')}`;
            if (key !== published) {
                published = key;
                setView({ phase: session.phase, status });
            }
        };

        const loop = createLoop({
            update(dtMs) {
                if (exited) return;
                const result = advanceSession(definition, session, input.frame(), dtMs, rng);
                session = result.session;
                if (result.exit) {
                    exited = true;
                    exit();
                    return;
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

        loop.start();
        return () => {
            loop.stop();
            input.dispose();
        };
    }, [definition]);

    const { width, height } = definition.screen;
    return (
        <div className="host">
            <dl className="host-hud" aria-live="polite">
                {view.status?.hud.map((field) => (
                    <div key={field.label} className="host-hud-field">
                        <dt>{field.label}</dt>
                        <dd>{field.value}</dd>
                    </div>
                ))}
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
                <Overlay
                    phase={view.phase}
                    definition={definition}
                    score={view.status?.score ?? 0}
                    won={view.status?.won === true}
                />
            </div>
        </div>
    );
}

interface OverlayProps {
    phase: Phase;
    definition: GameDefinition<unknown>;
    score: number;
    won: boolean;
}

function Overlay({ phase, definition, score, won }: OverlayProps) {
    if (phase === 'playing') return null;
    return (
        <div className="host-overlay" role="dialog" aria-label={phase}>
            {phase === 'ready' && (
                <>
                    <h2>{definition.title}</h2>
                    <ul className="host-controls">
                        {definition.controls.map((hint) => (
                            <li key={hint.keys}><kbd>{hint.keys}</kbd> {hint.action}</li>
                        ))}
                    </ul>
                    <p className="blink">PRESS ENTER TO START</p>
                </>
            )}
            {phase === 'paused' && (
                <>
                    <h2>PAUSED</h2>
                    <p>P TO RESUME · ESC TO EXIT</p>
                </>
            )}
            {phase === 'over' && (
                <>
                    <h2>{won ? 'YOU WIN' : 'GAME OVER'}</h2>
                    <p>SCORE {score}</p>
                    <p className="blink">PRESS ENTER TO PLAY AGAIN</p>
                </>
            )}
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
            const fit = Math.min(width / screen.width, height / screen.height);
            setScale(fit >= 1 ? Math.floor(fit) : fit);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref, screen]);

    return scale;
}
