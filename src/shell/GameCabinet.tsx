import type { ReactNode } from 'react';
import { Cabinet } from './Cabinet.tsx';

interface GameCabinetProps {
    title: string;
    subtitle: string;
    onBack(): void;
    children: ReactNode;
}

export function GameCabinet({ title, subtitle, onBack, children }: GameCabinetProps) {
    return (
        <Cabinet
            tag="NOW PLAYING"
            title={title}
            screenLabel={`${title} screen`}
            bezelNote={subtitle}
            panel={
                <button className="panel-link" type="button" onClick={onBack}>ESC · BACK TO ARCADE</button>
            }
        >
            {children}
        </Cabinet>
    );
}
