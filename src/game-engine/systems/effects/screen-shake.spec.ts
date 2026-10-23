import { describe, expect, it } from 'vitest';
import { ScreenShake } from './screen-shake';

const RULES = { frameMs: 40 };

describe('ScreenShake', () => {
  it('offsets by whole pixels and settles back to zero', () => {
    const shake = new ScreenShake(true, RULES);
    shake.start(3, 400);
    expect(shake.active).toBe(true);
    for (let elapsed = 0; elapsed < 400; elapsed += 16) {
      expect(Number.isInteger(shake.offsetX)).toBe(true);
      expect(Number.isInteger(shake.offsetY)).toBe(true);
      expect(Math.abs(shake.offsetX)).toBeLessThanOrEqual(3);
      shake.step(16);
    }
    shake.step(16);
    expect(shake.active).toBe(false);
    expect([shake.offsetX, shake.offsetY]).toEqual([0, 0]);
  });

  it('fades as it runs', () => {
    const shake = new ScreenShake(true, RULES);
    shake.start(3, 300);
    expect(Math.abs(shake.offsetX) + Math.abs(shake.offsetY)).toBeGreaterThan(0);
    shake.step(250);
    expect(Math.max(Math.abs(shake.offsetX), Math.abs(shake.offsetY))).toBeLessThanOrEqual(1);
  });

  it('does nothing when shaking is turned off', () => {
    const shake = new ScreenShake(false, RULES);
    shake.start(3, 400);
    expect(shake.active).toBe(false);
    expect([shake.offsetX, shake.offsetY]).toEqual([0, 0]);
  });

  it('lets a stronger shake replace a weaker one, but not the other way round', () => {
    const shake = new ScreenShake(true, RULES);
    shake.start(1, 200);
    shake.start(3, 500);
    shake.step(40);
    shake.start(1, 100);
    expect(Math.abs(shake.offsetX) + Math.abs(shake.offsetY)).toBeGreaterThanOrEqual(3);
  });
});
