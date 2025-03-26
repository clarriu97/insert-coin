'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

// Directions
enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

// Define interfaces
interface Position {
  x: number;
  y: number;
}

// Snake game component
export default function SnakeGame() {
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game settings
  const gridSize = 20;
  const cellSize = 20;
  const maxSpeed = 10;
  const initialSnakeLength = 3;

  // Game state refs (for use in requestAnimationFrame)
  const snakeRef = useRef<Position[]>([]);
  const foodRef = useRef<Position>({ x: 0, y: 0 });
  const directionRef = useRef<Direction>(Direction.RIGHT);
  const nextDirectionRef = useRef<Direction>(Direction.RIGHT);
  const lastRenderTimeRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(5);
  const gameLoopRef = useRef<number>(0);
  
  // Initialize game
  const initGame = () => {
    // Reset state
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    
    // Reset snake
    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);
    
    const initialSnake: Position[] = [];
    for (let i = 0; i < initialSnakeLength; i++) {
      initialSnake.push({ x: centerX - i, y: centerY });
    }
    
    snakeRef.current = initialSnake;
    directionRef.current = Direction.RIGHT;
    nextDirectionRef.current = Direction.RIGHT;
    gameSpeedRef.current = 5;
    
    // Place food
    placeFood();
    
    // Start game loop
    lastRenderTimeRef.current = 0;
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };
  
  // Place food in a random position that's not occupied by the snake
  const placeFood = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const snake = snakeRef.current;
    
    let newFoodPosition: Position;
    do {
      newFoodPosition = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize)
      };
      
      // Check if position is occupied by snake
    } while (snake.some(segment => segment.x === newFoodPosition.x && segment.y === newFoodPosition.y));
    
    foodRef.current = newFoodPosition;
  };
  
  // Game loop
  const gameLoop = (currentTime: number) => {
    const timeSinceLastRender = (currentTime - lastRenderTimeRef.current) / 1000;
    
    // Calculate next frame based on game speed
    if (timeSinceLastRender < 1 / gameSpeedRef.current) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    lastRenderTimeRef.current = currentTime;
    
    // Update game state
    if (!updateGame()) {
      drawGame();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  };
  
  // Update game state for one frame
  const updateGame = (): boolean => {
    const snake = snakeRef.current;
    const food = foodRef.current;
    
    // Update direction
    directionRef.current = nextDirectionRef.current;
    
    // Move snake
    const newHead = { ...snake[0] };
    switch (directionRef.current) {
      case Direction.UP:
        newHead.y -= 1;
        break;
      case Direction.DOWN:
        newHead.y += 1;
        break;
      case Direction.LEFT:
        newHead.x -= 1;
        break;
      case Direction.RIGHT:
        newHead.x += 1;
        break;
    }
    
    // Check for collision with walls
    if (
      newHead.x < 0 || 
      newHead.x >= gridSize || 
      newHead.y < 0 || 
      newHead.y >= gridSize
    ) {
      endGame();
      return true;
    }
    
    // Check for collision with self
    if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      endGame();
      return true;
    }
    
    // Move snake
    snake.unshift(newHead);
    
    // Check for food collision
    if (newHead.x === food.x && newHead.y === food.y) {
      // Increase score
      const newScore = score + 1;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
      }
      
      // Increase speed slightly
      if (gameSpeedRef.current < maxSpeed) {
        gameSpeedRef.current += 0.2;
      }
      
      // Place new food
      placeFood();
    } else {
      // Remove tail
      snake.pop();
    }
    
    snakeRef.current = snake;
    return false;
  };
  
  // Draw game
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const snake = snakeRef.current;
    const food = foodRef.current;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw snake
    snake.forEach((segment, index) => {
      // Head is brighter
      if (index === 0) {
        ctx.fillStyle = '#30ff9e'; // Brighter green for head
      } else {
        ctx.fillStyle = '#1eff8e'; // Regular green for body
      }
      
      ctx.fillRect(
        segment.x * cellSize,
        segment.y * cellSize,
        cellSize,
        cellSize
      );
      
      // Add pixel-art style details
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(
        segment.x * cellSize,
        segment.y * cellSize,
        cellSize,
        cellSize
      );
    });
    
    // Draw food
    ctx.fillStyle = '#ff00ff'; // Magenta food
    ctx.fillRect(
      food.x * cellSize,
      food.y * cellSize,
      cellSize,
      cellSize
    );
    
    // Add pixel-art style details to food
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(
      food.x * cellSize,
      food.y * cellSize,
      cellSize,
      cellSize
    );
  };
  
  // End game
  const endGame = () => {
    setGameOver(true);
    setGameStarted(false);
    cancelAnimationFrame(gameLoopRef.current);
  };
  
  // Set up keyboard controls
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Prevent default arrow key scrolling
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key) {
        case "ArrowUp":
          if (directionRef.current !== Direction.DOWN) {
            nextDirectionRef.current = Direction.UP;
          }
          break;
        case "ArrowDown":
          if (directionRef.current !== Direction.UP) {
            nextDirectionRef.current = Direction.DOWN;
          }
          break;
        case "ArrowLeft":
          if (directionRef.current !== Direction.RIGHT) {
            nextDirectionRef.current = Direction.LEFT;
          }
          break;
        case "ArrowRight":
          if (directionRef.current !== Direction.LEFT) {
            nextDirectionRef.current = Direction.RIGHT;
          }
          break;
        case " ":
          if (!gameStarted && !gameOver) {
            initGame();
          } else if (gameOver) {
            initGame();
          }
          break;
        case "Escape":
          if (gameStarted) {
            endGame();
          }
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeydown);
    
    // Clean up
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameStarted, gameOver]);
  
  return (
    <div className={styles.gameContainer}>
      <div className="scanlines"></div>
      
      <header className={styles.header}>
        <h1 className="neon-text">SNAKE</h1>
        <div className={styles.scoreBoard}>
          <div className={styles.score}>Score: {score}</div>
          <div className={styles.highScore}>High Score: {highScore}</div>
        </div>
      </header>
      
      <div className={`${styles.gameScreen} arcade-screen`}>
        <canvas 
          ref={canvasRef}
          width={gridSize * cellSize}
          height={gridSize * cellSize}
          className={styles.gameCanvas}
        />
        
        {!gameStarted && !gameOver && (
          <div className={styles.overlay}>
            <h2>PRESS SPACE TO START</h2>
            <p>Use arrow keys to control the snake</p>
          </div>
        )}
        
        {gameOver && (
          <div className={styles.overlay}>
            <h2>GAME OVER</h2>
            <p>Your score: {score}</p>
            <button 
              className="pixel-button" 
              onClick={initGame}
            >
              Play Again
            </button>
          </div>
        )}
      </div>
      
      <div className={styles.controls}>
        <Link href="/" className={`${styles.backButton} pixel-button`}>
          Back to Arcade
        </Link>
      </div>
    </div>
  );
} 