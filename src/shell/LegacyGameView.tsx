import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { GameCabinet } from './GameCabinet.tsx';

interface LegacyGameViewProps {
    title: string;
    src: string;
}

export function LegacyGameView({ title, src }: LegacyGameViewProps) {
    const navigate = useNavigate();
    const frameRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        frameRef.current?.focus();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                navigate('/');
            }
        };

        const onMessage = (e: MessageEvent) => {
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
        <GameCabinet title={title} subtitle="GAME CONTROLS INSIDE · ESC RETURNS TO MENU" onBack={() => navigate('/')}>
            <iframe ref={frameRef} title={title} src={src} className="legacy-frame" scrolling="no" tabIndex={0} />
        </GameCabinet>
    );
}
