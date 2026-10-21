import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcDir = new URL('..', import.meta.url).pathname;
const RAW_COLOR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;

const stylesheets = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.css') && !file.endsWith('tokens.css'));

describe('design tokens', () => {
    it('finds the stylesheets', () => {
        expect(stylesheets.length).toBeGreaterThan(3);
    });

    it.each(stylesheets)('%s uses tokens instead of raw colours', (file) => {
        const offending = readFileSync(join(srcDir, file), 'utf8')
            .split('\n')
            .filter((line) => RAW_COLOR.test(line));
        expect(offending).toEqual([]);
    });
});
