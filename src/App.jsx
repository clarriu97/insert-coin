import { Navigate, Route, Routes } from 'react-router-dom';
import HomeView from './views/HomeView.jsx';
import LegacyGameView from './views/LegacyGameView.jsx';

const base = import.meta.env.BASE_URL;

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/snake" element={<LegacyGameView title="SNAKE" src={`${base}legacy/games/snake/index.html`} />} />
            <Route path="/tetris" element={<LegacyGameView title="TETRIS" src={`${base}legacy/games/tetris/index.html`} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
