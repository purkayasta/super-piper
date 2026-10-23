import { describe, expect, it } from 'vitest';
import { rasterizeGrid, unknownSymbols } from '../../asset-pipeline/pixel-grid';
import { getPixel } from '../../asset-pipeline/raster';
import { TILE_COUNT, TILESET_LAYOUT } from '../../game-engine/world/tile-ids';
import { gameplayAtlasFrames, tilesetTiles } from './art-sources';
import {
  EnemyFrame,
  ItemFrame,
  PIP_BIG_FRAMES,
  PIP_FRAME_HEIGHT,
  PIP_FRAME_WIDTH,
  PIP_LOOKS,
  PIP_SMALL_ART_SIZE,
  PIP_SMALL_FRAMES,
  PowerUpFrame,
  SCORE_LABELS,
  SPARK_LOOK,
  pipFrameName,
  scoreFrameName,
} from './atlas-frames';
import { ENEMY_FRAME_GRIDS, ENEMY_PALETTE } from './enemy-sprites';
import { ITEM_FRAME_GRIDS, ITEM_PALETTE } from './item-sprites';
import { OVERWORLD_TILE_ART } from './overworld-tiles';
import { PIP_BIG_GRIDS, PIP_LOOK_PALETTES, PIP_PALETTE, PIP_SMALL_GRIDS } from './pip-sprites';
import { POWER_UP_FRAME_GRIDS } from './power-up-sprites';
import { SCENERY_THEMES } from './scenery-layers';

function expectSize(grid: readonly string[], width: number, height: number): void {
  expect(grid).toHaveLength(height);
  grid.forEach((row, index) => expect(row.length, `row ${index}`).toBe(width));
}

describe('Pip sprites', () => {
  it.each(PIP_SMALL_FRAMES)('small frame %s is 16x16 and uses only palette symbols', (frame) => {
    const grid = PIP_SMALL_GRIDS[frame];
    expectSize(grid, PIP_SMALL_ART_SIZE, PIP_SMALL_ART_SIZE);
    expect(unknownSymbols(grid, PIP_PALETTE)).toEqual([]);
  });

  it.each(PIP_BIG_FRAMES)('big frame %s is 16x32 and uses only palette symbols', (frame) => {
    const grid = PIP_BIG_GRIDS[frame];
    expectSize(grid, PIP_FRAME_WIDTH, PIP_FRAME_HEIGHT);
    expect(unknownSymbols(grid, PIP_PALETTE)).toEqual([]);
  });

  it('keeps the approved idle design', () => {
    expect(PIP_SMALL_GRIDS.idle[3]).toBe('...KCCWCCCCCCK..');
    expect(PIP_SMALL_GRIDS.idle[15]).toBe('.KBBBBK.KBBBBK..');
  });

  it('stands every big frame on the bottom row except airborne poses', () => {
    const airborne = new Set(['big-jump', 'big-goal-grab']);
    for (const frame of PIP_BIG_FRAMES) {
      if (airborne.has(frame)) continue;
      expect(PIP_BIG_GRIDS[frame][PIP_FRAME_HEIGHT - 1], frame).toMatch(/K/);
    }
  });

  it('gives every look a full palette, and Spark differs from the courier', () => {
    for (const look of PIP_LOOKS) {
      expect(Object.keys(PIP_LOOK_PALETTES[look]).sort()).toEqual(Object.keys(PIP_PALETTE).sort());
    }
    expect(PIP_LOOK_PALETTES.forest['C']).not.toBe(PIP_PALETTE['C']);
    expect(PIP_LOOK_PALETTES.spark['J']).not.toBe(PIP_PALETTE['J']);
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

  it('draws the checkpoint post at Pip height', () => {
    expectSize(ITEM_FRAME_GRIDS[ItemFrame.checkpointUp], 16, 32);
    expectSize(ITEM_FRAME_GRIDS[ItemFrame.checkpointDown], 16, 32);
  });
});

describe('enemy sprites', () => {
  it('defines a valid 16-wide grid for every enemy frame', () => {
    for (const name of Object.values(EnemyFrame)) {
      const grid = ENEMY_FRAME_GRIDS[name];
      expect(grid, name).toBeDefined();
      const height =
        name === EnemyFrame.snapvineOpen || name === EnemyFrame.snapvineClosed ? 24 : 16;
      expectSize(grid, 16, height);
      expect(unknownSymbols(grid, ENEMY_PALETTE), name).toEqual([]);
    }
  });
});

describe('power-up sprites', () => {
  it('defines a valid grid for every power-up and parcel frame', () => {
    for (const name of Object.values(PowerUpFrame)) {
      const entry = POWER_UP_FRAME_GRIDS[name];
      expect(entry, name).toBeDefined();
      const size = name.startsWith('projectile/') ? 8 : 16;
      expectSize(entry.grid, size, size);
      expect(unknownSymbols(entry.grid, entry.palette), name).toEqual([]);
    }
  });
});

describe('gameplay atlas frames', () => {
  const frames = gameplayAtlasFrames();
  const byName = new Map(frames.map((frame) => [frame.name, frame.raster]));

  it('has unique frame names', () => {
    expect(byName.size).toBe(frames.length);
  });

  it('pads small Pip frames to the shared 16x32 frame with the feet on the bottom row', () => {
    const small = byName.get(pipFrameName('courier', 'idle'))!;
    expect([small.width, small.height]).toEqual([PIP_FRAME_WIDTH, PIP_FRAME_HEIGHT]);
    expect(getPixel(small, 8, 0)[3]).toBe(0);
    expect(getPixel(small, 2, PIP_FRAME_HEIGHT - 1)[3]).toBe(255);
  });

  it('has big frames for every outfit and the Spark look, but no small Spark frames', () => {
    for (const look of PIP_LOOKS) {
      expect(byName.has(pipFrameName(look, 'big-idle')), look).toBe(true);
    }
    expect(byName.has(pipFrameName(SPARK_LOOK, 'idle'))).toBe(false);
  });

  it('has a score pop-up frame for every label', () => {
    for (const label of SCORE_LABELS) expect(byName.has(scoreFrameName(label)), label).toBe(true);
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

  it('builds a complete tileset for every scenery theme', () => {
    for (const theme of SCENERY_THEMES) {
      const tiles = tilesetTiles(theme);
      expect(tiles).toHaveLength(TILE_COUNT);
      for (const tile of tiles) {
        expect([tile.width, tile.height]).toEqual([
          TILESET_LAYOUT.tileSize,
          TILESET_LAYOUT.tileSize,
        ]);
      }
    }
  });
});
