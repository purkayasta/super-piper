import { createRaster, getPixel, setPixel, type Raster } from './raster';

export interface TilesetLayout {
  readonly tileSize: number;
  readonly columns: number;
  readonly margin: number;
  readonly spacing: number;
}

export function buildTileset(tiles: readonly Raster[], layout: TilesetLayout): Raster {
  const { tileSize, columns, margin, spacing } = layout;
  if (spacing !== 2 * margin) {
    throw new Error('Tileset extrusion needs spacing equal to twice the margin');
  }
  const rows = Math.ceil(tiles.length / columns);
  const pitch = tileSize + spacing;
  const tileset = createRaster(columns * pitch, rows * pitch);
  tiles.forEach((tile, index) => {
    if (tile.width !== tileSize || tile.height !== tileSize) {
      throw new Error(`Tile ${index} is ${tile.width}x${tile.height}, expected ${tileSize}`);
    }
    const originX = (index % columns) * pitch + margin;
    const originY = Math.floor(index / columns) * pitch + margin;
    for (let y = -margin; y < tileSize + margin; y++) {
      for (let x = -margin; x < tileSize + margin; x++) {
        const sourceX = Math.min(tileSize - 1, Math.max(0, x));
        const sourceY = Math.min(tileSize - 1, Math.max(0, y));
        setPixel(tileset, originX + x, originY + y, getPixel(tile, sourceX, sourceY));
      }
    }
  });
  return tileset;
}
