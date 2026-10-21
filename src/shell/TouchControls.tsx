import type { PointerEvent } from 'react';
import type { Button } from '../engine/types.ts';

interface TouchControlsProps {
    onPress(button: Button, source: string): void;
    onRelease(button: Button, source: string): void;
}

interface PadButton {
    button: Button;
    label: string;
    className: string;
}

const DIRECTIONS: PadButton[] = [
    { button: 'up', label: '▲', className: 'pad-up' },
    { button: 'left', label: '◀', className: 'pad-left' },
    { button: 'right', label: '▶', className: 'pad-right' },
    { button: 'down', label: '▼', className: 'pad-down' }
];

const ACTIONS: PadButton[] = [
    { button: 'tertiary', label: 'C', className: 'act-c' },
    { button: 'secondary', label: 'B', className: 'act-b' },
    { button: 'action', label: 'A', className: 'act-a' }
];

const SYSTEM: PadButton[] = [
    { button: 'pause', label: 'PAUSE', className: 'sys-pause' },
    { button: 'start', label: 'START', className: 'sys-start' }
];

export function TouchControls({ onPress, onRelease }: TouchControlsProps) {
    const handlers = (button: Button) => {
        const release = (event: PointerEvent<HTMLButtonElement>) => onRelease(button, `pointer-${event.pointerId}`);
        return {
            onPointerDown(event: PointerEvent<HTMLButtonElement>) {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                onPress(button, `pointer-${event.pointerId}`);
            },
            onPointerUp: release,
            onPointerCancel: release,
            onLostPointerCapture: release,
            onContextMenu(event: PointerEvent<HTMLButtonElement>) {
                event.preventDefault();
            }
        };
    };

    const render = ({ button, label, className }: PadButton) => (
        <button key={button} type="button" className={`touch-btn ${className}`} aria-label={button} tabIndex={-1} {...handlers(button)}>
            {label}
        </button>
    );

    return (
        <div className="touch-controls" aria-label="touch controls">
            <div className="touch-pad">{DIRECTIONS.map(render)}</div>
            <div className="touch-system">{SYSTEM.map(render)}</div>
            <div className="touch-actions">{ACTIONS.map(render)}</div>
        </div>
    );
}
