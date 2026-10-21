import type { Button, InputFrame } from './types.ts';

export const KEY_BINDINGS: Readonly<Record<string, Button>> = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    Space: 'action',
    KeyJ: 'action',
    KeyZ: 'secondary',
    KeyX: 'secondary',
    KeyK: 'secondary',
    KeyC: 'tertiary',
    ShiftLeft: 'tertiary',
    ShiftRight: 'tertiary',
    KeyL: 'tertiary',
    KeyP: 'pause',
    KeyM: 'mute',
    Escape: 'back',
    Enter: 'start'
};

export const VIRTUAL_SOURCE = 'virtual';

export interface Input {
    frame(): InputFrame;
    press(button: Button, source?: string): void;
    release(button: Button, source?: string): void;
    dispose(): void;
}

const EDITABLE_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
const ACTIVATABLE_TAGS = ['BUTTON', 'A'];
const ACTIVATION_KEYS = ['Enter', 'Space'];

type MaybeElement = Partial<Pick<HTMLElement, 'tagName' | 'isContentEditable'>> | null;

function belongsToElement(target: EventTarget | null, code: string): boolean {
    const element = target as MaybeElement;
    const tagName = element?.tagName ?? '';
    return element?.isContentEditable === true
        || EDITABLE_TAGS.includes(tagName)
        || (ACTIVATABLE_TAGS.includes(tagName) && ACTIVATION_KEYS.includes(code));
}

export function createInput(target: EventTarget = window): Input {
    const holders = new Map<Button, Set<string>>();
    let pressed = new Set<Button>();

    const press = (button: Button, source = VIRTUAL_SOURCE) => {
        const sources = holders.get(button) ?? new Set();
        if (sources.size === 0) {
            pressed.add(button);
        }
        sources.add(source);
        holders.set(button, sources);
    };

    const release = (button: Button, source = VIRTUAL_SOURCE) => {
        holders.get(button)?.delete(source);
    };

    const onKeyDown = (event: Event) => {
        const { code, repeat } = event as KeyboardEvent;
        const button = KEY_BINDINGS[code];
        if (!button || belongsToElement(event.target, code)) return;
        event.preventDefault();
        if (!repeat) {
            press(button, code);
        }
    };

    const onKeyUp = (event: Event) => {
        const { code } = event as KeyboardEvent;
        const button = KEY_BINDINGS[code];
        if (button) {
            release(button, code);
        }
    };

    const onBlur = () => holders.clear();

    const held = () => new Set([...holders].filter(([, sources]) => sources.size > 0).map(([button]) => button));

    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('blur', onBlur);

    return {
        frame() {
            const frame = { held: held(), pressed };
            pressed = new Set();
            return frame;
        },
        press,
        release,
        dispose() {
            target.removeEventListener('keydown', onKeyDown);
            target.removeEventListener('keyup', onKeyUp);
            target.removeEventListener('blur', onBlur);
            holders.clear();
            pressed.clear();
        }
    };
}

export function emptyFrame(): InputFrame {
    return { held: new Set(), pressed: new Set() };
}
