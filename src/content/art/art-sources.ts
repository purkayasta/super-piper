import type { AtlasFrameInput } from '../../asset-pipeline/atlas-packer';
import { outlinedTextGrid } from '../../asset-pipeline/pixel-font';
import { padGridTop, rasterizeGrid, type PixelPalette } from '../../asset-pipeline/pixel-grid';
import type { Raster } from '../../asset-pipeline/raster';
import { TILE_COUNT, type TileId } from '../../game-engine/world/tile-ids';
import {
  ItemFrame,
  PIP_BIG_FRAMES,
  PIP_FRAME_HEIGHT,
  PIP_LOOKS,
  PIP_OUTFITS,
  PIP_SMALL_FRAMES,
  SCORE_LABELS,
  pipFrameName,
  scoreFrameName,
} from './atlas-frames';
import { ENEMY_FRAME_GRIDS, ENEMY_PALETTE } from './enemy-sprites';
import { ITEM_FRAME_GRIDS, ITEM_PALETTE } from './item-sprites';
import { OVERWORLD_TILE_ART } from './overworld-tiles';
import { PIP_BIG_GRIDS, PIP_LOOK_PALETTES, PIP_SMALL_GRIDS } from './pip-sprites';
import { POWER_UP_FRAME_GRIDS } from './power-up-sprites';
import type { SceneryTheme } from './scenery-layers';

export const SCORE_TEXT_PALETTE: PixelPalette = { K: '#1a1020', W: '#ffffff' };

const TILE_ART_BY_THEME: Readonly<Record<SceneryTheme, Readonly<Record<TileId, () => Raster>>>> = {
  overworld: OVERWORLD_TILE_ART,
};

export function gameplayAtlasFrames(): AtlasFrameInput[] {
  const frames: AtlasFrameInput[] = [];
  for (const outfit of PIP_OUTFITS) {
    for (const frame of PIP_SMALL_FRAMES) {
      const grid = padGridTop(PIP_SMALL_GRIDS[frame], PIP_FRAME_HEIGHT);
      frames.push({
        name: pipFrameName(outfit, frame),
        raster: rasterizeGrid(grid, PIP_LOOK_PALETTES[outfit]),
      });
    }
  }
  for (const look of PIP_LOOKS) {
    for (const frame of PIP_BIG_FRAMES) {
      frames.push({
        name: pipFrameName(look, frame),
        raster: rasterizeGrid(PIP_BIG_GRIDS[frame], PIP_LOOK_PALETTES[look]),
      });
    }
  }
  for (const name of Object.values(ItemFrame)) {
    frames.push({ name, raster: rasterizeGrid(ITEM_FRAME_GRIDS[name], ITEM_PALETTE) });
  }
  for (const [name, grid] of Object.entries(ENEMY_FRAME_GRIDS)) {
    frames.push({ name, raster: rasterizeGrid(grid, ENEMY_PALETTE) });
  }
  for (const [name, { grid, palette }] of Object.entries(POWER_UP_FRAME_GRIDS)) {
    frames.push({ name, raster: rasterizeGrid(grid, palette) });
  }
  for (const label of SCORE_LABELS) {
    frames.push({
      name: scoreFrameName(label),
      raster: rasterizeGrid(outlinedTextGrid(label), SCORE_TEXT_PALETTE),
    });
  }
  return frames;
}

export function tilesetTiles(theme: SceneryTheme): Raster[] {
  const art = TILE_ART_BY_THEME[theme];
  return Array.from({ length: TILE_COUNT }, (_, id) => art[id as TileId]());
}
