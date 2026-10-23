import { describe, expect, it } from 'vitest';
import { HazardField } from './hazard-field';
import { EMPTY_TILE, Tile } from './tile-ids';

const _ = EMPTY_TILE;
const S = Tile.lavaSurface;
const L = Tile.lava;

const GRID = [
  [_, _, _, _],
  [_, S, S, _],
  [_, L, L, _],
];

const INSETS = { surfaceInsetPx: 6, sideInsetPx: 2 };

describe('HazardField', () => {
  const field = new HazardField(GRID, 16, INSETS);

  it('lets Pip skim the top of the lava surface but not sink into it', () => {
    expect(field.touches({ x: 18, y: 8, width: 12, height: 14 })).toBe(false);
    expect(field.touches({ x: 18, y: 9, width: 12, height: 14 })).toBe(true);
  });

  it('forgives a toe over the edge', () => {
    expect(field.touches({ x: 6, y: 20, width: 12, height: 14 })).toBe(false);
    expect(field.touches({ x: 7, y: 20, width: 12, height: 14 })).toBe(true);
  });

  it('catches deep lava from its top edge and ignores rows outside the grid', () => {
    expect(field.touches({ x: 20, y: 34, width: 8, height: 4 })).toBe(true);
    expect(field.touches({ x: 20, y: 60, width: 4, height: 14 })).toBe(false);
  });

  it('knows when a level has no hazards', () => {
    const none = new HazardField([[_, _]], 16, INSETS);
    expect(none.empty).toBe(true);
    expect(none.touches({ x: 0, y: 0, width: 16, height: 16 })).toBe(false);
  });
});
