import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLoop, MAX_FRAME_MS, STEP_MS, type VisibilitySource } from './loop.ts';

function fakeFrames() {
    let pending: FrameRequestCallback | null = null;
    let nextId = 0;
    return {
        request(callback: FrameRequestCallback) {
            pending = callback;
            return ++nextId;
        },
        cancel: vi.fn(() => {
            pending = null;
        }),
        tick(time: number) {
            const callback = pending;
            pending = null;
            callback?.(time);
        },
        get hasPending() {
            return pending !== null;
        }
    };
}

function fakeVisibility() {
    const listeners = new Set<() => void>();
    const source = {
        visibilityState: 'visible' as DocumentVisibilityState,
        addEventListener: (_: 'visibilitychange', listener: () => void) => listeners.add(listener),
        removeEventListener: (_: 'visibilitychange', listener: () => void) => listeners.delete(listener),
        hide() {
            source.visibilityState = 'hidden';
            listeners.forEach((listener) => listener());
        },
        show() {
            source.visibilityState = 'visible';
            listeners.forEach((listener) => listener());
        },
        get listenerCount() {
            return listeners.size;
        }
    };
    return source satisfies VisibilitySource;
}

function setup() {
    const frames = fakeFrames();
    const visibility = fakeVisibility();
    const update = vi.fn();
    const render = vi.fn();
    const onHidden = vi.fn();
    const loop = createLoop({
        update,
        render,
        onHidden,
        requestFrame: (callback) => frames.request(callback),
        cancelFrame: frames.cancel,
        visibility
    });
    return { frames, visibility, update, render, onHidden, loop };
}

describe('createLoop', () => {
    it('only renders on the first frame', () => {
        const { frames, update, render, loop } = setup();
        loop.start();
        frames.tick(1000);
        expect(update).not.toHaveBeenCalled();
        expect(render).toHaveBeenCalledTimes(1);
    });

    it('runs one fixed step per elapsed step and carries the remainder', () => {
        const { frames, update, loop } = setup();
        loop.start();
        frames.tick(0);
        frames.tick(STEP_MS * 3 + 1);
        expect(update).toHaveBeenCalledTimes(3);
        expect(update).toHaveBeenCalledWith(STEP_MS);
        frames.tick(STEP_MS * 4);
        expect(update).toHaveBeenCalledTimes(4);
    });

    it('caps catch-up after a long frame', () => {
        const { frames, update, loop } = setup();
        loop.start();
        frames.tick(0);
        frames.tick(10_000);
        expect(update).toHaveBeenCalledTimes(Math.round(MAX_FRAME_MS / STEP_MS));
    });

    it('notifies and does not catch up the hidden time when the page is hidden', () => {
        const { frames, visibility, update, onHidden, loop } = setup();
        loop.start();
        frames.tick(0);
        visibility.hide();
        expect(onHidden).toHaveBeenCalledTimes(1);

        frames.tick(5000);
        expect(update).not.toHaveBeenCalled();
        frames.tick(5000 + STEP_MS);
        expect(update).toHaveBeenCalledTimes(1);
    });

    it('ignores visibility changes to visible', () => {
        const { visibility, onHidden, loop } = setup();
        loop.start();
        visibility.show();
        expect(onHidden).not.toHaveBeenCalled();
    });

    it('ignores a second start', () => {
        const { frames, visibility, loop } = setup();
        loop.start();
        loop.start();
        expect(visibility.listenerCount).toBe(1);
        expect(frames.hasPending).toBe(true);
    });

    it('cancels the frame and the listener on stop', () => {
        const { frames, visibility, loop } = setup();
        loop.start();
        loop.stop();
        expect(frames.cancel).toHaveBeenCalledTimes(1);
        expect(frames.hasPending).toBe(false);
        expect(visibility.listenerCount).toBe(0);
    });

    it('can stop before starting', () => {
        const { frames, loop } = setup();
        loop.stop();
        expect(frames.cancel).not.toHaveBeenCalled();
    });

    describe('browser defaults', () => {
        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it('uses requestAnimationFrame and the document by default', () => {
            const frames = fakeFrames();
            const visibility = fakeVisibility();
            vi.stubGlobal('window', {
                requestAnimationFrame: (callback: FrameRequestCallback) => frames.request(callback),
                cancelAnimationFrame: frames.cancel
            });
            vi.stubGlobal('document', visibility);
            const update = vi.fn();
            const loop = createLoop({ update, render: vi.fn() });

            loop.start();
            frames.tick(0);
            frames.tick(STEP_MS);
            expect(update).toHaveBeenCalledTimes(1);
            expect(visibility.listenerCount).toBe(1);

            loop.stop();
            expect(frames.cancel).toHaveBeenCalledTimes(1);
            expect(visibility.listenerCount).toBe(0);
        });
    });
});
