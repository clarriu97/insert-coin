import { useSyncExternalStore } from 'react';
import { appAudio } from '../engine/audio.ts';

const audio = appAudio();
const isMuted = () => audio.muted;

export function MuteToggle() {
    const muted = useSyncExternalStore(audio.subscribe, isMuted);
    return (
        <button
            className="panel-link"
            type="button"
            aria-pressed={!muted}
            onClick={() => audio.toggleMute()}
        >
            SOUND <span aria-hidden="true">{muted ? 'OFF' : 'ON'}</span>
        </button>
    );
}
