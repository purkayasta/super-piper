import { describe, expect, it } from 'vitest';
import { GOAL_HEIGHT_BANDS, TIME_TALLY } from '../../configuration/scoring.config';
import { TimeTally, goalHeightPoints, grabHeightFraction } from './goal-scoring';

describe('goal height', () => {
  it('measures how far up the pole Pip grabbed it', () => {
    expect(grabHeightFraction(200, 40, 200)).toBe(0);
    expect(grabHeightFraction(120, 40, 200)).toBe(0.5);
    expect(grabHeightFraction(10, 40, 200)).toBe(1);
  });

  it('awards more points higher up the pole', () => {
    expect(goalHeightPoints(1, GOAL_HEIGHT_BANDS)).toBe(5000);
    expect(goalHeightPoints(0.7, GOAL_HEIGHT_BANDS)).toBe(2000);
    expect(goalHeightPoints(0.5, GOAL_HEIGHT_BANDS)).toBe(800);
    expect(goalHeightPoints(0.2, GOAL_HEIGHT_BANDS)).toBe(400);
    expect(goalHeightPoints(0, GOAL_HEIGHT_BANDS)).toBe(100);
  });
});

describe('TimeTally', () => {
  it('converts time in chunks, never every frame', () => {
    const tally = new TimeTally(TIME_TALLY);
    tally.start(20);
    expect(tally.step(TIME_TALLY.tickMs - 1)).toBe(0);
    expect(tally.step(1)).toBe(TIME_TALLY.unitsPerTick);
    expect(tally.step(TIME_TALLY.tickMs * 5)).toBe(20 - TIME_TALLY.unitsPerTick);
    expect(tally.done).toBe(true);
    expect(tally.step(1000)).toBe(0);
  });

  it('is done at once with no time left, and idle before it starts', () => {
    const tally = new TimeTally(TIME_TALLY);
    expect(tally.done).toBe(false);
    expect(tally.step(1000)).toBe(0);
    tally.start(0);
    expect(tally.done).toBe(true);
  });
});
