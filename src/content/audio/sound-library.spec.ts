import { describe, expect, it } from 'vitest';
import { peakOf } from '../../asset-pipeline/audio/mixdown';
import { renderSfx, tonesEnd } from '../../asset-pipeline/audio/render-sound';
import { sequenceSong } from '../../asset-pipeline/audio/sequencer';
import { validateSong } from '../../asset-pipeline/audio/song-validator';
import { AUDIO_RULES } from '../../game-engine/configuration/audio.config';
import { DEATH_RULES } from '../../game-engine/configuration/rules.config';
import { MUSIC_LIBRARY } from './music-library';
import { SFX_LIBRARY } from './sfx-library';
import {
  HURRY_VARIANTS,
  MUSIC_IDS,
  ONE_SHOT_MUSIC,
  SFX_IDS,
  SFX_MAX_VOICES,
  STAGE_MUSIC_IDS,
  soundFileName,
} from './sound-ids';
import { MENU_SOUND_IDS, stageSoundIds, stageTracks } from './stage-sounds';

const RENDER_RATE = 8000;
const MAX_SFX_SECONDS = 3;
const MAX_LOOP_SECONDS = 30;

describe('sound library', () => {
  it('has unique IDs and file names', () => {
    const ids = [...SFX_IDS, ...MUSIC_IDS];
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids.map(soundFileName)).size).toBe(ids.length);
  });

  it('defines every SFX with a voice limit, short and ending in silence', () => {
    expect(Object.keys(SFX_LIBRARY).sort()).toEqual([...SFX_IDS].sort());
    for (const id of SFX_IDS) {
      const definition = SFX_LIBRARY[id];
      expect(SFX_MAX_VOICES[id], id).toBeGreaterThanOrEqual(1);
      expect(tonesEnd(definition.tones), id).toBeLessThan(MAX_SFX_SECONDS);
      const buffer = renderSfx(definition.tones, definition.peak, RENDER_RATE);
      expect(peakOf(buffer), id).toBeCloseTo(definition.peak, 4);
      expect(Math.abs(buffer.at(-1) ?? 1), id).toBeLessThan(1e-6);
    }
  });

  it('ends the death jingle before a death restarts the stage', () => {
    const deathSeconds = tonesEnd(SFX_LIBRARY['sfx.death'].tones);
    expect(deathSeconds * 1000).toBeLessThan(
      Math.min(DEATH_RULES.durationMs, DEATH_RULES.pitDurationMs),
    );
  });

  it('holds the music back for the whole time-low warning', () => {
    const warningSeconds = tonesEnd(SFX_LIBRARY['sfx.time-low'].tones);
    expect(warningSeconds * 1000).toBeLessThanOrEqual(AUDIO_RULES.hurryWarningMs);
  });

  it('defines every music ID with a valid 4-channel song', () => {
    expect(Object.keys(MUSIC_LIBRARY).sort()).toEqual([...MUSIC_IDS].sort());
    for (const id of MUSIC_IDS) {
      const { song, tempoScale } = MUSIC_LIBRARY[id];
      expect(validateSong(song), id).toEqual([]);
      expect(song.loop, id).toBe(!ONE_SHOT_MUSIC.has(id));
      expect(sequenceSong(song, tempoScale).seconds, id).toBeLessThan(MAX_LOOP_SECONDS);
    }
  });

  it('renders hurry variants faster from the same notes', () => {
    for (const id of STAGE_MUSIC_IDS) {
      const normal = MUSIC_LIBRARY[id];
      const hurry = MUSIC_LIBRARY[HURRY_VARIANTS[id]];
      expect(hurry.song).toBe(normal.song);
      expect(hurry.tempoScale).toBeGreaterThan(normal.tempoScale);
    }
  });

  it('lists the sounds a stage and the menu need', () => {
    const sounds = stageSoundIds(['music.overworld']);
    expect(sounds).toEqual(expect.arrayContaining([...SFX_IDS]));
    expect(sounds).toEqual(
      expect.arrayContaining([
        'music.overworld',
        'music.overworld-hurry',
        'music.star',
        'music.stage-clear',
        'music.game-over',
      ]),
    );
    expect(sounds).not.toContain('music.underground');
    expect(sounds).not.toContain('music.boss');
    expect(stageTracks('music.castle', true)).toEqual({
      stage: 'music.castle',
      hurry: 'music.castle-hurry',
      star: 'music.star',
      clear: 'music.stage-clear',
      gameOver: 'music.game-over',
      boss: 'music.boss',
    });
    const withAreas = stageSoundIds(['music.overworld', 'music.underground'], true);
    expect(withAreas).toEqual(
      expect.arrayContaining(['music.underground', 'music.underground-hurry', 'music.boss']),
    );
    expect(new Set(withAreas).size).toBe(withAreas.length);
    expect(MENU_SOUND_IDS).toContain('music.menu');
  });
});
