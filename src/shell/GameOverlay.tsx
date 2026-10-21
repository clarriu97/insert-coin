import { ALPHABET } from '../engine/initials.ts';
import type { GameDefinition } from '../engine/types.ts';
import type { View } from './GameHost.tsx';

const TABLE_ROWS = 5;

interface GameOverlayProps {
    view: View;
    definition: GameDefinition<unknown>;
}

export function GameOverlay({ view, definition }: GameOverlayProps) {
    const { phase, status, entry, table } = view;
    if (phase === 'playing') return null;
    const score = status?.score ?? 0;

    if (phase === 'ready') {
        return (
            <div className="host-overlay" role="dialog" aria-label="ready">
                <h2>{definition.title}</h2>
                <ul className="host-controls">
                    {definition.controls.map((hint) => (
                        <li key={hint.keys}><kbd>{hint.keys}</kbd> {hint.action}</li>
                    ))}
                </ul>
                <p className="blink">PRESS ENTER TO START</p>
            </div>
        );
    }

    if (phase === 'paused') {
        return (
            <div className="host-overlay" role="dialog" aria-label="paused">
                <h2>PAUSED</h2>
                <p>P TO RESUME · ESC TO EXIT</p>
            </div>
        );
    }

    if (entry) {
        return (
            <div className="host-overlay" role="dialog" aria-label="new high score">
                <h2>NEW HIGH SCORE</h2>
                <p>SCORE {score}</p>
                <p className="initials" aria-label="initials">
                    {entry.letters.map((letter, index) => (
                        <span key={index} className={index === entry.position ? 'initial current' : 'initial'}>
                            {ALPHABET[letter]}
                        </span>
                    ))}
                </p>
                <p className="host-hint">↑↓ LETTER · ←→ MOVE · ENTER OK</p>
            </div>
        );
    }

    return (
        <div className="host-overlay" role="dialog" aria-label="over">
            <h2>{status?.won ? 'YOU WIN' : 'GAME OVER'}</h2>
            <p>SCORE {score}</p>
            {table.length > 0 && (
                <ol className="host-table" aria-label="high scores">
                    {table.slice(0, TABLE_ROWS).map((row, index) => (
                        <li key={`${row.date}-${index}`}>
                            <span>{index + 1}.</span>
                            <span>{row.initials}</span>
                            <span>{row.score}</span>
                        </li>
                    ))}
                </ol>
            )}
            <p className="blink">PRESS ENTER TO PLAY AGAIN</p>
        </div>
    );
}
