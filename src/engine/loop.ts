export const STEP_MS = 1000 / 60;
export const MAX_FRAME_MS = 250;
const FLOAT_TOLERANCE_MS = 1e-6;

export interface VisibilitySource {
    readonly visibilityState: DocumentVisibilityState;
    addEventListener(type: 'visibilitychange', listener: () => void): void;
    removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export interface LoopOptions {
    update(dtMs: number): void;
    render(): void;
    onHidden?(): void;
    requestFrame?: (callback: FrameRequestCallback) => number;
    cancelFrame?: (id: number) => void;
    visibility?: VisibilitySource;
}

export interface Loop {
    start(): void;
    stop(): void;
}

export function createLoop({
    update,
    render,
    onHidden,
    requestFrame = (callback) => window.requestAnimationFrame(callback),
    cancelFrame = (id) => window.cancelAnimationFrame(id),
    visibility = document
}: LoopOptions): Loop {
    let frameId: number | null = null;
    let lastTime: number | null = null;
    let accumulator = 0;

    const frame = (time: number) => {
        frameId = requestFrame(frame);
        if (lastTime !== null) {
            accumulator += Math.min(time - lastTime, MAX_FRAME_MS);
            while (accumulator >= STEP_MS - FLOAT_TOLERANCE_MS) {
                update(STEP_MS);
                accumulator -= STEP_MS;
            }
        }
        lastTime = time;
        render();
    };

    const onVisibilityChange = () => {
        if (visibility.visibilityState === 'hidden') {
            lastTime = null;
            accumulator = 0;
            onHidden?.();
        }
    };

    return {
        start() {
            if (frameId !== null) return;
            visibility.addEventListener('visibilitychange', onVisibilityChange);
            frameId = requestFrame(frame);
        },
        stop() {
            if (frameId !== null) {
                cancelFrame(frameId);
            }
            visibility.removeEventListener('visibilitychange', onVisibilityChange);
            frameId = null;
            lastTime = null;
            accumulator = 0;
        }
    };
}
