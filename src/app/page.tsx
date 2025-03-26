'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

interface Game {
  id: string;
  title: string;
  comingSoon: boolean;
  imageUrl: string;
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([
    {
      id: 'snake',
      title: 'Snake',
      comingSoon: false,
      imageUrl: '/games/snake.png'
    },
    {
      id: 'tetris',
      title: 'Tetris',
      comingSoon: true,
      imageUrl: '/games/tetris.png'
    },
    {
      id: 'pacman',
      title: 'Pac-Man',
      comingSoon: true,
      imageUrl: '/games/pacman.png'
    },
    {
      id: 'space-invaders',
      title: 'Space Invaders',
      comingSoon: true,
      imageUrl: '/games/space-invaders.png'
    }
  ]);
  
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [coinInserted, setCoinInserted] = useState(false);

  // Simulate coin insertion
  const insertCoin = () => {
    const coinSound = new Audio('/sounds/coin.mp3');
    coinSound.play().catch(e => console.log('Audio play failed:', e));
    setCoinInserted(true);
  };

  // Handle selection
  const handleGameSelect = (gameId: string) => {
    if (!coinInserted) return;
    
    const selectSound = new Audio('/sounds/select.mp3');
    selectSound.play().catch(e => console.log('Audio play failed:', e));
    setSelectedGame(gameId);
    
    // For Snake, we navigate to the game
    if (gameId === 'snake') {
      // We'll handle navigation in the UI
      return;
    }
    
    // For other games that aren't implemented yet
    setTimeout(() => {
      alert('Coming soon! This game is not available yet.');
      setSelectedGame(null);
      setCoinInserted(false);
    }, 500);
  };

  return (
    <main className={styles.main}>
      <div className="scanlines"></div>
      
      <header className={styles.header}>
        <h1 className={`${styles.title} neon-text`}>INSERT COIN</h1>
        <p className={styles.subtitle}>Classic Arcade Games</p>
      </header>

      <div className={`${styles.arcadeCabinet} arcade-screen`}>
        <div className={styles.gameSelector}>
          {games.map((game) => (
            <div 
              key={game.id}
              className={`${styles.gameCard} ${selectedGame === game.id ? styles.selected : ''} ${!coinInserted ? styles.disabled : ''}`}
              onClick={() => handleGameSelect(game.id)}
            >
              <div className={styles.gameImagePlaceholder}>
                {game.comingSoon ? (
                  <span className={styles.comingSoon}>COMING SOON</span>
                ) : (
                  <Image 
                    src={game.imageUrl} 
                    alt={game.title} 
                    width={150} 
                    height={150} 
                    className={styles.gameImage}
                  />
                )}
              </div>
              <h3 className={styles.gameTitle}>{game.title}</h3>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.controls}>
        {!coinInserted ? (
          <button className="pixel-button" onClick={insertCoin}>
            Insert Coin
          </button>
        ) : selectedGame === 'snake' ? (
          <Link href="/games/snake" className="pixel-button">
            Play Snake
          </Link>
        ) : (
          <p className={styles.instructions}>Use arrow keys to navigate, SPACE to select</p>
        )}
      </div>
      
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Insert Coin - All Rights Reserved</p>
        <p>Press ESC to exit game</p>
      </footer>
    </main>
  );
} 