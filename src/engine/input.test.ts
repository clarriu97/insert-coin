import { describe, expect, it } from 'vitest';
import { createInput, emptyFrame } from './input.ts';

function key(type: 'keydown' | 'keyup', code: string, repeat = false) {
    return Object.assign(new Event(type, { cancelable: true }), { code, repeat });
}

function setup() {
    const target = new EventTarget();
    const input = createInput(target);
    const send = (type: 'keydown' | 'keyup', code: string, repeat = false) => {
        const event = key(type, code, repeat);
        target.dispatchEvent(event);
        return event;
    };
    return { target, input, send };
}

describe('createInput', () => {
    it('reports a key as pressed once and held until released', () => {
        const { input, send } = setup();
        send('keydown', 'ArrowLeft');

        const first = input.frame();
        expect(first.pressed.has('left')).toBe(true);
        expect(first.held.has('left')).toBe(true);

        const second = input.frame();
        expect(second.pressed.has('left')).toBe(false);
        expect(second.held.has('left')).toBe(true);

        send('keyup', 'ArrowLeft');
        expect(input.frame().held.has('left')).toBe(false);
    });

    it('maps alternative keys to the same button', () => {
        const { input, send } = setup();
        send('keydown', 'KeyW');
        send('keydown', 'Space');
        send('keydown', 'KeyZ');
        send('keydown', 'KeyC');
        send('keydown', 'KeyP');
        send('keydown', 'KeyM');
        send('keydown', 'Escape');
        send('keydown', 'Enter');
        expect([...input.frame().pressed].sort()).toEqual(['action', 'back', 'mute', 'pause', 'secondary', 'start', 'tertiary', 'up']);
    });

    it('keeps a quick tap visible in the next frame', () => {
        const { input, send } = setup();
        send('keydown', 'Space');
        send('keyup', 'Space');
        const frame = input.frame();
        expect(frame.pressed.has('action')).toBe(true);
        expect(frame.held.has('action')).toBe(false);
    });

    it('ignores key repeat', () => {
        const { input, send } = setup();
        send('keydown', 'ArrowDown');
        input.frame();
        send('keydown', 'ArrowDown', true);
        expect(input.frame().pressed.size).toBe(0);
    });

    it('prevents the default action only for bound keys', () => {
        const { send } = setup();
        expect(send('keydown', 'ArrowUp').defaultPrevented).toBe(true);
        expect(send('keydown', 'KeyQ').defaultPrevented).toBe(false);
    });

    it('ignores keys typed into editable elements', () => {
        const field = Object.assign(new EventTarget(), { tagName: 'INPUT' });
        const editor = Object.assign(new EventTarget(), { tagName: 'DIV', isContentEditable: true });
        const input = createInput(field);
        createInput(editor);
        const event = key('keydown', 'Space');
        field.dispatchEvent(event);
        editor.dispatchEvent(key('keydown', 'Space'));
        expect(event.defaultPrevented).toBe(false);
        expect(input.frame().pressed.size).toBe(0);
    });

    it('keeps a button held while another key for it is still down', () => {
        const { input, send } = setup();
        send('keydown', 'ArrowLeft');
        send('keydown', 'KeyA');
        send('keyup', 'ArrowLeft');
        expect(input.frame().held.has('left')).toBe(true);
        send('keyup', 'KeyA');
        expect(input.frame().held.has('left')).toBe(false);
    });

    it('keeps keyboard and touch holds independent', () => {
        const { input, send } = setup();
        send('keydown', 'Space');
        input.press('action');
        input.release('action');
        expect(input.frame().held.has('action')).toBe(true);
        input.press('action', 'touch-a');
        send('keyup', 'Space');
        expect(input.frame().held.has('action')).toBe(true);
    });

    it('lets focused buttons and links handle activation keys', () => {
        const button = Object.assign(new EventTarget(), { tagName: 'BUTTON' });
        const input = createInput(button);
        const enter = key('keydown', 'Enter');
        button.dispatchEvent(enter);
        button.dispatchEvent(key('keydown', 'Space'));
        expect(enter.defaultPrevented).toBe(false);
        expect(input.frame().pressed.size).toBe(0);

        const escape = key('keydown', 'Escape');
        button.dispatchEvent(escape);
        expect(escape.defaultPrevented).toBe(true);
        expect(input.frame().pressed.has('back')).toBe(true);
    });

    it('ignores unbound key releases', () => {
        const { input, send } = setup();
        send('keydown', 'ArrowUp');
        send('keyup', 'KeyQ');
        expect(input.frame().held.has('up')).toBe(true);
    });

    it('releases everything when the window loses focus', () => {
        const { target, input, send } = setup();
        send('keydown', 'ArrowRight');
        target.dispatchEvent(new Event('blur'));
        expect(input.frame().held.size).toBe(0);
    });

    it('accepts programmatic presses from touch controls', () => {
        const { input } = setup();
        input.press('action');
        input.press('action');
        expect(input.frame().pressed.has('action')).toBe(true);
        expect(input.frame().held.has('action')).toBe(true);
        input.release('action');
        expect(input.frame().held.has('action')).toBe(false);
    });

    it('stops listening after dispose', () => {
        const { input, send } = setup();
        send('keydown', 'ArrowUp');
        input.dispose();
        send('keydown', 'ArrowDown');
        const frame = input.frame();
        expect(frame.held.size).toBe(0);
        expect(frame.pressed.size).toBe(0);
    });
});

describe('emptyFrame', () => {
    it('has nothing held or pressed', () => {
        const frame = emptyFrame();
        expect(frame.held.size + frame.pressed.size).toBe(0);
    });
});
