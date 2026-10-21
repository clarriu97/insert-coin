import type { Button } from './types.ts';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const INITIALS_LENGTH = 3;

export interface InitialsEntry {
    letters: number[];
    position: number;
    done: boolean;
}

export function createEntry(): InitialsEntry {
    return { letters: Array.from({ length: INITIALS_LENGTH }, () => 0), position: 0, done: false };
}

function cycle(value: number, delta: number): number {
    return (value + delta + ALPHABET.length) % ALPHABET.length;
}

export function updateEntry(entry: InitialsEntry, pressed: ReadonlySet<Button>): InitialsEntry {
    if (entry.done) return entry;
    const letterDelta = (pressed.has('up') ? 1 : 0) - (pressed.has('down') ? 1 : 0);
    const positionDelta = (pressed.has('right') ? 1 : 0) - (pressed.has('left') ? 1 : 0);
    const letters = entry.letters.map((letter, index) => (index === entry.position ? cycle(letter, letterDelta) : letter));
    const position = Math.min(INITIALS_LENGTH - 1, Math.max(0, entry.position + positionDelta));
    const edited = { ...entry, letters, position };
    if (pressed.has('start')) {
        return { ...edited, done: true };
    }
    if (pressed.has('action')) {
        return position === INITIALS_LENGTH - 1 ? { ...edited, done: true } : { ...edited, position: position + 1 };
    }
    return edited;
}

export function entryText(entry: InitialsEntry): string {
    return entry.letters.map((letter) => ALPHABET[letter]).join('');
}
