import type { ReactNode } from 'react';

interface CabinetProps {
    tag: string;
    title: string;
    screenLabel: string;
    bezelNote: string;
    panel: ReactNode;
    children: ReactNode;
}

export function Cabinet({ tag, title, screenLabel, bezelNote, panel, children }: CabinetProps) {
    return (
        <main className="arcade-room">
            <div className="cabinet">
                <header className="marquee">
                    <p className="marquee-tag">{tag}</p>
                    <h1 className="marquee-title">{title}</h1>
                </header>

                <section className="bezel" aria-label={screenLabel}>
                    <div className="crt">
                        <span className="crt-band" aria-hidden="true" />
                        <div className="crt-content">{children}</div>
                    </div>
                    <p className="bezel-card">{bezelNote}</p>
                </section>

                <section className="control-panel">
                    <div className="joystick" aria-hidden="true">
                        <span className="joystick-ball" />
                    </div>
                    <div className="panel-center">{panel}</div>
                    <div className="panel-buttons" aria-hidden="true">
                        <span className="panel-button" />
                        <span className="panel-button" />
                    </div>
                </section>
            </div>
        </main>
    );
}
