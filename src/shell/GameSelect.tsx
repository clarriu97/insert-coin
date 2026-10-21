import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { appAudio } from '../engine/audio.ts';
import { createHighScoreStore } from '../engine/highscores.ts';
import { gamePath, GAMES } from '../games/registry.ts';
import { Cabinet } from './Cabinet.tsx';
import { MuteToggle } from './MuteToggle.tsx';

const visibleGames = GAMES.filter((entry) => !entry.hidden);
const base = import.meta.env.BASE_URL;
const PREVIOUS_KEYS = ['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'];
const NEXT_KEYS = ['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'];

export function GameSelect() {
    const navigate = useNavigate();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const best = useMemo(() => {
        const store = createHighScoreStore();
        return new Map(visibleGames.map((entry) => [entry.id, store.best(entry.id)]));
    }, []);
    const selected = visibleGames[selectedIndex];

    useEffect(() => {
        itemRefs.current[selectedIndex]?.focus();
    }, [selectedIndex]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const delta = PREVIOUS_KEYS.includes(e.code) ? -1 : NEXT_KEYS.includes(e.code) ? 1 : 0;
            if (delta !== 0) {
                e.preventDefault();
                appAudio().play('select');
                setSelectedIndex((prev) => (prev + delta + visibleGames.length) % visibleGames.length);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <Cabinet
            tag={`${visibleGames.length} GAMES IN 1`}
            title="INSERT COIN"
            screenLabel="Game selection screen"
            bezelNote="USE JOYSTICK TO SELECT · PRESS START TO PLAY"
            panel={
                <>
                    <MuteToggle />
                    <p className="panel-label">
                        <a href="https://github.com/clarriu97/insert-coin" target="_blank" rel="noreferrer">clarriu97 · GITHUB</a>
                    </p>
                </>
            }
        >
            <div className="menu">
                <div className="menu-header">
                    <h2>SELECT GAME</h2>
                    <p className="menu-credit">CREDIT 00</p>
                </div>

                <ul className="menu-list">
                    {visibleGames.map((entry, index) => (
                        <li key={entry.id}>
                            <button
                                ref={(element) => {
                                    itemRefs.current[index] = element;
                                }}
                                className="menu-item"
                                type="button"
                                aria-current={index === selectedIndex ? 'true' : undefined}
                                tabIndex={index === selectedIndex ? 0 : -1}
                                onFocus={() => setSelectedIndex(index)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => {
                                    appAudio().play('coin');
                                    navigate(gamePath(entry));
                                }}
                            >
                                <span className="menu-cursor" aria-hidden="true">▶</span>
                                <span className="menu-name">{entry.title}</span>
                                <span className="menu-meta">{entry.players}</span>
                            </button>
                        </li>
                    ))}
                </ul>

                {selected && (
                    <aside className="menu-preview" aria-label={`${selected.title} preview`}>
                        <img src={`${base}${selected.cover}`} alt="" width="160" height="160" />
                        <dl className="menu-best">
                            <dt>BEST</dt>
                            <dd>{String(best.get(selected.id) ?? 0).padStart(6, '0')}</dd>
                        </dl>
                    </aside>
                )}

                <p className="menu-footer blink">INSERT COIN</p>
            </div>
        </Cabinet>
    );
}
