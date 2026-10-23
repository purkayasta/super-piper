import { describe, expect, it } from 'vitest';
import { padCounter } from './counter-format';

describe('padCounter', () => {
  it('zero-pads to the requested width', () => {
    expect(padCounter(1200, 6)).toBe('001200');
    expect(padCounter(7, 2)).toBe('07');
  });

  it('caps at the largest value the digits can show and floors fractions', () => {
    expect(padCounter(1234567, 6)).toBe('999999');
    expect(padCounter(12.9, 3)).toBe('012');
  });

  it('never shows negative numbers', () => {
    expect(padCounter(-5, 3)).toBe('000');
  });
});
