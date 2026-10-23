import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DEFAULT_VOLUMES } from '../../../game-engine/audio/volume';
import { MemoryStorage } from '../testing/game-fixtures.test-helpers';
import { AudioService } from './audio.service';
import { SAVE_STORAGE, SaveService } from './save.service';

describe('AudioService', () => {
  function create(): AudioService {
    TestBed.configureTestingModule({
      providers: [{ provide: SAVE_STORAGE, useValue: new MemoryStorage() }],
    });
    return TestBed.inject(AudioService);
  }

  it('starts with the default volumes', () => {
    expect(create().volumes()).toEqual(DEFAULT_VOLUMES);
  });

  it('clamps a channel change and leaves the others alone', () => {
    const audio = create();
    audio.setVolume('music', 1.4);
    audio.setVolume('sfx', 0.25);
    expect(audio.volumes()).toEqual({ ...DEFAULT_VOLUMES, music: 1, sfx: 0.25 });
  });

  it('merges partial volume settings, replacing bad values', () => {
    const audio = create();
    audio.setVolumes({ master: 0.5, music: Number.NaN });
    expect(audio.volumes()).toEqual({ master: 0.5, music: 0, sfx: DEFAULT_VOLUMES.sfx });
  });

  it('keeps volumes in the saved settings', () => {
    const audio = create();
    audio.setVolume('master', 0.3);
    expect(TestBed.inject(SaveService).data().settings.volumes.master).toBe(0.3);
  });

  it('stays silent and safe where Web Audio is missing', () => {
    const audio = create();
    expect(() => {
      audio.playMenuMusic();
      audio.playSfx('sfx.menu-select');
      audio.stopAll();
    }).not.toThrow();
  });
});
