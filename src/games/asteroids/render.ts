import type { Palette } from '../../engine/types.ts';
import { SCREEN, type Asteroid, type AsteroidsState, type Body, type Saucer, type Ship } from './logic.ts';

const FONT = '8px "Press Start 2P"';
const GLOW = 4;
const BLINK_MS = 120;
const FLICKER_MS = 50;
const LIFE_ICON_SCALE = 0.7;

const SHIP_OUTLINE: readonly (readonly [number, number])[] = [[0, -8], [5, 6], [0, 3], [-5, 6]];
const FLAME: readonly (readonly [number, number])[] = [[-3, 5], [0, 11], [3, 5]];
const SHORT_FLAME: readonly (readonly [number, number])[] = [[-2, 5], [0, 8], [2, 5]];

function stroke(ctx: CanvasRenderingContext2D, color: string, draw: () => void) {
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.beginPath();
    draw();
    ctx.stroke();
}

function copies(body: Body): { x: number; y: number }[] {
    const xs = [body.x];
    const ys = [body.y];
    if (body.x < body.radius) xs.push(body.x + SCREEN.width);
    if (body.x > SCREEN.width - body.radius) xs.push(body.x - SCREEN.width);
    if (body.y < body.radius) ys.push(body.y + SCREEN.height);
    if (body.y > SCREEN.height - body.radius) ys.push(body.y - SCREEN.height);
    return xs.flatMap((x) => ys.map((y) => ({ x, y })));
}

function polyline(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], x: number, y: number, angle: number, scale: number, closed: boolean) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    points.forEach(([px, py], index) => {
        const tx = x + (px * cos - py * sin) * scale;
        const ty = y + (px * sin + py * cos) * scale;
        if (index === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
    });
    if (closed) ctx.closePath();
}

function rockPath(ctx: CanvasRenderingContext2D, target: Asteroid) {
    const step = (Math.PI * 2) / target.shape.length;
    const points = target.shape.map((scale, index): [number, number] => {
        const angle = index * step;
        return [Math.cos(angle) * target.radius * scale, Math.sin(angle) * target.radius * scale];
    });
    for (const { x, y } of copies(target)) {
        polyline(ctx, points, x, y, target.angle, 1, true);
    }
}

function shipPath(ctx: CanvasRenderingContext2D, ship: Ship, flicker: boolean) {
    for (const { x, y } of copies(ship)) {
        polyline(ctx, SHIP_OUTLINE, x, y, ship.angle, 1, true);
        if (ship.thrusting) polyline(ctx, flicker ? FLAME : SHORT_FLAME, x, y, ship.angle, 1, false);
    }
}

function saucerPath(ctx: CanvasRenderingContext2D, saucer: Saucer) {
    const r = saucer.radius;
    const { x, y } = saucer;
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.5, y + r * 0.45);
    ctx.lineTo(x - r * 0.5, y + r * 0.45);
    ctx.closePath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x - r * 0.5, y - r * 0.35);
    ctx.lineTo(x + r * 0.5, y - r * 0.35);
    ctx.lineTo(x + r, y);
    ctx.moveTo(x - r * 0.3, y - r * 0.35);
    ctx.lineTo(x - r * 0.15, y - r * 0.75);
    ctx.lineTo(x + r * 0.15, y - r * 0.75);
    ctx.lineTo(x + r * 0.3, y - r * 0.35);
}

function dots(ctx: CanvasRenderingContext2D, bullets: readonly Body[]) {
    for (const { x, y } of bullets) {
        ctx.moveTo(x - 1, y);
        ctx.lineTo(x + 1, y);
        ctx.moveTo(x, y - 1);
        ctx.lineTo(x, y + 1);
    }
}

function debrisPath(ctx: CanvasRenderingContext2D, state: AsteroidsState) {
    for (const piece of state.debris) {
        const dx = Math.cos(piece.angle) * piece.length / 2;
        const dy = Math.sin(piece.angle) * piece.length / 2;
        ctx.moveTo(piece.x - dx, piece.y - dy);
        ctx.lineTo(piece.x + dx, piece.y + dy);
    }
}

function hud(ctx: CanvasRenderingContext2D, state: AsteroidsState, palette: Palette) {
    ctx.shadowBlur = 0;
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.accent;
    ctx.fillText(String(state.score).padStart(2, '0'), 8, 8);
    stroke(ctx, palette.foreground, () => {
        for (let index = 0; index < Math.min(state.lives, 8); index++) {
            polyline(ctx, SHIP_OUTLINE, 12 + index * 9, 28, 0, LIFE_ICON_SCALE, true);
        }
    });
    if (state.waveMs > 0) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`WAVE ${state.wave + 1}`, SCREEN.width / 2, SCREEN.height / 3);
    }
}

export function render(ctx: CanvasRenderingContext2D, state: AsteroidsState, palette: Palette) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowBlur = GLOW;

    stroke(ctx, palette.foreground, () => state.asteroids.forEach((target) => rockPath(ctx, target)));

    const ship = state.ship;
    const blinking = state.invulnerableMs > 0 && Math.floor(state.elapsedMs / BLINK_MS) % 2 === 1;
    if (ship && !blinking) {
        stroke(ctx, palette.foreground, () => shipPath(ctx, ship, Math.floor(state.elapsedMs / FLICKER_MS) % 2 === 0));
    }

    const saucer = state.saucer;
    if (saucer) stroke(ctx, palette.danger, () => saucerPath(ctx, saucer));
    stroke(ctx, palette.secondary, () => dots(ctx, state.bullets));
    stroke(ctx, palette.danger, () => dots(ctx, state.saucerBullets));

    ctx.globalAlpha = 0.85;
    stroke(ctx, palette.foreground, () => debrisPath(ctx, state));
    ctx.globalAlpha = 1;

    hud(ctx, state, palette);
}
