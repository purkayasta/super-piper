import { describe, expect, it } from 'vitest';
import { MusicDirector, type StageTracks } from './music-director';

const TRACKS: StageTracks = {
  stage: 'music.overworld',
  hurry: 'music.overworld-hurry',
  star: 'music.star',
  clear: 'music.stage-clear',
  gameOver: 'music.game-over',
};
const WARNING_MS = 1500;

function director(): MusicDirector {
  return new MusicDirector(TRACKS, WARNING_MS);
}

describe('MusicDirector', () => {
  it('plays the stage theme, switches to star music and back', () => {
    const music = director();
    expect(music.track).toBe('music.overworld');
    music.setStar(true);
    expect(music.track).toBe('music.star');
    music.setStar(false);
    expect(music.track).toBe('music.overworld');
  });

  it('goes quiet for the hurry warning, then plays the hurry loop', () => {
    const music = director();
    expect(music.beginHurry()).toBe(true);
    expect(music.track).toBeNull();
    music.step(WARNING_MS - 1);
    expect(music.track).toBeNull();
    music.step(1);
    expect(music.track).toBe('music.overworld-hurry');
    expect(music.beginHurry()).toBe(false);
  });

  it('keeps star music over hurry, and hurries once the star ends', () => {
    const music = director();
    music.setStar(true);
    music.beginHurry();
    music.step(WARNING_MS);
    expect(music.track).toBe('music.star');
    music.setStar(false);
    expect(music.track).toBe('music.overworld-hurry');
  });

  it('silences everything for a death or the goal', () => {
    const music = director();
    music.setStar(true);
    music.silence();
    expect(music.track).toBeNull();
    expect(music.beginHurry()).toBe(false);
  });

  it('plays the clear fanfare and the game-over phrase', () => {
    const music = director();
    music.silence();
    music.stageClear();
    expect(music.track).toBe('music.stage-clear');
    music.gameOver();
    expect(music.track).toBe('music.game-over');
    music.silence();
    expect(music.track).toBe('music.game-over');
  });
});
