import { describe, expect, it } from 'vitest';
import type { Box } from '../../entities/actors/actor-body';
import type { CompiledFirebar } from '../../world/level-format';
import { Firebars, distanceSquaredToBox } from './firebars';

const BAR: CompiledFirebar = {
  centerX: 100,
  centerY: 100,
  segments: 4,
  turnsPerSecond: 0.25,
  startRadians: 0,
};

function box(x: number, y: number, size = 4): Box {
  return { x, y, width: size, height: size };
}

describe('Firebars', () => {
  it('lays the balls out from the anchor along the start angle', () => {
    const bars = new Firebars([BAR], 8);
    expect(bars.segmentCount).toBe(4);
    expect([...bars.segmentX]).toEqual([100, 108, 116, 124]);
    expect([...bars.segmentY]).toEqual([100, 100, 100, 100]);
  });

  it('turns clockwise on screen for a positive speed', () => {
    const bars = new Firebars([BAR], 8);
    bars.step(1);
    expect(bars.segmentX[3]).toBeCloseTo(100, 9);
    expect(bars.segmentY[3]).toBeCloseTo(124, 9);
    const anticlockwise = new Firebars([{ ...BAR, turnsPerSecond: -0.25 }], 8);
    anticlockwise.step(1);
    expect(anticlockwise.segmentY[3]).toBeCloseTo(76, 9);
  });

  it('is a function of step time, so every rate agrees', () => {
    const ends = [60, 120, 144].map((hz) => {
      const bars = new Firebars([BAR], 8);
      for (let i = 0; i < 2.5 * hz; i++) bars.step(1 / hz);
      return [bars.segmentX[3], bars.segmentY[3]];
    });
    for (const [x, y] of ends) {
      expect(x).toBeCloseTo(ends[0][0], 9);
      expect(y).toBeCloseTo(ends[0][1], 9);
    }
  });

  it('keeps several bars in one pair of arrays', () => {
    const bars = new Firebars([BAR, { ...BAR, centerX: 300, segments: 2 }], 8);
    expect(bars.barCount).toBe(2);
    expect(bars.segmentCount).toBe(6);
    expect(bars.segmentX[4]).toBe(300);
    expect(bars.segmentX[5]).toBe(308);
  });

  it('hits a box within the ball radius and misses one just outside', () => {
    const bars = new Firebars([BAR], 8);
    expect(bars.hits(box(126, 98), 3)).toBe(true);
    expect(bars.hits(box(128, 98), 3)).toBe(false);
    expect(bars.hits(box(110, 104), 3)).toBe(false);
    expect(bars.hits(box(98, 98), 3)).toBe(true);
  });

  it('measures the distance from a point to the nearest edge of a box', () => {
    expect(distanceSquaredToBox(box(0, 0, 10), 5, 5)).toBe(0);
    expect(distanceSquaredToBox(box(0, 0, 10), 13, 14)).toBe(25);
  });
});
