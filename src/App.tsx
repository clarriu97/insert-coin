import { Navigate, Route, Routes, useParams } from 'react-router';
import { findGame } from './games/registry.ts';
import { GameHost } from './shell/GameHost.tsx';
import { GameSelect } from './shell/GameSelect.tsx';

function PlayRoute() {
    const { gameId } = useParams();
    const entry = findGame(gameId);
    if (!entry) {
        return <Navigate to="/" replace />;
    }
    return <GameHost key={entry.id} entry={entry} />;
}

export function App() {
    return (
        <Routes>
            <Route path="/" element={<GameSelect />} />
            <Route path="/play/:gameId" element={<PlayRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
