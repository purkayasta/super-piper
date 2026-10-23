import type { BlockItem } from './level-format';
import { Tile, isStarBlock } from './tile-ids';

export type BlockHitOutcome =
  'release-coin' | 'release-item' | 'multi-coin' | 'break' | 'bump' | 'none';

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

export function blockHitOutcome(
  tile: number,
  item: BlockItem | null = null,
  canBreakBricks = false,
): BlockHitOutcome {
  if (!isStarBlock(tile) && tile !== Tile.brick) return 'none';
  if (item === 'multi-coin') return 'multi-coin';
  if (item !== null) return 'release-item';
  if (isStarBlock(tile)) return 'release-coin';
  return canBreakBricks ? 'break' : 'bump';
}

export function hiddenBlockOutcome(item: BlockItem | null): BlockHitOutcome {
  return blockHitOutcome(Tile.starBlock, item);
}
