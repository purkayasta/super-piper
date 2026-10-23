import type { MusicId, SfxId, SoundId } from '../../content/audio/sound-ids';

export interface GameAudio {
  prepare(ids: readonly SoundId[]): void;
  playSfx(id: SfxId): void;
  playMusic(id: MusicId | null): void;
  pauseMusic(): void;
  resumeMusic(): void;
  stopAll(): void;
}

export const SILENT_AUDIO: GameAudio = {
  prepare: () => {},
  playSfx: () => {},
  playMusic: () => {},
  pauseMusic: () => {},
  resumeMusic: () => {},
  stopAll: () => {},
};
