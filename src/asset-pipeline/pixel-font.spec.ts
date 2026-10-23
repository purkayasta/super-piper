import { describe, expect, it } from 'vitest';
import { FILL_SYMBOL, OUTLINE_SYMBOL, outlinedTextGrid } from './pixel-font';

describe('outlinedTextGrid', () => {
  it('sizes text as 3x5 glyphs with a 1px gap and a 1px outline', () => {
    const grid = outlinedTextGrid('100');
    expect(grid).toHaveLength(7);
    expect(grid.every((row) => row.length === 13)).toBe(true);
  });

  it('outlines every filled pixel', () => {
    const grid = outlinedTextGrid('8');
    expect(grid).toEqual(['KKKKK', 'KWWWK', 'KWKWK', 'KWWWK', 'KWKWK', 'KWWWK', 'KKKKK']);
    expect(grid.join('')).toContain(FILL_SYMBOL);
    expect(grid[0]).toMatch(new RegExp(`^${OUTLINE_SYMBOL}+$`));
  });

  it('renders the 1UP label and rejects unknown characters', () => {
    expect(outlinedTextGrid('1up')[1]).toBe('KKWKKWKWKWWWK');
    expect(() => outlinedTextGrid('x')).toThrow('No glyph for "x"');
  });
});
