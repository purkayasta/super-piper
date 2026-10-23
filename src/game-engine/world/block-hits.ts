import { Tile, isStarBlock } from './tile-ids';

export type BlockHitOutcome = 'release-coin' | 'bump' | 'none';

const EDGE_EPSILON = 1e-6;

export function headRow(bodyTop: number, tileSize: number): number {
  return Math.floor((bodyTop - 1) / tileSize);
}

export function pickBumpedColumn(
  bodyLeft: number,
  bodyRight: number,
  row: number,
  tileSize: number,
  isSolid: (column: number, row: number) => boolean,
): number | null {
  const firstColumn = Math.floor(bodyLeft / tileSize);
  const lastColumn = Math.floor((bodyRight - EDGE_EPSILON) / tileSize);
  const centreColumn = Math.floor((bodyLeft + bodyRight) / 2 / tileSize);
  if (isSolid(centreColumn, row)) return centreColumn;
  for (let column = firstColumn; column <= lastColumn; column++) {
    if (isSolid(column, row)) return column;
  }
  return null;
}

export function blockHitOutcome(tile: number): BlockHitOutcome {
  if (isStarBlock(tile)) return 'release-coin';
  if (tile === Tile.brick) return 'bump';
  return 'none';
}
