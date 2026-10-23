import { describe, expect, it } from 'vitest';
import { DEFAULT_VOLUMES } from '../../../game-engine/audio/volume';
import { DEFAULT_BINDINGS, type KeyBindings } from '../../../game-engine/systems/input/actions';
import { defaultSettings, gameplaySettings } from '../models/settings.model';
import { mergeSettings, sameSettings } from './settings-rules';

const DEFAULTS = defaultSettings(false);

describe('settings defaults', () => {
  it('start at High with shake on, the default volumes and keys', () => {
    expect(DEFAULTS).toEqual({
      volumes: DEFAULT_VOLUMES,
      quality: 'high',
      reducedMotion: false,
      screenShake: true,
      jumpSensitivity: 1,
      leftSensitivity: 1,
      rightSensitivity: 1,
      bindings: DEFAULT_BINDINGS,
    });
  });

  it('follow the system reduced-motion preference', () => {
    expect(defaultSettings(true).reducedMotion).toBe(true);
  });

  it('give Phaser only the gameplay part', () => {
    expect(gameplaySettings(DEFAULTS)).toEqual({
      quality: 'high',
      reducedMotion: false,
      screenShake: true,
      jumpSensitivity: 1,
      leftSensitivity: 1,
      rightSensitivity: 1,
    });
  });
});

describe('mergeSettings', () => {
  it('changes only what the patch names', () => {
    expect(mergeSettings(DEFAULTS, { quality: 'low' })).toEqual({ ...DEFAULTS, quality: 'low' });
    expect(mergeSettings(DEFAULTS, { volumes: { music: 0.25 } }).volumes).toEqual({
      ...DEFAULT_VOLUMES,
      music: 0.25,
    });
  });

  it('clamps volumes and ignores unknown quality levels', () => {
    const merged = mergeSettings(DEFAULTS, {
      volumes: { sfx: 3 },
      quality: 'ultra' as never,
    });
    expect(merged.volumes.sfx).toBe(1);
    expect(merged.quality).toBe('high');
  });

  it('clamps movement sensitivity to its supported range', () => {
    expect(
      mergeSettings(DEFAULTS, {
        jumpSensitivity: 2,
        leftSensitivity: 0.25,
        rightSensitivity: 1.25,
      }),
    ).toMatchObject({
      jumpSensitivity: 1.5,
      leftSensitivity: 0.5,
      rightSensitivity: 1.25,
    });
  });

  it('keeps the current bindings when the new ones conflict', () => {
    const conflicting: KeyBindings = { ...DEFAULT_BINDINGS, jump: ['ArrowLeft'] };
    expect(mergeSettings(DEFAULTS, { bindings: conflicting }).bindings).toBe(DEFAULT_BINDINGS);
  });

  it('compares settings by value', () => {
    expect(sameSettings(DEFAULTS, defaultSettings(false))).toBe(true);
    expect(sameSettings(DEFAULTS, { ...DEFAULTS, screenShake: false })).toBe(false);
  });
});
