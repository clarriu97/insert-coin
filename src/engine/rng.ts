export interface Rng {
    next(): number;
    int(maxExclusive: number): number;
}

export function createRng(seed: number): Rng {
    let state = seed >>> 0;
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        next,
        int: (maxExclusive) => Math.floor(next() * maxExclusive)
    };
}

export function randomSeed(): number {
    return Math.floor(Math.random() * 4294967296);
}
