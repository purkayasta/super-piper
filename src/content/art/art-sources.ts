import type { AtlasFrameInput } from '../../asset-pipeline/atlas-packer';
import { rasterizeGrid } from '../../asset-pipeline/pixel-grid';
import type { Raster } from '../../asset-pipeline/raster';
import { TILE_COUNT, type TileId } from '../../game-engine/world/tile-ids';
import { ItemFrame, PIP_FRAMES, PIP_OUTFITS, pipFrameName } from './atlas-frames';
import { ITEM_FRAME_GRIDS, ITEM_PALETTE } from './item-sprites';
import { OVERWORLD_TILE_ART } from './overworld-tiles';
import { PIP_FRAME_GRIDS, PIP_OUTFIT_PALETTES } from './pip-sprites';
import type { SceneryTheme } from './scenery-layers';

const TILE_ART_BY_THEME: Readonly<Record<SceneryTheme, Readonly<Record<TileId, () => Raster>>>> = {
  overworld: OVERWORLD_TILE_ART,
};

export function gameplayAtlasFrames(): AtlasFrameInput[] {
  const frames: AtlasFrameInput[] = [];
  for (const outfit of PIP_OUTFITS) {
    for (const frame of PIP_FRAMES) {
      frames.push({
        name: pipFrameName(outfit, frame),
        raster: rasterizeGrid(PIP_FRAME_GRIDS[frame], PIP_OUTFIT_PALETTES[outfit]),
      });
    }
  }
  for (const name of Object.values(ItemFrame)) {
    frames.push({ name, raster: rasterizeGrid(ITEM_FRAME_GRIDS[name], ITEM_PALETTE) });
  }
  return frames;
}

export function tilesetTiles(theme: SceneryTheme): Raster[] {
  const art = TILE_ART_BY_THEME[theme];
  return Array.from({ length: TILE_COUNT }, (_, id) => art[id as TileId]());
}
