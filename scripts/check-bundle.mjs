import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const ENTRY_BUDGET_KB = 120;
const CHUNK_BUDGET_KB = 30;
const assets = join(import.meta.dirname, '..', 'dist', 'assets');
const html = readFileSync(join(import.meta.dirname, '..', 'dist', 'index.html'), 'utf8');
const entry = html.match(/assets\/([^"]+\.js)/)?.[1];

const sizes = readdirSync(assets)
    .filter((file) => file.endsWith('.js'))
    .map((file) => ({ file, kb: gzipSync(readFileSync(join(assets, file))).length / 1024 }));

const failures = sizes.filter(({ file, kb }) => kb > (file === entry ? ENTRY_BUDGET_KB : CHUNK_BUDGET_KB));

for (const { file, kb } of sizes) {
    const budget = file === entry ? ENTRY_BUDGET_KB : CHUNK_BUDGET_KB;
    console.log(`${kb.toFixed(1).padStart(7)} kB gzip / ${budget} kB  ${file}`);
}

if (!entry || failures.length > 0) {
    console.error(entry ? `Over budget: ${failures.map(({ file }) => file).join(', ')}` : 'Entry chunk not found');
    process.exit(1);
}
