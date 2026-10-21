import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PALETTE } from './palette.ts';

const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function token(name: string): string | undefined {
    return new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(tokens)?.[1];
}

describe('palette', () => {
    it.each([
        ['background', 'crt-black'],
        ['foreground', 'phosphor-white'],
        ['accent', 'phosphor-amber'],
        ['danger', 'phosphor-magenta'],
        ['muted', 'phosphor-dim'],
        ['primary', 'phosphor-green'],
        ['secondary', 'phosphor-cyan']
    ] as const)('mirrors %s from the --%s token', (field, name) => {
        expect(DEFAULT_PALETTE[field]).toBe(token(name));
    });
});
