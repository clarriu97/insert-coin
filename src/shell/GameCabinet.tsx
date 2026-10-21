import type { ReactNode } from 'react';

interface GameCabinetProps {
    title: string;
    subtitle: string;
    onBack(): void;
    children: ReactNode;
}

export function GameCabinet({ title, subtitle, onBack, children }: GameCabinetProps) {
    return (
        <div className="app-shell">
            <div className="arcade-machine game-mode">
                <header className="marquee">
                    <p className="marquee-subtitle">NOW PLAYING</p>
                    <h1 className="marquee-title">{title}</h1>
                    <p className="marquee-subtitle blink">{subtitle}</p>
                </header>

                <section className="screen-bezel game-bezel">
                    <div className="crt-screen game-screen">{children}</div>
                </section>

                <section className="control-panel game-controls">
                    <button className="back-link" type="button" onClick={onBack}>ESC / BACK TO ARCADE</button>
                </section>
            </div>
        </div>
    );
}
