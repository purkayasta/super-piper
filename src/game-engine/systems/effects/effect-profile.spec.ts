import { describe, expect, it } from 'vitest';
import type { GameplaySettings } from '../../core/game-events';
import { effectProfile } from './effect-profile';

const HIGH: GameplaySettings = { quality: 'high', reducedMotion: false, screenShake: true };

describe('effectProfile', () => {
  it('keeps every effect on High', () => {
    expect(effectProfile(HIGH)).toEqual({
      brickDebrisPieces: 4,
      sparkles: true,
      cloudDrift: true,
      detailScenery: true,
      screenShake: true,
    });
  });

  it('keeps every effect on Medium', () => {
    expect(effectProfile({ ...HIGH, quality: 'medium' })).toMatchObject({
      brickDebrisPieces: 4,
      sparkles: true,
      cloudDrift: true,
      detailScenery: true,
    });
  });

  it('trims particles, drift and the nearest scenery layer on Low', () => {
    expect(effectProfile({ ...HIGH, quality: 'low' })).toMatchObject({
      brickDebrisPieces: 2,
      sparkles: false,
      cloudDrift: false,
      detailScenery: false,
    });
  });

  it('stops drift and shake under reduced motion', () => {
    expect(effectProfile({ ...HIGH, reducedMotion: true })).toMatchObject({
      cloudDrift: false,
      screenShake: false,
      sparkles: true,
    });
  });

  it('turns shake off when the player disables it', () => {
    expect(effectProfile({ ...HIGH, screenShake: false }).screenShake).toBe(false);
  });
});
