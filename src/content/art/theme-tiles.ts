import { drawGrid, swapPalette, type PixelPalette } from '../../asset-pipeline/pixel-grid';
import {
  createRaster,
  fillRect,
  parseHex,
  setPixel,
  type Raster,
  type Rgba,
} from '../../asset-pipeline/raster';
import { TILESET_LAYOUT, Tile, type TileId } from '../../game-engine/world/tile-ids';
import {
  BATTLEMENT,
  BRICK_COURSES,
  OVERWORLD_TILE_ART,
  bevelledTile,
  pixelHash,
  sharedHazardTileArt,
  solidTile,
} from './overworld-tiles';

const SIZE = TILESET_LAYOUT.tileSize;
const HALF = SIZE / 2;
const SPECKLE_PERIOD = 19;
const DOOR_HALF_WIDTH = 6;
const DOOR_ARCH_CENTER_Y = 10;

interface Shades {
  readonly base: Rgba;
  readonly light: Rgba;
  readonly dark: Rgba;
}

interface BrickShades {
  readonly mortar: Rgba;
  readonly face: Rgba;
  readonly highlight: Rgba;
}

interface DepotShades {
  readonly stone: Rgba;
  readonly mortar: Rgba;
  readonly shadow: Rgba;
  readonly door: Rgba;
  readonly doorEdge: Rgba;
}

interface ThemeTileStyle {
  readonly groundTop: () => Raster;
  readonly ground: () => Raster;
  readonly brick: BrickShades;
  readonly solid: Shades;
  readonly depot: DepotShades;
}

function shades(base: string, light: string, dark: string): Shades {
  return { base: parseHex(base), light: parseHex(light), dark: parseHex(dark) };
}

function bricks(mortar: string, face: string, highlight: string): BrickShades {
  return { mortar: parseHex(mortar), face: parseHex(face), highlight: parseHex(highlight) };
}

function depot(stone: string, mortar: string, shadow: string, door: string, edge: string) {
  return {
    stone: parseHex(stone),
    mortar: parseHex(mortar),
    shadow: parseHex(shadow),
    door: parseHex(door),
    doorEdge: parseHex(edge),
  };
}

function stoneBlockTile(colors: Shades, litTop: boolean): Raster {
  const tile = solidTile(colors.base);
  for (let y = 0; y < SIZE; y++) {
    const offset = y < HALF ? 0 : HALF / 2;
    for (let x = 0; x < SIZE; x++) {
      const seamX = (x + offset) % HALF === HALF - 1;
      const seamY = y % HALF === HALF - 1;
      if (seamX || seamY) {
        setPixel(tile, x, y, colors.dark);
        continue;
      }
      const speckle = pixelHash(x, y + 5) % SPECKLE_PERIOD;
      if (speckle === 0) setPixel(tile, x, y, colors.dark);
      else if ((x + offset) % HALF === 0 || y % HALF === 0) setPixel(tile, x, y, colors.light);
    }
  }
  if (litTop) {
    fillRect(tile, 0, 0, SIZE, 1, colors.light);
    fillRect(tile, 0, 1, SIZE, 1, colors.base);
  }
  return tile;
}

const CLOUD_BODY = shades('#d9d2ee', '#f2eefc', '#aca2cf');
const CLOUD_TOP = parseHex('#ffffff');
const CLOUD_RIM = parseHex('#c6bce4');
const CLOUD_BUMPS: readonly (readonly [x: number, radius: number])[] = [
  [2, 3],
  [8, 4],
  [14, 3],
];

function cloudBodyTile(): Raster {
  const tile = solidTile(CLOUD_BODY.base);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const puff = pixelHash(x >> 2, (y + 2) >> 2) % 5;
      if (puff === 0) setPixel(tile, x, y, CLOUD_BODY.light);
      else if (pixelHash(x, y) % 23 === 0) setPixel(tile, x, y, CLOUD_BODY.dark);
    }
  }
  return tile;
}

function cloudTopTile(): Raster {
  const tile = cloudBodyTile();
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < SIZE; x++) {
      let inside = y < 2;
      for (const [centre, radius] of CLOUD_BUMPS) {
        const dx = x + 0.5 - centre;
        const dy = y + 0.5 - 1;
        if (dx * dx + dy * dy <= (radius + 2) * (radius + 2)) inside = true;
      }
      setPixel(tile, x, y, inside ? CLOUD_TOP : CLOUD_RIM);
    }
  }
  return tile;
}

const CELLAR_STONE = shades('#5a6a86', '#7f90ad', '#38445c');
const KEEP_STONE = shades('#4a4752', '#6a6672', '#2c2a33');

const UNDERGROUND_STYLE: ThemeTileStyle = {
  groundTop: () => stoneBlockTile(CELLAR_STONE, true),
  ground: () => stoneBlockTile(CELLAR_STONE, false),
  brick: bricks('#1e2a34', '#4f8a92', '#8cc4c8'),
  solid: shades('#5f7290', '#93a6c4', '#323d52'),
  depot: depot('#9aa6bc', '#4a5468', '#7a86a0', '#10141e', '#3a4458'),
};

const SKY_STYLE: ThemeTileStyle = {
  groundTop: cloudTopTile,
  ground: cloudBodyTile,
  brick: bricks('#6a4a2a', '#d6a868', '#f4d39a'),
  solid: shades('#c8b48c', '#efe2bc', '#8a7450'),
  depot: depot('#efe6cf', '#a89a78', '#cfc2a0', '#2a1a10', '#5a3a1e'),
};

const CASTLE_STYLE: ThemeTileStyle = {
  groundTop: () => stoneBlockTile(KEEP_STONE, true),
  ground: () => stoneBlockTile(KEEP_STONE, false),
  brick: bricks('#1c1a22', '#77737e', '#a6a2ae'),
  solid: shades('#5c5866', '#8a8696', '#2e2c36'),
  depot: depot('#8a8494', '#3c3846', '#6e6878', '#120e16', '#4a2c1c'),
};

function brickTile(colors: BrickShades): Raster {
  const tile = solidTile(colors.mortar);
  for (const [row, column, width] of BRICK_COURSES)
    fillRect(tile, column, row, width, 3, colors.face);
  for (const [row, column, width] of BRICK_COURSES)
    fillRect(tile, column, row, width, 1, colors.highlight);
  return tile;
}

function depotWallTile(colors: DepotShades): Raster {
  const tile = solidTile(colors.mortar);
  for (const [row, column, width] of BRICK_COURSES)
    fillRect(tile, column, row, width, 3, colors.stone);
  for (const [row, column, width] of BRICK_COURSES)
    fillRect(tile, column, row + 2, width, 1, colors.shadow);
  return tile;
}

function depotBattlementTile(colors: DepotShades): Raster {
  const tile = createRaster(SIZE, SIZE);
  const palette: PixelPalette = swapPalette(
    { K: '#1a1020', S: '#000000', D: '#000000', M: '#000000' },
    { S: hex(colors.stone), D: hex(colors.shadow), M: hex(colors.mortar) },
  );
  drawGrid(tile, BATTLEMENT, palette, 0, 0);
  return tile;
}

function depotDoorTopTile(colors: DepotShades): Raster {
  const tile = depotWallTile(colors);
  for (let y = DOOR_ARCH_CENTER_Y - DOOR_HALF_WIDTH; y < SIZE; y++) {
    const rise = Math.max(0, DOOR_ARCH_CENTER_Y - y);
    const halfWidth = Math.round(Math.sqrt(DOOR_HALF_WIDTH ** 2 - rise * rise));
    fillRect(tile, HALF - halfWidth, y, 2 * halfWidth, 1, colors.door);
    setPixel(tile, HALF - halfWidth - 1, y, colors.doorEdge);
    setPixel(tile, HALF + halfWidth, y, colors.doorEdge);
  }
  return tile;
}

function depotDoorTile(colors: DepotShades): Raster {
  const tile = depotWallTile(colors);
  fillRect(tile, 2, 0, SIZE - 4, SIZE, colors.door);
  fillRect(tile, 1, 0, 1, SIZE, colors.doorEdge);
  fillRect(tile, SIZE - 2, 0, 1, SIZE, colors.doorEdge);
  return tile;
}

function hex(color: Rgba): string {
  return `#${[color[0], color[1], color[2]].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

function themeTileArt(style: ThemeTileStyle): Readonly<Record<TileId, () => Raster>> {
  return {
    ...OVERWORLD_TILE_ART,
    [Tile.groundTop]: style.groundTop,
    [Tile.ground]: style.ground,
    [Tile.brick]: () => brickTile(style.brick),
    [Tile.solidBlock]: () =>
      bevelledTile(style.solid.base, style.solid.light, style.solid.dark, 2),
    [Tile.depotWall]: () => depotWallTile(style.depot),
    [Tile.depotBattlement]: () => depotBattlementTile(style.depot),
    [Tile.depotDoorTop]: () => depotDoorTopTile(style.depot),
    [Tile.depotDoor]: () => depotDoorTile(style.depot),
    ...sharedHazardTileArt(),
  };
}

export const UNDERGROUND_TILE_ART = themeTileArt(UNDERGROUND_STYLE);

export const SKY_TILE_ART = themeTileArt(SKY_STYLE);

export const CASTLE_TILE_ART = themeTileArt(CASTLE_STYLE);
