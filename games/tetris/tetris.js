class TetrisGame {
    constructor() {
        // Inicializar elementos del DOM
        this.canvas = document.getElementById('gameCanvas');
        this.nextCanvas = document.getElementById('nextPieceCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.linesElement = document.getElementById('lines');
        this.finalScoreElement = document.getElementById('finalScore');
        this.finalLinesElement = document.getElementById('finalLines');
        this.menuOverlay = document.getElementById('menuOverlay');
        this.gameOverOverlay = document.getElementById('gameOverOverlay');
        this.pauseOverlay = document.getElementById('pauseOverlay');

        // Configuración del juego
        this.blockSize = 25;
        this.cols = 10;
        this.rows = 20;
        this.canvas.width = this.blockSize * this.cols;
        this.canvas.height = this.blockSize * this.rows;
        this.nextCanvas.width = this.blockSize * 4;
        this.nextCanvas.height = this.blockSize * 4;

        // Colores de las piezas (estilo retro)
        this.colors = [
            '#0f0', // I - Verde neón
            '#ff0', // O - Amarillo neón
            '#f0f', // T - Magenta neón
            '#00f', // S - Azul neón
            '#f00', // Z - Rojo neón
            '#0ff', // J - Cian neón
            '#f80'  // L - Naranja neón
        ];

        // Definición de las piezas (matrices de 4x4)
        this.pieces = [
            [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
            [[0,1,1,0], [0,1,1,0], [0,0,0,0], [0,0,0,0]], // O
            [[0,1,0,0], [1,1,1,0], [0,0,0,0], [0,0,0,0]], // T
            [[0,1,1,0], [1,1,0,0], [0,0,0,0], [0,0,0,0]], // S
            [[1,1,0,0], [0,1,1,0], [0,0,0,0], [0,0,0,0]], // Z
            [[1,0,0,0], [1,1,1,0], [0,0,0,0], [0,0,0,0]], // J
            [[0,0,1,0], [1,1,1,0], [0,0,0,0], [0,0,0,0]]  // L
        ];

        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        // Estado del juego
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropInterval = 1000; // Intervalo inicial de caída (ms)
        this.lastDrop = 0;
        this.currentPiece = null;
        this.currentPiecePos = { x: 0, y: 0 };
        this.nextPiece = this.getRandomPiece();

        this.updateScore();
        this.draw();
    }

    getRandomPiece() {
        const index = Math.floor(Math.random() * this.pieces.length);
        return {
            shape: this.pieces[index],
            color: this.colors[index]
        };
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'playing') {
                switch (e.key) {
                case 'ArrowLeft':
                    this.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                    this.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    this.movePiece(0, 1);
                    break;
                case ' ':
                    this.rotatePiece();
                    break;
                case 'ArrowUp':
                    this.hardDrop();
                    break;
                case 'p':
                case 'P':
                    this.togglePause();
                    break;
                case 'Escape':
                    window.location.href = '../../index.html';
                    break;
                }
            } else if (this.gameState === 'paused') {
                switch (e.key) {
                case 'p':
                case 'P':
                    this.togglePause();
                    break;
                case 'Escape':
                    window.location.href = '../../index.html';
                    break;
                }
            } else if (e.key === ' ') {
                this.handleSpaceBar();
            } else if (e.key === 'Escape') {
                window.location.href = '../../index.html';
            }
        });
    }

    handleSpaceBar() {
        if (this.gameState === 'menu') {
            this.startGame();
        } else if (this.gameState === 'gameOver') {
            this.gameState = 'menu';
            this.menuOverlay.classList.remove('hidden');
            this.gameOverOverlay.classList.add('hidden');
            this.initializeGame();
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.pauseOverlay.classList.remove('hidden');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.pauseOverlay.classList.add('hidden');
            this.lastDrop = performance.now();
            this.gameLoop();
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.menuOverlay.classList.add('hidden');
        this.spawnPiece();
        this.lastDrop = performance.now();
        this.gameLoop();
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.getRandomPiece();
        this.currentPiecePos = {
            x: Math.floor(this.cols / 2) - 2,
            y: 0
        };

        if (this.checkCollision()) {
            this.gameOver();
        } else {
            this.drawNextPiece();
        }
    }

    checkCollision(offsetX = 0, offsetY = 0, piece = this.currentPiece.shape) {
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (piece[y][x]) {
                    const newX = x + this.currentPiecePos.x + offsetX;
                    const newY = y + this.currentPiecePos.y + offsetY;

                    if (newX < 0 || newX >= this.cols || newY >= this.rows) {
                        return true;
                    }

                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    movePiece(dx, dy) {
        if (!this.checkCollision(dx, dy)) {
            this.currentPiecePos.x += dx;
            this.currentPiecePos.y += dy;
            this.draw();
            return true;
        }
        return false;
    }

    rotatePiece() {
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[i]).reverse()
        );

        if (!this.checkCollision(0, 0, rotated)) {
            this.currentPiece.shape = rotated;
            this.draw();
        }
    }

    hardDrop() {
        while (this.movePiece(0, 1)) {
            // Seguir cayendo
        }
        this.lockPiece();
    }

    lockPiece() {
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardY = y + this.currentPiecePos.y;
                    const boardX = x + this.currentPiecePos.x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }

        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;

        for (let y = this.rows - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.cols).fill(0));
                linesCleared++;
                y++; // Revisar la misma línea de nuevo
            }
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += this.calculateScore(linesCleared);
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            this.updateScore();
        }
    }

    calculateScore(lines) {
        const basePoints = [40, 100, 300, 1200]; // Puntos por 1, 2, 3 y 4 líneas
        return basePoints[lines - 1] * this.level;
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;
        this.linesElement.textContent = this.lines;
        this.finalScoreElement.textContent = this.score;
        this.finalLinesElement.textContent = this.lines;
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.gameOverOverlay.classList.remove('hidden');
    }

    draw() {
        // Limpiar canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar tablero
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.board[y][x]);
                }
            }
        }

        // Dibujar pieza actual
        if (this.currentPiece) {
            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    if (this.currentPiece.shape[y][x]) {
                        this.drawBlock(
                            x + this.currentPiecePos.x,
                            y + this.currentPiecePos.y,
                            this.currentPiece.color
                        );
                    }
                }
            }
        }

        // Dibujar cuadrícula
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.cols; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.blockSize, 0);
            this.ctx.lineTo(i * this.blockSize, this.canvas.height);
            this.ctx.stroke();
        }
        for (let i = 0; i <= this.rows; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.blockSize);
            this.ctx.lineTo(this.canvas.width, i * this.blockSize);
            this.ctx.stroke();
        }
    }

    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.blockSize + 1,
            y * this.blockSize + 1,
            this.blockSize - 2,
            this.blockSize - 2
        );

        // Efecto de brillo
        this.ctx.fillStyle = '#fff';
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillRect(
            x * this.blockSize + 1,
            y * this.blockSize + 1,
            this.blockSize - 2,
            2
        );
        this.ctx.globalAlpha = 1.0;
    }

    drawNextPiece() {
        // Limpiar canvas
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        // Dibujar siguiente pieza
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (this.nextPiece.shape[y][x]) {
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(
                        x * this.blockSize + 1,
                        y * this.blockSize + 1,
                        this.blockSize - 2,
                        this.blockSize - 2
                    );

                    // Efecto de brillo
                    this.nextCtx.fillStyle = '#fff';
                    this.nextCtx.globalAlpha = 0.2;
                    this.nextCtx.fillRect(
                        x * this.blockSize + 1,
                        y * this.blockSize + 1,
                        this.blockSize - 2,
                        2
                    );
                    this.nextCtx.globalAlpha = 1.0;
                }
            }
        }
    }

    gameLoop(timestamp) {
        if (this.gameState !== 'playing') return;

        if (timestamp - this.lastDrop > this.dropInterval) {
            if (!this.movePiece(0, 1)) {
                this.lockPiece();
            }
            this.lastDrop = timestamp;
        }

        this.draw();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
}

// Iniciar juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new TetrisGame();
}); 