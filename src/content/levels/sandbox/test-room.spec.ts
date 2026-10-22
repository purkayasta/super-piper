import { describe, expect, it } from 'vitest';
import { EMPTY_TILE } from '../../../game-engine/world/placeholder-tiles';
import { findSymbol, parseTileRows } from '../../../game-engine/world/tile-grid';
import { TEST_ROOM_LEGEND, TEST_ROOM_ROWS, TEST_ROOM_START_SYMBOL } from './test-room';

describe('TEST_ROOM_ROWS', () => {
  it('is 15 rows of equal width and parses with the legend', () => {
    const grid = parseTileRows(TEST_ROOM_ROWS, TEST_ROOM_LEGEND);
    expect(grid.height).toBe(15);
    expect(grid.width).toBeGreaterThanOrEqual(150);
  });

  it('has exactly one start marker standing on solid ground', () => {
    const occurrences = TEST_ROOM_ROWS.join('').split(TEST_ROOM_START_SYMBOL).length - 1;
    expect(occurrences).toBe(1);
    const start = findSymbol(TEST_ROOM_ROWS, TEST_ROOM_START_SYMBOL)!;
    const { tiles } = parseTileRows(TEST_ROOM_ROWS, TEST_ROOM_LEGEND);
    expect(tiles[start.row + 1][start.column]).not.toBe(EMPTY_TILE);
  });

  it('closes the right end with a wall', () => {
    const { tiles, width } = parseTileRows(TEST_ROOM_ROWS, TEST_ROOM_LEGEND);
    for (const row of tiles) expect(row[width - 1]).not.toBe(EMPTY_TILE);
  });

  it('has gaps of 2, 3 and 4 tiles in the ground', () => {
    const groundRow = TEST_ROOM_ROWS[TEST_ROOM_ROWS.length - 1];
    const gaps = groundRow.match(/\.+/g)?.map((gap) => gap.length);
    expect(gaps).toEqual([2, 3, 4]);
  });
});
