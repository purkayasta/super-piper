export type PixelTarget = Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>;

export type PixelPalette = Readonly<Record<string, string>>;

export const EMPTY_TILE = -1;

export const PlaceholderTile = { ground: 0, brick: 1, star: 2 } as const;

export const PLACEHOLDER_TILESET_KEY = 'placeholder-tiles';

export const PLACEHOLDER_TILE_COUNT = 3;

export const SOLID_PLACEHOLDER_TILES: readonly number[] = [
  PlaceholderTile.ground,
  PlaceholderTile.brick,
  PlaceholderTile.star,
];

const GROUND = {
  base: '#b8642c',
  dark: '#7a3a14',
  light: '#e09a5c',
} as const;

const BRICK = { mortar: '#3a1a10', face: '#c85a3c', highlight: '#f0a070' } as const;

const BRICK_COURSES: readonly (readonly [number, number, number])[] = [
  [0, 0, 7],
  [0, 8, 7],
  [4, 0, 3],
  [4, 4, 7],
  [4, 12, 4],
  [8, 0, 7],
  [8, 8, 7],
  [12, 0, 3],
  [12, 4, 7],
  [12, 12, 4],
];

const STAR_BLOCK_PALETTE: PixelPalette = {
  Z: '#a05a00',
  A: '#f8b800',
  Y: '#ffd23a',
  W: '#ffffff',
};

const STAR_BLOCK: readonly string[] = [
  'ZZZZZZZZZZZZZZZZ',
  'ZAYAAAAAAAAAAYAZ',
  'ZYAAAAAAAAAAAAYZ',
  'ZAAAAAAWAAAAAAAZ',
  'ZAAAAAAWWAAAAAAZ',
  'ZAAAAAWWWAAAAAAZ',
  'ZAWWWWWWWWWWWAAZ',
  'ZAAWWWWWWWWWAZAZ',
  'ZAAAWWWWWWWAZAAZ',
  'ZAAAAWWWWWWZAAAZ',
  'ZAAAWWWZWWWWAAAZ',
  'ZAAWWWZAAZWWWAAZ',
  'ZAAWZZAAAAZZWZAZ',
  'ZYAAAAAAAAAAAAYZ',
  'ZAYAAAAAAAAAAYAZ',
  'ZZZZZZZZZZZZZZZZ',
];

const SPECKLE_PERIOD = 23;

export function drawPixelGrid(
  target: PixelTarget,
  grid: readonly string[],
  palette: PixelPalette,
  originX: number,
  originY: number,
): void {
  for (let row = 0; row < grid.length; row++) {
    const line = grid[row];
    for (let column = 0; column < line.length; column++) {
      const symbol = line[column];
      if (!Object.hasOwn(palette, symbol)) continue;
      target.fillStyle = palette[symbol];
      target.fillRect(originX + column, originY + row, 1, 1);
    }
  }
}

export function drawPlaceholderTileset(target: PixelTarget, tileSize: number): void {
  drawGround(target, PlaceholderTile.ground * tileSize, tileSize);
  drawBrick(target, PlaceholderTile.brick * tileSize, tileSize);
  drawPixelGrid(target, STAR_BLOCK, STAR_BLOCK_PALETTE, PlaceholderTile.star * tileSize, 0);
}

function drawGround(target: PixelTarget, originX: number, size: number): void {
  target.fillStyle = GROUND.base;
  target.fillRect(originX, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const speckle = pixelHash(x, y) % SPECKLE_PERIOD;
      if (speckle > 1) continue;
      target.fillStyle = speckle === 0 ? GROUND.dark : GROUND.light;
      target.fillRect(originX + x, y, 1, 1);
    }
  }
  target.fillStyle = GROUND.light;
  target.fillRect(originX, 0, size, 1);
  target.fillRect(originX, 0, 1, size);
  target.fillStyle = GROUND.dark;
  target.fillRect(originX, size - 1, size, 1);
  target.fillRect(originX + size - 1, 0, 1, size);
}

function drawBrick(target: PixelTarget, originX: number, size: number): void {
  target.fillStyle = BRICK.mortar;
  target.fillRect(originX, 0, size, size);
  target.fillStyle = BRICK.face;
  for (const [y, x, width] of BRICK_COURSES) target.fillRect(originX + x, y, width, 3);
  target.fillStyle = BRICK.highlight;
  for (const [y, x, width] of BRICK_COURSES) target.fillRect(originX + x, y, width, 1);
}

function pixelHash(x: number, y: number): number {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}
