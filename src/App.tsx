import { Navigate, Route, Routes, useParams } from 'react-router';
import { findGame, GAMES } from './games/registry.ts';
import { GameHost } from './shell/GameHost.tsx';
import { GameSelect } from './shell/GameSelect.tsx';
import { LegacyGameView } from './shell/LegacyGameView.tsx';

const base = import.meta.env.BASE_URL;

function PlayRoute() {
    const { gameId } = useParams();
    const entry = findGame(gameId);
    if (entry?.kind !== 'native') {
        return <Navigate to="/" replace />;
    }
    return <GameHost key={entry.id} entry={entry} />;
}

export function App() {
    return (
        <Routes>
            <Route path="/" element={<GameSelect />} />
            <Route path="/play/:gameId" element={<PlayRoute />} />
            {GAMES.map((entry) => entry.kind === 'legacy' && (
                <Route
                    key={entry.id}
                    path={`/${entry.id}`}
                    element={<LegacyGameView title={entry.title} src={`${base}${entry.src}`} />}
                />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
