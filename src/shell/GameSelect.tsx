import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { gamePath, GAMES } from '../games/registry.ts';

const visibleGames = GAMES.filter((entry) => !entry.hidden);
const base = import.meta.env.BASE_URL;

export function GameSelect() {
    const navigate = useNavigate();
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
            }

            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                setSelectedIndex((prev) => (prev - 1 + visibleGames.length) % visibleGames.length);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                setSelectedIndex((prev) => (prev + 1) % visibleGames.length);
            } else if (e.key === 'Enter' || e.key === ' ') {
                const selected = visibleGames[selectedIndex];
                if (selected) {
                    navigate(gamePath(selected));
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [navigate, selectedIndex]);

    return (
        <div className="app-shell">
            <div className="arcade-machine">
                <header className="marquee">
                    <p className="marquee-subtitle">EST. 1987</p>
                    <h1 className="marquee-title">INSERT COIN</h1>
                    <p className="marquee-subtitle blink">CHOOSE YOUR GAME WITH ARROWS + ENTER</p>
                </header>

                <section className="screen-bezel" aria-label="Game selection screen">
                    <div className="crt-screen">
                        <div className="game-grid">
                            {visibleGames.map((entry, index) => (
                                <button
                                    key={entry.id}
                                    className={`game-tile ${entry.id} ${selectedIndex === index ? 'selected' : ''}`}
                                    type="button"
                                    onClick={() => navigate(gamePath(entry))}
                                    tabIndex={-1}
                                >
                                    <img src={`${base}${entry.cover}`} alt={entry.title} />
                                    <span className="game-name">{entry.title}</span>
                                    <span className="game-meta">{entry.players}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="control-panel">
                    <div className="joystick-base" aria-hidden="true">
                        <div className="joystick-stick"></div>
                    </div>
                    <div className="panel-center">
                        <p className="panel-label">ARROWS: SELECT · ENTER: PLAY · ESC: BACK</p>
                    </div>
                    <div className="action-buttons" aria-hidden="true">
                        <span className="arc-btn red"></span>
                        <span className="arc-btn blue"></span>
                    </div>
                </section>

                <footer className="machine-footer">
                    <p>
                        Built by{' '}
                        <a href="https://github.com/clarriu97" target="_blank" rel="noreferrer">clarriu97</a>
                        {' '}·{' '}
                        <a href="https://github.com/clarriu97/insert-coin" target="_blank" rel="noreferrer">GitHub</a>
                    </p>
                </footer>
            </div>
        </div>
    );
}
