import { describe, expect, it } from 'vitest';
import { createRandom, fbm1D, fbm2D, smoothstep, valueNoise1D, valueNoise2D, wrap } from './noise';

describe('createRandom', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const values = Array.from({ length: 1000 }, () => a());
    expect(values).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(createRandom(43)()).not.toBe(values[0]);
  });
});

describe('value noise', () => {
  it('repeats across its period in x', () => {
    for (const x of [0, 0.3, 2.7, 5.5]) {
      expect(valueNoise1D(x + 8, 8, 3)).toBeCloseTo(valueNoise1D(x, 8, 3), 10);
      expect(valueNoise2D(x + 8, 1.4, 8, 3)).toBeCloseTo(valueNoise2D(x, 1.4, 8, 3), 10);
    }
  });

  it('stays within [0, 1]', () => {
    for (let x = 0; x < 20; x += 0.37) {
      const value = valueNoise2D(x, x * 0.7, 16, 9);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('fbm', () => {
  it('tiles seamlessly across a unit strip', () => {
    expect(fbm1D(1, 4, 5, 7)).toBeCloseTo(fbm1D(0, 4, 5, 7), 10);
    expect(fbm2D(1.25, 0.4, 6, 4, 7)).toBeCloseTo(fbm2D(0.25, 0.4, 6, 4, 7), 10);
  });
});

describe('helpers', () => {
  it('smoothstep clamps and eases', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(1, 0, 0.25)).toBeCloseTo(0.84375);
  });

  it('wrap keeps negative values in range', () => {
    expect(wrap(-1, 8)).toBe(7);
    expect(wrap(9, 8)).toBe(1);
  });
});
