import type { Rng } from './rng.ts';

export type Button = 'up' | 'down' | 'left' | 'right' | 'action' | 'secondary' | 'tertiary' | 'pause' | 'back' | 'start';

export interface InputFrame {
    held: ReadonlySet<Button>;
    pressed: ReadonlySet<Button>;
}

export interface HudField {
    label: string;
    value: string | number;
}

export interface GameStatus {
    score: number;
    over: boolean;
    hud: HudField[];
}

export interface ControlHint {
    keys: string;
    action: string;
}

export interface Palette {
    background: string;
    foreground: string;
    accent: string;
    danger: string;
    muted: string;
}

export interface Screen {
    width: number;
    height: number;
}

export interface GameDefinition<S> {
    id: string;
    title: string;
    screen: Screen;
    controls: ControlHint[];
    create(rng: Rng): S;
    step(state: S, input: InputFrame, dtMs: number): S;
    render(ctx: CanvasRenderingContext2D, state: S, palette: Palette): void;
    status(state: S): GameStatus;
}
