import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function HomeView() {
    const navigate = useNavigate();
    const base = import.meta.env.BASE_URL;
    const games = ['/snake', '/tetris'];
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
            }

            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                setSelectedIndex((prev) => (prev - 1 + games.length) % games.length);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                setSelectedIndex((prev) => (prev + 1) % games.length);
            } else if (e.key === 'Enter' || e.key === ' ') {
                navigate(games[selectedIndex]);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [games, navigate, selectedIndex]);

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
                            <button
                                className={`game-tile snake ${selectedIndex === 0 ? 'selected' : ''}`}
                                type="button"
                                onClick={() => navigate('/snake')}
                                tabIndex={-1}
                            >
                                <img src={`${base}games/snake.svg`} alt="Snake" />
                                <span className="game-name">SNAKE</span>
                                <span className="game-meta">1 PLAYER</span>
                            </button>
                            <button
                                className={`game-tile tetris ${selectedIndex === 1 ? 'selected' : ''}`}
                                type="button"
                                onClick={() => navigate('/tetris')}
                                tabIndex={-1}
                            >
                                <img src={`${base}games/tetris.svg`} alt="Tetris" />
                                <span className="game-name">TETRIS</span>
                                <span className="game-meta">1 PLAYER</span>
                            </button>
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

export default HomeView;
