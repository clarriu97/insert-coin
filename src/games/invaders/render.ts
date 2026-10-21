import type { Palette } from '../../engine/types.ts';
import {
    ALIEN_WIDTH,
    alienBox,
    alienKind,
    BUNKER_CELL,
    bunkerBox,
    COLS,
    GROUND_Y,
    MARGIN,
    PLAYER_WIDTH,
    PLAYER_Y,
    SAUCER_Y,
    SCREEN,
    SHOT_HEIGHT,
    type AlienKind,
    type InvadersState
} from './logic.ts';

type Sprite = readonly string[];

const FONT = '8px "Press Start 2P"';
const BLINK_MS = 100;

const ALIENS: Readonly<Record<AlienKind, readonly [Sprite, Sprite]>> = {
    small: [
        [
            '...XX...',
            '..XXXX..',
            '.X.XX.X.',
            'XXXXXXXX',
            '.XX..XX.',
            'X.XXXX.X',
            'X......X',
            '.X....X.'
        ],
        [
            '...XX...',
            '..XXXX..',
            '.X.XX.X.',
            'XXXXXXXX',
            '.XX..XX.',
            '..XXXX..',
            '.X....X.',
            'X......X'
        ]
    ],
    medium: [
        [
            '...X...X...',
            '....X.X....',
            '..XXXXXXX..',
            '.X.XXXXX.X.',
            'XXX.XXX.XXX',
            '.XXXXXXXXX.',
            '..X.X.X.X..',
            '.X.......X.'
        ],
        [
            '...X...X...',
            '....X.X....',
            '..XXXXXXX..',
            '.X.XXXXX.X.',
            'XXX.XXX.XXX',
            '.XXXXXXXXX.',
            '.X..X.X..X.',
            'X.........X'
        ]
    ],
    large: [
        [
            '....XXXX....',
            '..XXXXXXXX..',
            '.XXXXXXXXXX.',
            'XX..XXXX..XX',
            'XXXXXXXXXXXX',
            '.XX.X..X.XX.',
            'X..X....X..X',
            '.X........X.'
        ],
        [
            '....XXXX....',
            '..XXXXXXXX..',
            '.XXXXXXXXXX.',
            'XX..XXXX..XX',
            'XXXXXXXXXXXX',
            '.XX.X..X.XX.',
            '.X.X....X.X.',
            'X..........X'
        ]
    ]
};

const CANNON: Sprite = [
    '......X......',
    '.....XXX.....',
    '..X..XXX..X..',
    '.XXXXXXXXXXX.',
    'XXXXXXXXXXXXX',
    'XXXX.XXX.XXXX',
    'XXXXXXXXXXXXX',
    'XX.........XX'
];

const CANNON_WRECK: readonly [Sprite, Sprite] = [
    [
        '....X...X....',
        '.X....X...X..',
        '...X.X..X....',
        '.....XXX..X..',
        '.X.XXXXXXX...',
        '..XXXXXXXXX.X',
        '.XXXXXXXXXXX.',
        'XXXXXXXXXXXXX'
    ],
    [
        'X.....X....X.',
        '...X.....X...',
        '.X...X.X...X.',
        '.....XX......',
        '..XXXXXX.X...',
        '.XXXXXXXXXX..',
        'XXXXXXXXXXXXX',
        'XXXXXXXXXXXXX'
    ]
];

const SAUCER: Sprite = [
    '.....XXXXXX.....',
    '...XXXXXXXXXX...',
    '..XXXXXXXXXXXX..',
    '.XX.XX.XX.XX.XX.',
    'XXXXXXXXXXXXXXXX',
    '..XXX..XX..XXX..',
    '...X........X...'
];

const EXPLOSION: Sprite = [
    '.X...X..X...',
    '..X..X.X..X.',
    '...X....X...',
    'XX........XX',
    '...X....X...',
    '..X..X.X..X.',
    '.X..X...X..X',
    '............'
];

const BOMB: readonly [Sprite, Sprite] = [
    ['.X.', 'X..', '.X.', '..X', '.X.', 'X..', '.X.'],
    ['.X.', '..X', '.X.', 'X..', '.X.', '..X', '.X.']
];

function sprite(ctx: CanvasRenderingContext2D, pixels: Sprite, x: number, y: number, color: string) {
    ctx.fillStyle = color;
    const left = Math.round(x);
    const top = Math.round(y);
    pixels.forEach((line, dy) => {
        for (let dx = 0; dx < line.length; dx++) {
            if (line[dx] === 'X') ctx.fillRect(left + dx, top + dy, 1, 1);
        }
    });
}

function width(pixels: Sprite): number {
    return pixels[0]?.length ?? 0;
}

function drawAliens(ctx: CanvasRenderingContext2D, state: InvadersState, palette: Palette) {
    const frame = state.marches % 2;
    state.aliens.forEach((alive, index) => {
        if (!alive) return;
        const pixels = ALIENS[alienKind(Math.floor(index / COLS))][frame === 0 ? 0 : 1];
        const box = alienBox(state.formation, index);
        sprite(ctx, pixels, box.x + Math.floor((ALIEN_WIDTH - width(pixels)) / 2), box.y, palette.foreground);
    });
}

function drawBunkers(ctx: CanvasRenderingContext2D, state: InvadersState, palette: Palette) {
    ctx.fillStyle = palette.primary;
    for (const bunker of state.bunkers) {
        bunker.cells.forEach((alive, cell) => {
            if (!alive) return;
            const box = bunkerBox(bunker, cell);
            ctx.fillRect(Math.round(box.x), box.y, BUNKER_CELL, BUNKER_CELL);
        });
    }
}

function drawExplosions(ctx: CanvasRenderingContext2D, state: InvadersState, palette: Palette) {
    for (const explosion of state.explosions) {
        if (explosion.kind === 'alien') {
            sprite(ctx, EXPLOSION, explosion.x, explosion.y, palette.foreground);
            continue;
        }
        ctx.fillStyle = palette.danger;
        ctx.textAlign = 'center';
        ctx.fillText(String(explosion.points), Math.round(explosion.x + width(SAUCER) / 2), explosion.y);
    }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: InvadersState, palette: Palette) {
    if (state.mode === 'dying') {
        const wreck = CANNON_WRECK[Math.floor(state.modeMs / BLINK_MS) % 2 === 0 ? 0 : 1];
        sprite(ctx, wreck, state.player, PLAYER_Y, palette.primary);
        return;
    }
    if (state.mode === 'over') return;
    sprite(ctx, CANNON, state.player, PLAYER_Y, palette.primary);
}

function drawProjectiles(ctx: CanvasRenderingContext2D, state: InvadersState, palette: Palette) {
    if (state.shot) {
        ctx.fillStyle = palette.foreground;
        ctx.fillRect(Math.round(state.shot.x), Math.round(state.shot.y), 1, SHOT_HEIGHT);
    }
    for (const bomb of state.bombs) {
        sprite(ctx, BOMB[Math.floor(bomb.y / 4) % 2 === 0 ? 0 : 1], bomb.x, bomb.y, palette.danger);
    }
    if (state.saucer) {
        sprite(ctx, SAUCER, state.saucer.x, SAUCER_Y, palette.danger);
    }
}

function drawHud(ctx: CanvasRenderingContext2D, state: InvadersState, palette: Palette) {
    ctx.fillStyle = palette.accent;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${String(state.score).padStart(5, '0')}`, MARGIN, MARGIN);
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE ${state.wave}`, SCREEN.width - MARGIN, MARGIN);

    ctx.fillStyle = palette.primary;
    ctx.fillRect(0, GROUND_Y, SCREEN.width, 1);
    ctx.fillStyle = palette.accent;
    ctx.textAlign = 'left';
    ctx.fillText(String(state.lives), MARGIN, GROUND_Y + 12);
    for (let life = 0; life < Math.min(state.lives - 1, 5); life++) {
        sprite(ctx, CANNON, MARGIN + 16 + life * (PLAYER_WIDTH + 3), GROUND_Y + 8, palette.primary);
    }
}

function drawBanner(ctx: CanvasRenderingContext2D, text: string, color: string) {
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, SCREEN.width / 2, SCREEN.height / 2);
}

export function render(ctx: CanvasRenderingContext2D, state: InvadersState, palette: Palette) {
    ctx.imageSmoothingEnabled = false;
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);

    drawBunkers(ctx, state, palette);
    drawAliens(ctx, state, palette);
    drawExplosions(ctx, state, palette);
    drawProjectiles(ctx, state, palette);
    drawPlayer(ctx, state, palette);
    drawHud(ctx, state, palette);

    if (state.mode === 'cleared') {
        drawBanner(ctx, `WAVE ${state.wave} CLEAR`, palette.accent);
    }
}
