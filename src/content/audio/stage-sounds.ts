import { HURRY_VARIANTS, Music, SFX_IDS, Sfx, type SoundId, type StageMusicId } from './sound-ids';

export const MENU_SOUND_IDS: readonly SoundId[] = [Music.menu, Sfx.menuMove, Sfx.menuSelect];

export function stageTracks(music: StageMusicId, withBoss = false) {
  return {
    stage: music,
    hurry: HURRY_VARIANTS[music],
    star: Music.star,
    clear: Music.stageClear,
    gameOver: Music.gameOver,
    boss: withBoss ? Music.boss : null,
  } as const;
}

export function stageSoundIds(
  areaMusic: readonly StageMusicId[],
  withBoss = false,
): readonly SoundId[] {
  const ids = new Set<SoundId>(SFX_IDS);
  for (const music of areaMusic) {
    for (const track of Object.values(stageTracks(music, withBoss))) {
      if (track !== null) ids.add(track);
    }
  }
  return [...ids];
}
