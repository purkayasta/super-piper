import { describe, expect, it } from 'vitest';
import { DEFAULT_VOLUMES, clampVolume, sanitizeVolumes, volumeToGain, withVolume } from './volume';

describe('volume', () => {
  it('clamps to 0..1 and treats non-numbers as silence', () => {
    expect(clampVolume(-0.5)).toBe(0);
    expect(clampVolume(1.5)).toBe(1);
    expect(clampVolume(0.3)).toBe(0.3);
    expect(clampVolume(Number.NaN)).toBe(0);
    expect(clampVolume(Infinity)).toBe(0);
  });

  it('maps volume to gain on a squared curve so the slider feels even', () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(0.5)).toBe(0.25);
    expect(volumeToGain(1)).toBe(1);
    expect(volumeToGain(2)).toBe(1);
  });

  it('changes one channel without touching the others', () => {
    const volumes = withVolume(DEFAULT_VOLUMES, 'music', 3);
    expect(volumes).toEqual({ ...DEFAULT_VOLUMES, music: 1 });
    expect(DEFAULT_VOLUMES.music).toBe(0.6);
  });

  it('fills missing or bad values from the defaults', () => {
    expect(sanitizeVolumes({ sfx: 0.2 })).toEqual({ master: 0.8, music: 0.6, sfx: 0.2 });
    expect(sanitizeVolumes({ master: Number.NaN })).toEqual({ ...DEFAULT_VOLUMES, master: 0 });
  });
});
