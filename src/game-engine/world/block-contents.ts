import type { BlockItem, BlockItemCell, CellCoordinate } from './level-format';

export interface MultiCoinRules {
  readonly windowMs: number;
  readonly maxCoins: number;
}

export class BlockContents {
  private readonly items: (BlockItem | null)[];
  private readonly hidden: Uint8Array;
  private readonly coinsGiven: Int16Array;
  private readonly firstHitMs: Float64Array;

  constructor(
    private readonly columns: number,
    private readonly rows: number,
    items: readonly BlockItemCell[],
    hiddenBlocks: readonly CellCoordinate[],
    private readonly multiCoin: MultiCoinRules,
  ) {
    const cellCount = columns * rows;
    this.items = new Array<BlockItem | null>(cellCount).fill(null);
    this.hidden = new Uint8Array(cellCount);
    this.coinsGiven = new Int16Array(cellCount);
    this.firstHitMs = new Float64Array(cellCount);
    for (const { column, row, item } of items) this.items[this.cell(column, row)] = item;
    for (const { column, row } of hiddenBlocks) this.hidden[this.cell(column, row)] = 1;
  }

  itemAt(column: number, row: number): BlockItem | null {
    return this.inBounds(column, row) ? this.items[this.cell(column, row)] : null;
  }

  isHidden(column: number, row: number): boolean {
    return this.inBounds(column, row) && this.hidden[this.cell(column, row)] === 1;
  }

  reveal(column: number, row: number): void {
    if (this.inBounds(column, row)) this.hidden[this.cell(column, row)] = 0;
  }

  takeItem(column: number, row: number): BlockItem | null {
    const item = this.itemAt(column, row);
    if (item === null || item === 'multi-coin') return item;
    this.items[this.cell(column, row)] = null;
    return item;
  }

  hitMultiCoin(column: number, row: number, nowMs: number): boolean {
    if (this.itemAt(column, row) !== 'multi-coin') return true;
    const cell = this.cell(column, row);
    if (this.coinsGiven[cell] === 0) this.firstHitMs[cell] = nowMs;
    this.coinsGiven[cell]++;
    const expired = nowMs - this.firstHitMs[cell] >= this.multiCoin.windowMs;
    const exhausted = expired || this.coinsGiven[cell] >= this.multiCoin.maxCoins;
    if (exhausted) this.items[cell] = null;
    return exhausted;
  }

  private inBounds(column: number, row: number): boolean {
    return column >= 0 && row >= 0 && column < this.columns && row < this.rows;
  }

  private cell(column: number, row: number): number {
    return row * this.columns + column;
  }
}
