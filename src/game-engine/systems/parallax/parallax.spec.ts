import { describe, expect, it } from 'vitest';
import { advanceDrift, stripCopiesNeeded, stripScreenX } from './parallax';

describe('stripScreenX', () => {
  it('starts at the left edge before the camera moves', () => {
    expect(stripScreenX(0, 0.5, 0, 576)).toBe(-0);
  });

  it('scrolls by the scroll factor and wraps inside one strip width', () => {
    expect(stripScreenX(100, 0.5, 0, 576)).toBe(-50);
    expect(stripScreenX(1200, 0.5, 0, 576)).toBe(-24);
  });

  it('always returns a start position in (-stripWidth, 0]', () => {
    for (let viewLeft = 0; viewLeft < 5000; viewLeft += 37) {
      const x = stripScreenX(viewLeft, 0.37, 13, 576);
      expect(x).toBeLessThanOrEqual(0);
      expect(x).toBeGreaterThan(-576);
    }
  });

  it('moves the strip right when drift grows and keeps a fixed layer still', () => {
    expect(stripScreenX(0, 0, 10, 576)).toBe(-566);
    expect(stripScreenX(9999, 0, 0, 432)).toBe(-0);
  });
});

describe('stripCopiesNeeded', () => {
  it('covers the whole view at any offset', () => {
    expect(stripCopiesNeeded(576, 432)).toBe(2);
    expect(stripCopiesNeeded(432, 432)).toBe(2);
    expect(stripCopiesNeeded(200, 432)).toBe(4);
  });
});

describe('advanceDrift', () => {
  it('accumulates and wraps in both directions', () => {
    expect(advanceDrift(570, 10, 1, 576)).toBe(4);
    expect(advanceDrift(2, -3, 1, 576)).toBe(575);
  });
});
