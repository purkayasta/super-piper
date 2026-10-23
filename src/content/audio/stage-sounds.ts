import { HURRY_VARIANTS, Music, SFX_IDS, Sfx, type SoundId, type StageMusicId } from './sound-ids';

export const MENU_SOUND_IDS: readonly SoundId[] = [Music.menu, Sfx.menuMove, Sfx.menuSelect];

export function stageTracks(music: StageMusicId) {
  return {
    stage: music,
    hurry: HURRY_VARIANTS[music],
    star: Music.star,
    clear: Music.stageClear,
    gameOver: Music.gameOver,
  } as const;
}

export function stageSoundIds(music: StageMusicId): readonly SoundId[] {
  return [...SFX_IDS, ...Object.values(stageTracks(music))];
}
