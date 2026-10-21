import { useEffect, useMemo, useState } from 'react';
import { createHighScoreStore } from '../engine/highscores.ts';
import type { GameEntry } from '../games/registry.ts';

export const SLIDE_MS = 5000;
const TABLE_ROWS = 5;

interface AttractModeProps {
    games: GameEntry[];
}

export function AttractMode({ games }: AttractModeProps) {
    const [slide, setSlide] = useState(0);
    const tables = useMemo(() => {
        const store = createHighScoreStore();
        return games.map((entry) => ({ entry, scores: store.list(entry.id).slice(0, TABLE_ROWS) }));
    }, [games]);

    useEffect(() => {
        const timer = window.setInterval(() => setSlide((current) => (current + 1) % (tables.length + 1)), SLIDE_MS);
        return () => window.clearInterval(timer);
    }, [tables.length]);

    const table = tables[slide - 1];
    return (
        <div className="attract" aria-live="polite">
            {table ? (
                <section key={table.entry.id} className="attract-slide" aria-label={`${table.entry.title} high scores`}>
                    <h2 className="attract-heading">HIGH SCORES</h2>
                    <p className="attract-game">{table.entry.title}</p>
                    {table.scores.length > 0 ? (
                        <ol className="attract-table">
                            {table.scores.map((row, index) => (
                                <li key={`${row.date}-${index}`}>
                                    <span>{index + 1}.</span>
                                    <span>{row.initials}</span>
                                    <span>{String(row.score).padStart(6, '0')}</span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="attract-empty">BE THE FIRST</p>
                    )}
                </section>
            ) : (
                <section key="title" className="attract-slide attract-title" aria-label="title">
                    <p className="attract-logo">INSERT COIN</p>
                    <p className="attract-sub">{games.length} CLASSIC GAMES</p>
                    <p className="blink">PRESS START</p>
                </section>
            )}
        </div>
    );
}
