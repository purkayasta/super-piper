import type { CellCoordinate } from './level-format';

export interface PickupInset {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
}

const NO_PICKUP = -1;

export class PickupField {
  private readonly cells: Int16Array;
  private remainingCount: number;

  constructor(
    private readonly columns: number,
    private readonly rows: number,
    pickups: readonly CellCoordinate[],
    private readonly tileSize: number,
    private readonly inset: PickupInset,
  ) {
    this.cells = new Int16Array(columns * rows).fill(NO_PICKUP);
    pickups.forEach(({ column, row }, index) => {
      this.cells[row * columns + column] = index;
    });
    this.remainingCount = pickups.length;
  }

  get remaining(): number {
    return this.remainingCount;
  }

  collectCell(column: number, row: number): number {
    if (column < 0 || row < 0 || column >= this.columns || row >= this.rows) return NO_PICKUP;
    const cell = row * this.columns + column;
    const index = this.cells[cell];
    if (index === NO_PICKUP) return NO_PICKUP;
    this.cells[cell] = NO_PICKUP;
    this.remainingCount--;
    return index;
  }

  collectOverlapping(
    left: number,
    top: number,
    right: number,
    bottom: number,
    collected: number[],
  ): number {
    const size = this.tileSize;
    const { x: insetX, top: insetTop, bottom: insetBottom } = this.inset;
    let count = 0;
    const firstColumn = Math.floor((left - size + insetX) / size) + 1;
    const lastColumn = Math.ceil((right - insetX) / size) - 1;
    const firstRow = Math.floor((top - size + insetBottom) / size) + 1;
    const lastRow = Math.ceil((bottom - insetTop) / size) - 1;
    for (let row = Math.max(0, firstRow); row <= Math.min(this.rows - 1, lastRow); row++) {
      for (
        let column = Math.max(0, firstColumn);
        column <= Math.min(this.columns - 1, lastColumn);
        column++
      ) {
        const index = this.collectCell(column, row);
        if (index !== NO_PICKUP) collected[count++] = index;
      }
    }
    return count;
  }
}
