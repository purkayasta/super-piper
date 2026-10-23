import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS } from '../../../game-engine/systems/input/actions';
import { MemoryStorage } from '../testing/game-fixtures.test-helpers';
import { PREFERS_REDUCED_MOTION, SAVE_STORAGE, SaveService } from './save.service';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let settings: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SAVE_STORAGE, useValue: new MemoryStorage() },
        { provide: PREFERS_REDUCED_MOTION, useValue: true },
      ],
    });
    settings = TestBed.inject(SettingsService);
  });

  it('defaults reduced motion to the system preference', () => {
    expect(settings.settings().reducedMotion).toBe(true);
    expect(settings.gameplay()).toEqual({
      quality: 'high',
      reducedMotion: true,
      screenShake: true,
      jumpSensitivity: 1,
      leftSensitivity: 1,
      rightSensitivity: 1,
    });
  });

  it('marks the document while reduced motion is on', () => {
    TestBed.tick();
    expect(document.documentElement.hasAttribute('data-reduced-motion')).toBe(true);
    settings.update({ reducedMotion: false });
    TestBed.tick();
    expect(document.documentElement.hasAttribute('data-reduced-motion')).toBe(false);
  });

  it('saves only real changes', () => {
    const save = TestBed.inject(SaveService);
    const before = save.data();
    settings.update({ quality: 'high' });
    expect(save.data()).toBe(before);
    settings.update({ quality: 'medium' });
    expect(save.data().settings.quality).toBe('medium');
  });

  it('rebinds keys and resets them', () => {
    settings.rebind('jump', 'KeyL');
    expect(settings.bindings().jump[0]).toBe('KeyL');
    settings.resetBindings();
    expect(settings.bindings()).toEqual(DEFAULT_BINDINGS);
  });
});
