import type { Box } from '../entities/actors/actor-body';
import { EMPTY_TILE, isLavaSurface } from './tile-ids';

export interface HazardInsets {
  readonly surfaceInsetPx: number;
  readonly sideInsetPx: number;
}

const EDGE_EPSILON = 1e-6;

export class HazardField {
  readonly empty: boolean;

  constructor(
    private readonly grid: readonly (readonly number[])[],
    private readonly tileSize: number,
    private readonly insets: HazardInsets,
  ) {
    this.empty = !grid.some((row) => row.some((tile) => tile !== EMPTY_TILE));
  }

  touches(box: Box): boolean {
    if (this.empty) return false;
    const size = this.tileSize;
    const left = box.x + this.insets.sideInsetPx;
    const right = box.x + box.width - this.insets.sideInsetPx;
    if (right <= left) return false;
    const bottom = box.y + box.height;
    const firstColumn = Math.floor(left / size);
    const lastColumn = Math.floor((right - EDGE_EPSILON) / size);
    const firstRow = Math.max(0, Math.floor(box.y / size));
    const lastRow = Math.min(this.grid.length - 1, Math.floor((bottom - EDGE_EPSILON) / size));
    for (let row = firstRow; row <= lastRow; row++) {
      const cells = this.grid[row];
      for (let column = firstColumn; column <= lastColumn; column++) {
        const tile = cells[column] ?? EMPTY_TILE;
        if (tile === EMPTY_TILE) continue;
        const top = row * size + (isLavaSurface(tile) ? this.insets.surfaceInsetPx : 0);
        if (bottom > top) return true;
      }
    }
    return false;
  }
}
