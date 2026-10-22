import { describe, expect, it } from 'vitest';
import { cornerNudge } from './corner-nudge';

const solidAt =
  (...cells: [number, number][]) =>
  (tx: number, ty: number) =>
    cells.some(([x, y]) => x === tx && y === ty);

const box = { x: 29, y: 17, width: 12, height: 14 };

describe('cornerNudge', () => {
  it('nudges right when only the left corner clips a tile', () => {
    expect(cornerNudge(box, -5, solidAt([1, 0]), 16, 4)).toBe(3);
  });

  it('does not nudge when overlap exceeds the limit', () => {
    expect(cornerNudge({ ...box, x: 26 }, -5, solidAt([1, 0]), 16, 4)).toBe(0);
  });

  it('nudges left when only the right corner clips a tile', () => {
    expect(cornerNudge({ ...box, x: 23 }, -5, solidAt([2, 0]), 16, 4)).toBe(-3);
  });

  it('nudges left for a sub-pixel right-corner overlap', () => {
    expect(cornerNudge({ ...box, x: 20.3 }, -5, solidAt([2, 0]), 16, 4)).toBeCloseTo(-0.3, 9);
  });

  it('nudges right for a sub-pixel left-corner overlap', () => {
    expect(cornerNudge({ ...box, x: 31.7 }, -5, solidAt([1, 0]), 16, 4)).toBeCloseTo(0.3, 9);
  });

  it('does not nudge when both corners are solid', () => {
    expect(cornerNudge(box, -5, solidAt([1, 0], [2, 0]), 16, 4)).toBe(0);
  });

  it('does not nudge when not moving up', () => {
    expect(cornerNudge(box, 5, solidAt([1, 0]), 16, 4)).toBe(0);
  });
});
