function insertCoinExit() {
    if (window.parent !== window.self) {
        window.parent.postMessage({ type: 'INSERT_COIN_EXIT' }, '*');
    } else {
        window.location.href = '/';
    }
}

class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.difficultyElement = document.getElementById('difficulty');
        this.menuOverlay = document.getElementById('menuOverlay');
        this.gameOverOverlay = document.getElementById('gameOverOverlay');
        this.pauseOverlay = document.getElementById('pauseOverlay');
        this.finalScoreElement = document.getElementById('finalScore');

        // Configuración del juego
        this.tileSize = 20;
        this.tileCount = 20;
        this.speed = 150; // Velocidad inicial (EASY)

        // Configurar tamaño del canvas
        this.canvas.width = this.tileSize * this.tileCount;
        this.canvas.height = this.tileSize * this.tileCount;

        // Estado del juego
        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.tickTimeout = null;

        this.difficultyButtons = Array.from(document.querySelectorAll('.difficulty-btn'));
        this.difficultyIndex = 0;

        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        // Inicializar serpiente
        this.snake = [{x: 10, y: 10}]; // Posición inicial
        this.snakeDirection = {x: 0, y: 0}; // Dirección inicial
        this.nextDirection = {x: 0, y: 0}; // Siguiente dirección (para evitar giros de 180°)

        // Generar primera comida
        this.generateFood();

        // Resetear score
        this.score = 0;
        this.updateScore();
    }

    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
    }

    setupEventListeners() {
        // Control de teclas
        document.addEventListener('keydown', (e) => {
            const controlKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
            if (controlKeys.includes(e.key)) {
                e.preventDefault();
            }

            if (this.gameState === 'menu') {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    this.cycleDifficulty(-1);
                    return;
                }
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    this.cycleDifficulty(1);
                    return;
                }
            }

            switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.gameState !== 'menu' && this.snakeDirection.y !== 1) {
                    this.nextDirection = {x: 0, y: -1};
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.gameState !== 'menu' && this.snakeDirection.y !== -1) {
                    this.nextDirection = {x: 0, y: 1};
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.gameState !== 'menu' && this.snakeDirection.x !== 1) {
                    this.nextDirection = {x: -1, y: 0};
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.gameState !== 'menu' && this.snakeDirection.x !== -1) {
                    this.nextDirection = {x: 1, y: 0};
                }
                break;
            case ' ':
                this.handleSpaceBar();
                break;
            case 'p':
            case 'P':
                this.togglePause();
                break;
            case 'Escape':
                insertCoinExit();
                break;
            }
        });

        this.difficultyButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.setDifficultyIndex(index);
            });
        });
    }

    cycleDifficulty(delta) {
        const n = this.difficultyButtons.length;
        if (n === 0) return;
        const next = (this.difficultyIndex + delta + n) % n;
        this.setDifficultyIndex(next);
    }

    setDifficultyIndex(index) {
        const n = this.difficultyButtons.length;
        if (index < 0 || index >= n) return;
        this.difficultyIndex = index;
        this.difficultyButtons.forEach((b, i) => b.classList.toggle('selected', i === index));
        const btn = this.difficultyButtons[index];
        this.speed = parseInt(btn.dataset.speed, 10);
        this.difficultyElement.textContent = btn.textContent;
    }

    handleSpaceBar() {
        if (this.gameState === 'menu') {
            this.startGame();
        } else if (this.gameState === 'gameOver') {
            this.gameState = 'menu';
            this.menuOverlay.classList.remove('hidden');
            this.gameOverOverlay.classList.add('hidden');
            this.pauseOverlay.classList.add('hidden');
            this.initializeGame();
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.pauseOverlay.classList.remove('hidden');
            if (this.tickTimeout) {
                clearTimeout(this.tickTimeout);
                this.tickTimeout = null;
            }
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.pauseOverlay.classList.add('hidden');
            this.gameLoop();
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.menuOverlay.classList.add('hidden');
        this.gameOverOverlay.classList.add('hidden');
        this.pauseOverlay.classList.add('hidden');
        this.gameLoop();
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        this.finalScoreElement.textContent = this.score;
    }

    checkCollision() {
        const head = this.snake[0];

        // Colisión con paredes
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            return true;
        }

        // Colisión con la serpiente
        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                return true;
            }
        }

        return false;
    }

    gameLoop() {
        if (this.gameState !== 'playing') return;

        // Actualizar dirección
        this.snakeDirection = this.nextDirection;

        // Mover serpiente
        const newHead = {
            x: this.snake[0].x + this.snakeDirection.x,
            y: this.snake[0].y + this.snakeDirection.y
        };

        this.snake.unshift(newHead);

        // Comprobar si come
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.generateFood();
        } else {
            this.snake.pop();
        }

        // Comprobar colisiones
        if (this.checkCollision()) {
            this.gameState = 'gameOver';
            this.gameOverOverlay.classList.remove('hidden');
            return;
        }

        // Dibujar
        this.draw();

        // Siguiente frame
        this.tickTimeout = setTimeout(() => this.gameLoop(), this.speed);
    }

    draw() {
        // Limpiar canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar serpiente
        this.ctx.fillStyle = '#0f0';
        this.snake.forEach(segment => {
            this.ctx.fillRect(
                segment.x * this.tileSize,
                segment.y * this.tileSize,
                this.tileSize - 2,
                this.tileSize - 2
            );
        });

        // Dibujar comida
        this.ctx.fillStyle = '#f00';
        this.ctx.fillRect(
            this.food.x * this.tileSize,
            this.food.y * this.tileSize,
            this.tileSize - 2,
            this.tileSize - 2
        );

        // Rejilla tenue para mejorar lectura del tablero
        this.ctx.strokeStyle = 'rgba(44, 229, 107, 0.08)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.tileCount; i++) {
            const offset = i * this.tileSize;
            this.ctx.beginPath();
            this.ctx.moveTo(offset, 0);
            this.ctx.lineTo(offset, this.canvas.height);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, offset);
            this.ctx.lineTo(this.canvas.width, offset);
            this.ctx.stroke();
        }
    }
}

// Iniciar juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
}); 