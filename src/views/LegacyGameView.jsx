import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function LegacyGameView({ title, src }) {
    const navigate = useNavigate();
    const frameRef = useRef(null);

    useEffect(() => {
        const frame = frameRef.current;
        if (frame) {
            frame.focus();
        }

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                navigate('/');
            }
        };

        const onMessage = (e) => {
            if (e.data?.type !== 'INSERT_COIN_EXIT') return;
            const win = frameRef.current?.contentWindow;
            if (win && e.source === win) {
                navigate('/');
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('message', onMessage);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('message', onMessage);
        };
    }, [navigate]);

    return (
        <div className="app-shell">
            <div className="arcade-machine game-mode">
                <header className="marquee">
                    <p className="marquee-subtitle">NOW PLAYING</p>
                    <h1 className="marquee-title">{title}</h1>
                    <p className="marquee-subtitle blink">GAME CONTROLS INSIDE · ESC RETURNS TO MENU</p>
                </header>

                <section className="screen-bezel game-bezel">
                    <div className="crt-screen game-screen">
                        <iframe ref={frameRef} title={title} src={src} className="legacy-frame" scrolling="no" tabIndex={0} />
                    </div>
                </section>

                <section className="control-panel game-controls">
                    <button className="back-link" type="button" onClick={() => navigate('/')}>ESC / BACK TO ARCADE</button>
                </section>
            </div>
        </div>
    );
}

export default LegacyGameView;
