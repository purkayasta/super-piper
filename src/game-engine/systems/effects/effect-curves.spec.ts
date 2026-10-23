import { describe, expect, it } from 'vitest';
import { bumpOffset, coinPopOffset, effectProgress, frameAt } from './effect-curves';

describe('effect curves', () => {
  it('clamps progress to [0, 1]', () => {
    expect(effectProgress(-5, 100)).toBe(0);
    expect(effectProgress(50, 100)).toBe(0.5);
    expect(effectProgress(500, 100)).toBe(1);
  });

  it('bumps a block up and back to rest', () => {
    expect(bumpOffset(0, 140, 5)).toBeCloseTo(0);
    expect(bumpOffset(70, 140, 5)).toBeCloseTo(-5);
    expect(bumpOffset(140, 140, 5)).toBe(0);
    expect(bumpOffset(300, 140, 5)).toBe(0);
  });

  it('pops a coin up to its peak and back down', () => {
    expect(coinPopOffset(0, 500, 44)).toBeCloseTo(0);
    expect(coinPopOffset(250, 500, 44)).toBeCloseTo(-44);
    expect(coinPopOffset(500, 500, 44)).toBeCloseTo(0);
    expect(coinPopOffset(125, 500, 44)).toBeGreaterThan(coinPopOffset(250, 500, 44));
  });

  it('cycles frames by elapsed time', () => {
    expect(frameAt(0, 150, 5)).toBe(0);
    expect(frameAt(149, 150, 5)).toBe(0);
    expect(frameAt(150, 150, 5)).toBe(1);
    expect(frameAt(760, 150, 5)).toBe(0);
  });
});
