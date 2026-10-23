export const EMPTY_TILE = -1;

export const Tile = {
  groundTop: 0,
  ground: 1,
  brick: 2,
  starBlock: 3,
  starBlockGlint: 4,
  starBlockShine: 5,
  usedBlock: 6,
  solidBlock: 7,
  tubeTopLeft: 8,
  tubeTopRight: 9,
  tubeBodyLeft: 10,
  tubeBodyRight: 11,
  depotWall: 12,
  depotBattlement: 13,
  depotDoorTop: 14,
  depotDoor: 15,
} as const;

export type TileId = (typeof Tile)[keyof typeof Tile];

export const TILE_COUNT = 16;

export const TILESET_LAYOUT = { tileSize: 16, columns: 4, margin: 1, spacing: 2 } as const;

export const SOLID_TILES: readonly TileId[] = [
  Tile.groundTop,
  Tile.ground,
  Tile.brick,
  Tile.starBlock,
  Tile.starBlockGlint,
  Tile.starBlockShine,
  Tile.usedBlock,
  Tile.solidBlock,
  Tile.tubeTopLeft,
  Tile.tubeTopRight,
  Tile.tubeBodyLeft,
  Tile.tubeBodyRight,
];

export const STAR_BLOCK_CYCLE: readonly TileId[] = [
  Tile.starBlock,
  Tile.starBlock,
  Tile.starBlockGlint,
  Tile.starBlockShine,
  Tile.starBlockGlint,
];

export function isStarBlock(tile: number): boolean {
  return tile === Tile.starBlock || tile === Tile.starBlockGlint || tile === Tile.starBlockShine;
}

export function isGround(tile: number): boolean {
  return tile === Tile.groundTop || tile === Tile.ground;
}
