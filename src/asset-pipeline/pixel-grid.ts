import { createRaster, parseHex, setPixel, type Raster } from './raster';

export type PixelGrid = readonly string[];

export type PixelPalette = Readonly<Record<string, string>>;

export const TRANSPARENT_SYMBOL = '.';

export function rasterizeGrid(grid: PixelGrid, palette: PixelPalette): Raster {
  const raster = createRaster(grid.length > 0 ? grid[0].length : 0, grid.length);
  drawGrid(raster, grid, palette, 0, 0);
  return raster;
}

export function drawGrid(
  raster: Raster,
  grid: PixelGrid,
  palette: PixelPalette,
  originX: number,
  originY: number,
): void {
  for (let row = 0; row < grid.length; row++) {
    const line = grid[row];
    if (line.length !== grid[0].length) {
      throw new Error(`Grid row ${row} has length ${line.length}, expected ${grid[0].length}`);
    }
    for (let column = 0; column < line.length; column++) {
      const symbol = line[column];
      if (symbol === TRANSPARENT_SYMBOL) continue;
      if (!Object.hasOwn(palette, symbol)) {
        throw new Error(`Unknown palette symbol "${symbol}" at row ${row}, col ${column}`);
      }
      setPixel(raster, originX + column, originY + row, parseHex(palette[symbol]));
    }
  }
}

export function swapPalette(base: PixelPalette, overrides: PixelPalette): PixelPalette {
  for (const symbol of Object.keys(overrides)) {
    if (!Object.hasOwn(base, symbol)) {
      throw new Error(`Palette swap overrides unknown symbol "${symbol}"`);
    }
  }
  return { ...base, ...overrides };
}

export function mirrorGrid(grid: PixelGrid): PixelGrid {
  return grid.map((row) => [...row].reverse().join(''));
}

export function unknownSymbols(grid: PixelGrid, palette: PixelPalette): string[] {
  const unknown = new Set<string>();
  for (const row of grid) {
    for (const symbol of row) {
      if (symbol !== TRANSPARENT_SYMBOL && !Object.hasOwn(palette, symbol)) unknown.add(symbol);
    }
  }
  return [...unknown];
}
