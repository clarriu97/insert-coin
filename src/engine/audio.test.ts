import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    appAudio,
    AUDIO_STORAGE_KEY,
    browserAudioContext,
    createAudio,
    EFFECTS,
    MASTER_VOLUME,
    type AudioContextLike,
    type SoundName
} from './audio.ts';
import type { ScoreStorage } from './highscores.ts';

interface ParamCall {
    method: string;
    value: number;
    time: number;
}

function fakeParam() {
    const calls: ParamCall[] = [];
    const record = (method: string) => (value: number, time: number) => {
        calls.push({ method, value, time });
    };
    return {
        value: 0,
        calls,
        setValueAtTime: record('set'),
        exponentialRampToValueAtTime: record('ramp')
    };
}

function fakeNode() {
    return { connect: vi.fn() };
}

function fakeContext(state: AudioContextState = 'suspended') {
    const oscillators: { type: string; frequency: ReturnType<typeof fakeParam>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
    const gains: { gain: ReturnType<typeof fakeParam>; connect: ReturnType<typeof vi.fn> }[] = [];
    const filters: { type: string; frequency: ReturnType<typeof fakeParam> }[] = [];
    const sources: { buffer: unknown; loop: boolean; start: ReturnType<typeof vi.fn> }[] = [];
    const buffers: Float32Array[] = [];
    const context = {
        currentTime: 2,
        sampleRate: 100,
        state,
        destination: fakeNode(),
        resume: vi.fn(() => Promise.resolve()),
        createGain() {
            const gain = { ...fakeNode(), gain: fakeParam() };
            gains.push(gain);
            return gain;
        },
        createOscillator() {
            const oscillator = { ...fakeNode(), type: 'sine', frequency: fakeParam(), start: vi.fn(), stop: vi.fn() };
            oscillators.push(oscillator);
            return oscillator;
        },
        createBuffer(_channels: number, length: number) {
            const samples = new Float32Array(length);
            buffers.push(samples);
            return { getChannelData: () => samples };
        },
        createBufferSource() {
            const source = { ...fakeNode(), buffer: null, loop: false, start: vi.fn(), stop: vi.fn() };
            sources.push(source);
            return source;
        },
        createBiquadFilter() {
            const filter = { ...fakeNode(), type: 'allpass', frequency: fakeParam() };
            filters.push(filter);
            return filter;
        }
    };
    return { context: context as unknown as AudioContextLike, raw: context, oscillators, gains, filters, sources, buffers };
}

function memoryStorage(initial: Record<string, string> = {}): ScoreStorage & { data: Record<string, string> } {
    const data = { ...initial };
    return {
        data,
        getItem: (key) => data[key] ?? null,
        setItem: (key, value) => {
            data[key] = value;
        }
    };
}

describe('createAudio', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('creates the context lazily and only once', () => {
        const fake = fakeContext();
        const createContext = vi.fn(() => fake.context);
        const audio = createAudio({ createContext, storage: memoryStorage() });
        expect(createContext).not.toHaveBeenCalled();

        audio.play('coin');
        audio.play('select');
        expect(createContext).toHaveBeenCalledTimes(1);
    });

    it('routes everything through a quiet master gain', () => {
        const fake = fakeContext();
        const audio = createAudio({ createContext: () => fake.context, storage: memoryStorage() });
        audio.unlock();
        const [master] = fake.gains;
        expect(master?.gain.value).toBe(MASTER_VOLUME);
        expect(MASTER_VOLUME).toBeLessThanOrEqual(0.2);
        expect(master?.connect).toHaveBeenCalledWith(fake.raw.destination);
    });

    it('resumes a suspended context on unlock and on play', () => {
        const fake = fakeContext('suspended');
        const audio = createAudio({ createContext: () => fake.context, storage: memoryStorage() });
        audio.unlock();
        audio.play('move');
        expect(fake.raw.resume).toHaveBeenCalledTimes(2);
    });

    it('does not resume a running context', () => {
        const fake = fakeContext('running');
        const audio = createAudio({ createContext: () => fake.context, storage: memoryStorage() });
        audio.unlock();
        expect(fake.raw.resume).not.toHaveBeenCalled();
    });

    it('tolerates a rejected resume', async () => {
        const fake = fakeContext('suspended');
        fake.raw.resume.mockImplementation(() => Promise.reject(new Error('blocked')));
        const audio = createAudio({ createContext: () => fake.context, storage: memoryStorage() });
        audio.unlock();
        await Promise.resolve();
        expect(fake.raw.resume).toHaveBeenCalled();
    });

    it('plays an arpeggio as stepped notes with an envelope', () => {
        const fake = fakeContext();
        const audio = createAudio({ createContext: () => fake.context, storage: memoryStorage() });
        audio.play('start');

        const [oscillator] = fake.oscillators;
        const { notes, durationMs, volume } = EFFECTS.start;
        const duration = durationMs / 1000;
        expect(oscillator?.type).toBe('square');
        expect(oscillator?.frequency.calls.map((call) => call.value)).toEqual([notes[0], ...notes]);
        expect(oscillator?.frequency.calls.at(-1)?.time).toBeCloseTo(2 + (duration * 3) / 4);
        expect(oscillator?.start).toHaveBeenCalledWith(2);
        expect(oscillator?.stop).toHaveBeenCalledWith(2 + duration);

        const envelope = fake.gains[1];
        expect(envelope?.gain.calls.map((call) => call.method)).toEqual(['set', 'ramp', 'ramp']);
        expect(envelope?.gain.calls[1]?.value).toBe(volume);
        expect(envelope?.connect).toHaveBeenCalledWith(fake.gains[0]);
    });

    it('glides from the first to the last note', () => {
        const fake = fakeContext();
        const audio = createAudio({ createContext: () => fake.context, storage: memoryStorage() });
        audio.play('die');
        const [oscillator] = fake.oscillators;
        expect(oscillator?.type).toBe('sawtooth');
        expect(oscillator?.frequency.calls).toEqual([
            { method: 'set', value: 440, time: 2 },
            { method: 'ramp', value: 55, time: 2 + EFFECTS.die.durationMs / 1000 }
        ]);
    });

    it('plays noise through a lowpass filter and reuses the noise buffer', () => {
        const fake = fakeContext();
        const audio = createAudio({ createContext: () => fake.context, storage: memoryStorage() });
        audio.play('explode');
        audio.play('thrust');

        expect(fake.buffers).toHaveLength(1);
        const samples = [...(fake.buffers[0] ?? [])];
        expect(samples).toHaveLength(100);
        expect(samples.every((sample) => sample >= -1 && sample <= 1)).toBe(true);
        expect(fake.sources).toHaveLength(2);
        expect(fake.sources[0]?.loop).toBe(true);
        expect(fake.sources[0]?.buffer).toBe(fake.sources[1]?.buffer);
        expect(fake.filters[0]?.type).toBe('lowpass');
        expect(fake.filters[0]?.frequency.calls.map((call) => call.method)).toEqual(['set', 'ramp']);
        expect(fake.oscillators).toHaveLength(0);
    });

    it('can play every named effect', () => {
        const fake = fakeContext();
        const audio = createAudio({ createContext: () => fake.context, storage: memoryStorage() });
        const names = Object.keys(EFFECTS) as SoundName[];
        names.forEach((name) => audio.play(name));
        expect(fake.oscillators.length + fake.sources.length).toBe(names.length);
    });

    it('is silent when muted', () => {
        const fake = fakeContext();
        const createContext = vi.fn(() => fake.context);
        const audio = createAudio({ createContext, storage: memoryStorage() });
        audio.setMuted(true);
        audio.play('coin');
        expect(createContext).not.toHaveBeenCalled();
    });

    it('is a silent no-op when Web Audio is unavailable', () => {
        const createContext = vi.fn(() => null);
        const audio = createAudio({ createContext, storage: memoryStorage() });
        audio.unlock();
        expect(() => audio.play('coin')).not.toThrow();
        expect(createContext).toHaveBeenCalledTimes(1);
    });

    it('is a silent no-op when creating the context throws', () => {
        const createContext = vi.fn(() => {
            throw new Error('not allowed');
        });
        const audio = createAudio({ createContext, storage: memoryStorage() });
        expect(() => audio.play('coin')).not.toThrow();
        expect(() => audio.unlock()).not.toThrow();
        expect(createContext).toHaveBeenCalledTimes(1);
    });
});

describe('mute persistence', () => {
    it('starts unmuted with empty storage', () => {
        expect(createAudio({ createContext: () => null, storage: memoryStorage() }).muted).toBe(false);
    });

    it('persists the muted flag under a versioned key', () => {
        const storage = memoryStorage();
        const audio = createAudio({ createContext: () => null, storage });
        expect(audio.toggleMute()).toBe(true);
        expect(JSON.parse(storage.data[AUDIO_STORAGE_KEY] ?? '')).toEqual({ muted: true });
        expect(createAudio({ createContext: () => null, storage }).muted).toBe(true);

        expect(audio.toggleMute()).toBe(false);
        expect(createAudio({ createContext: () => null, storage }).muted).toBe(false);
    });

    it('notifies subscribers only on changes until they unsubscribe', () => {
        const audio = createAudio({ createContext: () => null, storage: memoryStorage() });
        const listener = vi.fn();
        const unsubscribe = audio.subscribe(listener);
        audio.setMuted(true);
        audio.setMuted(true);
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
        audio.setMuted(false);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('ignores corrupt or unexpected stored values', () => {
        expect(createAudio({ createContext: () => null, storage: memoryStorage({ [AUDIO_STORAGE_KEY]: '{oops' }) }).muted).toBe(false);
        expect(createAudio({ createContext: () => null, storage: memoryStorage({ [AUDIO_STORAGE_KEY]: 'null' }) }).muted).toBe(false);
        expect(createAudio({ createContext: () => null, storage: memoryStorage({ [AUDIO_STORAGE_KEY]: '{"muted":"yes"}' }) }).muted).toBe(false);
    });

    it('works without storage and when storage throws', () => {
        const withoutStorage = createAudio({ createContext: () => null, storage: null });
        expect(withoutStorage.toggleMute()).toBe(true);

        const failing: ScoreStorage = {
            getItem: () => {
                throw new Error('denied');
            },
            setItem: () => {
                throw new Error('full');
            }
        };
        const audio = createAudio({ createContext: () => null, storage: failing });
        expect(audio.muted).toBe(false);
        expect(audio.toggleMute()).toBe(true);
    });
});

describe('browserAudioContext', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns null without Web Audio', () => {
        vi.stubGlobal('AudioContext', undefined);
        expect(browserAudioContext()).toBeNull();
    });

    it('constructs the browser AudioContext when available', () => {
        const instance = { state: 'suspended' };
        vi.stubGlobal('AudioContext', vi.fn(function FakeAudioContext() {
            return instance;
        }));
        expect(browserAudioContext()).toBe(instance);
    });
});

describe('appAudio', () => {
    it('returns one shared instance', () => {
        expect(appAudio()).toBe(appAudio());
    });
});
