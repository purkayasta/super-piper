import { describe, expect, it } from 'vitest';
import { computeZoom, detectRefreshRate } from './display';

function repeat(value: number, count: number): number[] {
  return Array.from({ length: count }, () => value);
}

describe('computeZoom', () => {
  it.each([
    [720, 1, 'high', 3],
    [1080, 1, 'high', 5],
    [1080, 1, 'medium', 4],
    [1440, 1, 'high', 6],
    [2160, 1, 'high', 6],
    [720, 2, 'low', 3],
    [200, 1, 'high', 1],
  ] as const)('height %i dpr %i quality %s gives %i', (height, dpr, quality, expected) => {
    expect(computeZoom(height, dpr, quality)).toBe(expected);
  });
});

describe('detectRefreshRate', () => {
  it.each([
    [16.67, 60],
    [6.94, 144],
    [8.33, 120],
    [4.17, 240],
    [6.06, 165],
  ])('30 frames of %f ms gives %i Hz', (delta, expected) => {
    expect(detectRefreshRate(repeat(delta, 30))).toBe(expected);
  });

  it('ignores a single outlier through the median', () => {
    expect(detectRefreshRate([...repeat(16.67, 29), 120])).toBe(60);
  });

  it('defaults to 60 with no samples', () => {
    expect(detectRefreshRate([])).toBe(60);
  });
});
