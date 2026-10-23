import { describe, expect, it } from 'vitest';
import { rasterizeGrid, unknownSymbols } from '../../asset-pipeline/pixel-grid';
import { getPixel } from '../../asset-pipeline/raster';
import { TILE_COUNT, TILESET_LAYOUT } from '../../game-engine/world/tile-ids';
import { ItemFrame, PIP_FRAMES, PIP_FRAME_SIZE, PIP_OUTFITS } from './atlas-frames';
import { ITEM_FRAME_GRIDS, ITEM_PALETTE } from './item-sprites';
import { OVERWORLD_TILE_ART } from './overworld-tiles';
import { PIP_FRAME_GRIDS, PIP_OUTFIT_PALETTES, PIP_PALETTE } from './pip-sprites';

describe('Pip sprites', () => {
  it.each(PIP_FRAMES)('frame %s is 16x16 and uses only palette symbols', (frame) => {
    const grid = PIP_FRAME_GRIDS[frame];
    expect(grid).toHaveLength(PIP_FRAME_SIZE);
    expect(grid.every((row) => row.length === PIP_FRAME_SIZE)).toBe(true);
    expect(unknownSymbols(grid, PIP_PALETTE)).toEqual([]);
  });

  it('keeps the approved idle design', () => {
    expect(PIP_FRAME_GRIDS.idle[3]).toBe('...KCCWCCCCCCK..');
    expect(PIP_FRAME_GRIDS.idle[15]).toBe('.KBBBBK.KBBBBK..');
  });

  it('gives every outfit a full palette that differs from the default', () => {
    for (const outfit of PIP_OUTFITS) {
      expect(Object.keys(PIP_OUTFIT_PALETTES[outfit]).sort()).toEqual(
        Object.keys(PIP_PALETTE).sort(),
      );
    }
    expect(PIP_OUTFIT_PALETTES.forest['C']).not.toBe(PIP_PALETTE['C']);
  });
});

describe('item sprites', () => {
  it('defines a valid grid for every item frame', () => {
    for (const name of Object.values(ItemFrame)) {
      const grid = ITEM_FRAME_GRIDS[name];
      expect(grid, name).toBeDefined();
      expect(unknownSymbols(grid, ITEM_PALETTE), name).toEqual([]);
      expect(() => rasterizeGrid(grid, ITEM_PALETTE)).not.toThrow();
    }
  });
});

describe('overworld tiles', () => {
  it('draws every tile id at the tileset size', () => {
    for (let id = 0; id < TILE_COUNT; id++) {
      const draw = OVERWORLD_TILE_ART[id as keyof typeof OVERWORLD_TILE_ART];
      expect(draw, `tile ${id}`).toBeDefined();
      const tile = draw();
      expect([tile.width, tile.height]).toEqual([TILESET_LAYOUT.tileSize, TILESET_LAYOUT.tileSize]);
    }
  });

  it('puts grass on top of the ground-top tile only', () => {
    const top = OVERWORLD_TILE_ART[0]();
    const dirt = OVERWORLD_TILE_ART[1]();
    expect(getPixel(top, 8, 1)).not.toEqual(getPixel(dirt, 8, 1));
    expect(getPixel(top, 8, 12)).toEqual(getPixel(dirt, 8, 12));
  });
});
