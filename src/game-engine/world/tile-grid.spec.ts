import { describe, expect, it } from 'vitest';
import { parseTileRows } from './tile-grid';

const legend = { '.': 0, '#': 1 };

describe('parseTileRows', () => {
  it('parses a grid', () => {
    expect(parseTileRows(['.#.', '###'], legend)).toEqual({
      tiles: [
        [0, 1, 0],
        [1, 1, 1],
      ],
      width: 3,
      height: 2,
    });
  });

  it('throws on an unknown symbol', () => {
    expect(() => parseTileRows(['.#.', '#x#'], legend)).toThrow(
      'Unknown tile symbol "x" at row 1, col 1',
    );
  });

  it('throws on ragged rows', () => {
    expect(() => parseTileRows(['.#.', '##'], legend)).toThrow('Row 1 has length 2, expected 3');
  });
});
