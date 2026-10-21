import { describe, expect, it } from 'vitest';
import { createEntry, entryText, updateEntry, type InitialsEntry } from './initials.ts';
import type { Button } from './types.ts';

function press(entry: InitialsEntry, ...buttons: Button[]): InitialsEntry {
    return buttons.reduce((current, button) => updateEntry(current, new Set([button])), entry);
}

describe('initials entry', () => {
    it('starts at AAA on the first letter', () => {
        expect(entryText(createEntry())).toBe('AAA');
        expect(createEntry().position).toBe(0);
    });

    it('cycles letters up and down with wrap-around', () => {
        expect(entryText(press(createEntry(), 'up', 'up'))).toBe('CAA');
        expect(entryText(press(createEntry(), 'down'))).toBe('ZAA');
    });

    it('moves between positions within bounds', () => {
        const entry = press(createEntry(), 'left', 'right', 'right', 'right', 'up');
        expect(entry.position).toBe(2);
        expect(entryText(entry)).toBe('AAB');
    });

    it('advances with action and finishes on the last letter', () => {
        const entry = press(createEntry(), 'up', 'action', 'up', 'up', 'action', 'down');
        expect(entry.done).toBe(false);
        const done = press(entry, 'action');
        expect(done.done).toBe(true);
        expect(entryText(done)).toBe('BCZ');
    });

    it('finishes immediately with start', () => {
        expect(press(createEntry(), 'start').done).toBe(true);
    });

    it('applies a letter change pressed in the same frame as confirm', () => {
        const done = updateEntry(createEntry(), new Set<Button>(['up', 'start']));
        expect(done.done).toBe(true);
        expect(entryText(done)).toBe('BAA');
    });

    it('ignores input once done', () => {
        const done = press(createEntry(), 'start');
        expect(press(done, 'up')).toBe(done);
    });
});
