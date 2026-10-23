import type { Song } from '../../asset-pipeline/audio/sequencer';
import { Music, type MusicId } from './sound-ids';
import { BOSS_SONG } from './songs/boss';
import { CASTLE_SONG } from './songs/castle';
import { GAME_OVER_SONG, STAGE_CLEAR_SONG } from './songs/jingles';
import { MENU_SONG } from './songs/menu';
import { OVERWORLD_SONG } from './songs/overworld';
import { SKY_SONG } from './songs/sky';
import { STAR_SONG } from './songs/star';
import { UNDERGROUND_SONG } from './songs/underground';

export interface MusicDefinition {
  readonly song: Song;
  readonly tempoScale: number;
}

export const HURRY_TEMPO_SCALE = 1.3;

const normal = (song: Song): MusicDefinition => ({ song, tempoScale: 1 });
const hurried = (song: Song): MusicDefinition => ({ song, tempoScale: HURRY_TEMPO_SCALE });

export const MUSIC_LIBRARY: Readonly<Record<MusicId, MusicDefinition>> = {
  [Music.overworld]: normal(OVERWORLD_SONG),
  [Music.overworldHurry]: hurried(OVERWORLD_SONG),
  [Music.underground]: normal(UNDERGROUND_SONG),
  [Music.undergroundHurry]: hurried(UNDERGROUND_SONG),
  [Music.sky]: normal(SKY_SONG),
  [Music.skyHurry]: hurried(SKY_SONG),
  [Music.castle]: normal(CASTLE_SONG),
  [Music.castleHurry]: hurried(CASTLE_SONG),
  [Music.boss]: normal(BOSS_SONG),
  [Music.star]: normal(STAR_SONG),
  [Music.stageClear]: normal(STAGE_CLEAR_SONG),
  [Music.gameOver]: normal(GAME_OVER_SONG),
  [Music.menu]: normal(MENU_SONG),
};
