import { useEffect, useState } from 'react';

export const IDLE_MS = 20000;
const POINTER_MOVE_RESET_MS = 1000;
const SWALLOW_CLICK_MS = 500;
const ACTIVE_EVENTS = ['keydown', 'pointerdown', 'focusin'] as const;
const PASSIVE_EVENTS = ['pointermove', 'wheel', 'touchstart'] as const;

function prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function useAttractMode(): boolean {
    const [attract, setAttract] = useState(false);

    useEffect(() => {
        if (prefersReducedMotion()) return;

        let attracting = false;
        let swallowClickUntil = 0;
        let armedAt = 0;
        let timer = 0;

        const arm = () => {
            window.clearTimeout(timer);
            armedAt = performance.now();
            timer = window.setTimeout(() => {
                attracting = true;
                setAttract(true);
            }, IDLE_MS);
        };

        const wake = () => {
            if (!attracting) return false;
            attracting = false;
            setAttract(false);
            return true;
        };

        const onActive = (event: Event) => {
            const woke = wake();
            arm();
            if (!woke || event.type === 'focusin') return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.type === 'pointerdown') {
                swallowClickUntil = performance.now() + SWALLOW_CLICK_MS;
            }
        };

        const onPassive = (event: Event) => {
            const woke = wake();
            if (woke || event.type !== 'pointermove' || performance.now() - armedAt > POINTER_MOVE_RESET_MS) {
                arm();
            }
        };

        const onClick = (event: Event) => {
            if (performance.now() < swallowClickUntil) {
                swallowClickUntil = 0;
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        };

        arm();
        ACTIVE_EVENTS.forEach((type) => window.addEventListener(type, onActive, { capture: true }));
        PASSIVE_EVENTS.forEach((type) => window.addEventListener(type, onPassive, { capture: true, passive: true }));
        window.addEventListener('click', onClick, { capture: true });
        return () => {
            window.clearTimeout(timer);
            ACTIVE_EVENTS.forEach((type) => window.removeEventListener(type, onActive, { capture: true }));
            PASSIVE_EVENTS.forEach((type) => window.removeEventListener(type, onPassive, { capture: true }));
            window.removeEventListener('click', onClick, { capture: true });
        };
    }, []);

    return attract;
}
