import { browserStorage, type ScoreStorage } from './highscores.ts';

export const AUDIO_STORAGE_KEY = 'insert-coin:audio:v1';
export const MASTER_VOLUME = 0.12;

const ATTACK_S = 0.005;
const SILENCE = 0.0001;
const NOISE_SECONDS = 1;

export type SoundName =
    | 'coin'
    | 'start'
    | 'select'
    | 'move'
    | 'rotate'
    | 'drop'
    | 'hold'
    | 'line'
    | 'tetris'
    | 'eat'
    | 'die'
    | 'win'
    | 'shoot'
    | 'explode'
    | 'thrust'
    | 'hit';

export type Waveform = 'square' | 'triangle' | 'sawtooth' | 'noise';

export interface Effect {
    wave: Waveform;
    notes: readonly number[];
    glide: boolean;
    durationMs: number;
    volume: number;
}

export const EFFECTS: Readonly<Record<SoundName, Effect>> = {
    coin: { wave: 'square', notes: [988, 1319], glide: false, durationMs: 220, volume: 0.5 },
    start: { wave: 'square', notes: [523, 659, 784, 1047], glide: false, durationMs: 360, volume: 0.45 },
    select: { wave: 'square', notes: [880], glide: false, durationMs: 50, volume: 0.3 },
    move: { wave: 'square', notes: [220], glide: false, durationMs: 30, volume: 0.2 },
    rotate: { wave: 'triangle', notes: [440, 660], glide: true, durationMs: 60, volume: 0.4 },
    drop: { wave: 'triangle', notes: [220, 60], glide: true, durationMs: 120, volume: 0.6 },
    hold: { wave: 'triangle', notes: [523, 392], glide: false, durationMs: 100, volume: 0.4 },
    line: { wave: 'square', notes: [523, 659, 784], glide: false, durationMs: 210, volume: 0.45 },
    tetris: { wave: 'square', notes: [523, 659, 784, 1047, 784, 1047], glide: false, durationMs: 480, volume: 0.5 },
    eat: { wave: 'square', notes: [440, 880], glide: true, durationMs: 80, volume: 0.35 },
    die: { wave: 'sawtooth', notes: [440, 55], glide: true, durationMs: 650, volume: 0.4 },
    win: { wave: 'square', notes: [523, 659, 784, 1047, 1319], glide: false, durationMs: 700, volume: 0.45 },
    shoot: { wave: 'square', notes: [1200, 200], glide: true, durationMs: 120, volume: 0.3 },
    explode: { wave: 'noise', notes: [2000, 100], glide: true, durationMs: 500, volume: 0.6 },
    thrust: { wave: 'noise', notes: [400], glide: false, durationMs: 150, volume: 0.3 },
    hit: { wave: 'noise', notes: [3000, 300], glide: true, durationMs: 150, volume: 0.5 }
};

export type AudioContextLike = Pick<
    BaseAudioContext,
    'currentTime' | 'sampleRate' | 'state' | 'destination'
    | 'createGain' | 'createOscillator' | 'createBuffer' | 'createBufferSource' | 'createBiquadFilter'
> & {
    resume(): Promise<void>;
};

export interface AudioOptions {
    createContext?: () => AudioContextLike | null;
    storage?: ScoreStorage | null;
}

export interface AudioPlayer {
    readonly muted: boolean;
    setMuted(muted: boolean): void;
    toggleMute(): boolean;
    subscribe(listener: () => void): () => void;
    unlock(): void;
    play(name: SoundName): void;
}

interface Voice {
    source: AudioScheduledSourceNode;
    frequency: AudioParam;
}

export function browserAudioContext(): AudioContextLike | null {
    return typeof globalThis.AudioContext === 'function' ? new globalThis.AudioContext() : null;
}

function readMuted(storage: ScoreStorage | null): boolean {
    try {
        const parsed: unknown = JSON.parse(storage?.getItem(AUDIO_STORAGE_KEY) ?? '{}');
        return (parsed as { muted?: unknown } | null)?.muted === true;
    } catch {
        return false;
    }
}

function writeMuted(storage: ScoreStorage | null, muted: boolean) {
    try {
        storage?.setItem(AUDIO_STORAGE_KEY, JSON.stringify({ muted }));
    } catch {
        return;
    }
}

function noiseBuffer(ctx: AudioContextLike): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
        samples[index] = Math.random() * 2 - 1;
    }
    return buffer;
}

function noiseVoice(ctx: AudioContextLike, buffer: AudioBuffer, output: AudioNode): Voice {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    source.connect(filter);
    filter.connect(output);
    return { source, frequency: filter.frequency };
}

function toneVoice(ctx: AudioContextLike, wave: OscillatorType, output: AudioNode): Voice {
    const oscillator = ctx.createOscillator();
    oscillator.type = wave;
    oscillator.connect(output);
    return { source: oscillator, frequency: oscillator.frequency };
}

function setPitch(frequency: AudioParam, { notes, glide }: Effect, start: number, duration: number) {
    const [first = 440] = notes;
    const last = notes.at(-1) ?? first;
    frequency.setValueAtTime(first, start);
    if (glide) {
        frequency.exponentialRampToValueAtTime(last, start + duration);
        return;
    }
    notes.forEach((note, index) => frequency.setValueAtTime(note, start + (index * duration) / notes.length));
}

export function createAudio({
    createContext = browserAudioContext,
    storage = browserStorage()
}: AudioOptions = {}): AudioPlayer {
    let muted = readMuted(storage);
    let ctx: AudioContextLike | null = null;
    let master: GainNode | null = null;
    let noise: AudioBuffer | null = null;
    let unavailable = false;
    const listeners = new Set<() => void>();

    const context = (): AudioContextLike | null => {
        if (ctx || unavailable) return ctx;
        try {
            ctx = createContext();
        } catch {
            ctx = null;
        }
        if (!ctx) {
            unavailable = true;
            return null;
        }
        master = ctx.createGain();
        master.gain.value = MASTER_VOLUME;
        master.connect(ctx.destination);
        return ctx;
    };

    const resume = (active: AudioContextLike) => {
        if (active.state === 'suspended') {
            active.resume().catch(() => undefined);
        }
    };

    const schedule = (active: AudioContextLike, output: AudioNode, effect: Effect) => {
        const start = active.currentTime;
        const duration = effect.durationMs / 1000;
        const end = start + duration;
        const envelope = active.createGain();
        envelope.gain.setValueAtTime(SILENCE, start);
        envelope.gain.exponentialRampToValueAtTime(effect.volume, start + ATTACK_S);
        envelope.gain.exponentialRampToValueAtTime(SILENCE, end);
        envelope.connect(output);
        const voice = effect.wave === 'noise'
            ? noiseVoice(active, (noise ??= noiseBuffer(active)), envelope)
            : toneVoice(active, effect.wave, envelope);
        setPitch(voice.frequency, effect, start, duration);
        voice.source.start(start);
        voice.source.stop(end);
    };

    const setMuted = (next: boolean) => {
        if (next === muted) return;
        muted = next;
        writeMuted(storage, muted);
        listeners.forEach((listener) => listener());
    };

    return {
        get muted() {
            return muted;
        },
        setMuted,
        toggleMute() {
            setMuted(!muted);
            return muted;
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        unlock() {
            const active = context();
            if (active) resume(active);
        },
        play(name) {
            if (muted) return;
            const active = context();
            if (!active || !master) return;
            resume(active);
            schedule(active, master, EFFECTS[name]);
        }
    };
}

let shared: AudioPlayer | null = null;

export function appAudio(): AudioPlayer {
    shared ??= createAudio();
    return shared;
}
