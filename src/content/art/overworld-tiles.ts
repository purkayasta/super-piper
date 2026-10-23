import {
  drawGrid,
  swapPalette,
  type PixelGrid,
  type PixelPalette,
} from '../../asset-pipeline/pixel-grid';
import {
  createRaster,
  fillRect,
  parseHex,
  setPixel,
  type Raster,
  type Rgba,
} from '../../asset-pipeline/raster';
import { TILESET_LAYOUT, Tile, type TileId } from '../../game-engine/world/tile-ids';

const SIZE = TILESET_LAYOUT.tileSize;
const SPECKLE_PERIOD = 23;
const DOOR_HALF_WIDTH = 6;
const DOOR_ARCH_CENTER_Y = 10;
const DOOR_ARCH_TOP = DOOR_ARCH_CENTER_Y - DOOR_HALF_WIDTH;

const OUTLINE = parseHex('#1a1020');

const DIRT = {
  base: parseHex('#b8642c'),
  dark: parseHex('#7a3a14'),
  light: parseHex('#e09a5c'),
} as const;

const GRASS = {
  base: parseHex('#4cc04c'),
  highlight: parseHex('#9ef07a'),
  blade: parseHex('#2a8a2a'),
} as const;

const BRICK = {
  mortar: parseHex('#3a1a10'),
  face: parseHex('#c85a3c'),
  highlight: parseHex('#f0a070'),
} as const;

const USED_BLOCK = {
  face: parseHex('#8a5a2e'),
  light: parseHex('#b07a44'),
  dark: parseHex('#4a2c14'),
} as const;

const SOLID_BLOCK = {
  face: parseHex('#b0703c'),
  light: parseHex('#e8a868'),
  dark: parseHex('#5e3218'),
} as const;

const TUBE = {
  base: parseHex('#2c9cc0'),
  highlight: parseHex('#9ce2f2'),
  shade: parseHex('#17698c'),
  band: parseHex('#ffd23a'),
  bandShade: parseHex('#d89a1c'),
} as const;

const TUBE_BAND_TOP = 7;
const TUBE_BAND_HEIGHT = 2;

const DEPOT = {
  stone: parseHex('#e2cfa4'),
  mortar: parseHex('#8a7650'),
  shadow: parseHex('#b8a27a'),
  door: parseHex('#2a1a10'),
  doorEdge: parseHex('#5a3a1e'),
} as const;

const BRICK_COURSES: readonly (readonly [row: number, column: number, width: number])[] = [
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

const STAR_BLOCK: PixelGrid = [
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

const STAR_GLINT_PALETTE = swapPalette(STAR_BLOCK_PALETTE, { W: '#fff1a8', A: '#ffc21a' });
const STAR_SHINE_PALETTE = swapPalette(STAR_BLOCK_PALETTE, { W: '#ffe46a', Y: '#fff7c8' });

const BATTLEMENT: PixelGrid = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  'KKKKKK....KKKKKK',
  'KSSSSK....KSSSSK',
  'KSSSSK....KSSSSK',
  'KSSSSK....KSSSSK',
  'KSSSSKKKKKKSSSSK',
  'KSSSSSSSSSSSSSSK',
  'KDDDDDDDDDDDDDDK',
  'SSSSSSSSSSSSSSSS',
  'SSSSSSSSSSSSSSSS',
  'MMMMMMMMMMMMMMMM',
];

const BATTLEMENT_PALETTE: PixelPalette = {
  K: '#1a1020',
  S: '#e2cfa4',
  D: '#b8a27a',
  M: '#8a7650',
};

export const OVERWORLD_TILE_ART: Readonly<Record<TileId, () => Raster>> = {
  [Tile.groundTop]: () => {
    const tile = dirtTile();
    fillRect(tile, 0, 0, SIZE, 4, GRASS.base);
    fillRect(tile, 0, 0, SIZE, 1, GRASS.highlight);
    for (let x = 0; x < SIZE; x++) if (x % 3 !== 0) setPixel(tile, x, 4, GRASS.blade);
    for (let x = 1; x < SIZE; x += 5) setPixel(tile, x, 5, GRASS.blade);
    return tile;
  },
  [Tile.ground]: dirtTile,
  [Tile.brick]: () => {
    const tile = solidTile(BRICK.mortar);
    for (const [row, column, width] of BRICK_COURSES)
      fillRect(tile, column, row, width, 3, BRICK.face);
    for (const [row, column, width] of BRICK_COURSES)
      fillRect(tile, column, row, width, 1, BRICK.highlight);
    return tile;
  },
  [Tile.starBlock]: () => gridTile(STAR_BLOCK, STAR_BLOCK_PALETTE),
  [Tile.starBlockGlint]: () => gridTile(STAR_BLOCK, STAR_GLINT_PALETTE),
  [Tile.starBlockShine]: () => gridTile(STAR_BLOCK, STAR_SHINE_PALETTE),
  [Tile.usedBlock]: () => {
    const tile = bevelledTile(USED_BLOCK.face, USED_BLOCK.light, USED_BLOCK.dark, 1);
    for (const [x, y] of [
      [3, 3],
      [12, 3],
      [3, 12],
      [12, 12],
    ]) {
      setPixel(tile, x, y, USED_BLOCK.dark);
      setPixel(tile, x - 1, y - 1, USED_BLOCK.light);
    }
    return tile;
  },
  [Tile.solidBlock]: () => bevelledTile(SOLID_BLOCK.face, SOLID_BLOCK.light, SOLID_BLOCK.dark, 2),
  [Tile.tubeTopLeft]: () => tubeRimTile('left'),
  [Tile.tubeTopRight]: () => tubeRimTile('right'),
  [Tile.tubeBodyLeft]: () => tubeBodyTile('left', 0, SIZE),
  [Tile.tubeBodyRight]: () => tubeBodyTile('right', 0, SIZE),
  [Tile.depotWall]: () => {
    const tile = solidTile(DEPOT.mortar);
    for (const [row, column, width] of BRICK_COURSES)
      fillRect(tile, column, row, width, 3, DEPOT.stone);
    for (const [row, column, width] of BRICK_COURSES)
      fillRect(tile, column, row + 2, width, 1, DEPOT.shadow);
    return tile;
  },
  [Tile.depotBattlement]: () => gridTile(BATTLEMENT, BATTLEMENT_PALETTE),
  [Tile.depotDoorTop]: () => {
    const tile = OVERWORLD_TILE_ART[Tile.depotWall]();
    for (let y = DOOR_ARCH_TOP; y < SIZE; y++) {
      const rise = Math.max(0, DOOR_ARCH_CENTER_Y - y);
      const halfWidth = Math.round(Math.sqrt(DOOR_HALF_WIDTH ** 2 - rise * rise));
      const centre = SIZE / 2;
      fillRect(tile, centre - halfWidth, y, 2 * halfWidth, 1, DEPOT.door);
      setPixel(tile, centre - halfWidth - 1, y, DEPOT.doorEdge);
      setPixel(tile, centre + halfWidth, y, DEPOT.doorEdge);
    }
    return tile;
  },
  [Tile.depotDoor]: () => {
    const tile = OVERWORLD_TILE_ART[Tile.depotWall]();
    fillRect(tile, 2, 0, SIZE - 4, SIZE, DEPOT.door);
    fillRect(tile, 1, 0, 1, SIZE, DEPOT.doorEdge);
    fillRect(tile, SIZE - 2, 0, 1, SIZE, DEPOT.doorEdge);
    return tile;
  },
};

function dirtTile(): Raster {
  const tile = solidTile(DIRT.base);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const speckle = pixelHash(x, y) % SPECKLE_PERIOD;
      if (speckle === 0) setPixel(tile, x, y, DIRT.dark);
      else if (speckle === 1) setPixel(tile, x, y, DIRT.light);
    }
  }
  return tile;
}

function solidTile(color: Rgba): Raster {
  const tile = createRaster(SIZE, SIZE);
  fillRect(tile, 0, 0, SIZE, SIZE, color);
  return tile;
}

function gridTile(grid: PixelGrid, palette: PixelPalette): Raster {
  const tile = createRaster(SIZE, SIZE);
  drawGrid(tile, grid, palette, 0, 0);
  return tile;
}

function bevelledTile(face: Rgba, light: Rgba, dark: Rgba, bevel: number): Raster {
  const tile = solidTile(face);
  fillRect(tile, 0, 0, SIZE, bevel, light);
  fillRect(tile, 0, 0, bevel, SIZE, light);
  fillRect(tile, 0, SIZE - bevel, SIZE, bevel, dark);
  fillRect(tile, SIZE - bevel, 0, bevel, SIZE, dark);
  fillRect(tile, 0, 0, SIZE, 1, OUTLINE);
  fillRect(tile, 0, SIZE - 1, SIZE, 1, OUTLINE);
  fillRect(tile, 0, 0, 1, SIZE, OUTLINE);
  fillRect(tile, SIZE - 1, 0, 1, SIZE, OUTLINE);
  return tile;
}

function tubeRimTile(side: 'left' | 'right'): Raster {
  const tile = tubeBodyTile(side, 12, SIZE);
  fillRect(tile, 0, 0, SIZE, 12, TUBE.base);
  fillRect(tile, 0, 0, SIZE, 1, OUTLINE);
  fillRect(tile, 0, 11, SIZE, 1, OUTLINE);
  fillRect(tile, 0, TUBE_BAND_TOP, SIZE, TUBE_BAND_HEIGHT, TUBE.band);
  fillRect(tile, 0, TUBE_BAND_TOP + TUBE_BAND_HEIGHT - 1, SIZE, 1, TUBE.bandShade);
  if (side === 'left') {
    fillRect(tile, 0, 0, 1, 12, OUTLINE);
    fillRect(tile, 2, 1, 3, 10, TUBE.highlight);
    fillRect(tile, 1, 1, 1, 10, TUBE.shade);
  } else {
    fillRect(tile, SIZE - 1, 0, 1, 12, OUTLINE);
    fillRect(tile, SIZE - 5, 1, 4, 10, TUBE.shade);
  }
  return tile;
}

function tubeBodyTile(side: 'left' | 'right', fromRow: number, toRow: number): Raster {
  const tile = createRaster(SIZE, SIZE);
  const height = toRow - fromRow;
  if (side === 'left') {
    fillRect(tile, 2, fromRow, SIZE - 2, height, TUBE.base);
    fillRect(tile, 2, fromRow, 1, height, OUTLINE);
    fillRect(tile, 3, fromRow, 1, height, TUBE.shade);
    fillRect(tile, 5, fromRow, 3, height, TUBE.highlight);
  } else {
    fillRect(tile, 0, fromRow, SIZE - 2, height, TUBE.base);
    fillRect(tile, SIZE - 6, fromRow, 3, height, TUBE.shade);
    fillRect(tile, SIZE - 3, fromRow, 1, height, OUTLINE);
  }
  return tile;
}

function pixelHash(x: number, y: number): number {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}
