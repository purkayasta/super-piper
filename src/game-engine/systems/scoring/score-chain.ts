export const ONE_UP = -1;

export function ladderAward(ladder: readonly number[], index: number): number {
  return index < ladder.length ? ladder[index] : ONE_UP;
}

export class ScoreChain {
  private index: number;

  constructor(
    private readonly ladder: readonly number[],
    private readonly startIndex = 0,
  ) {
    this.index = startIndex;
  }

  next(): number {
    return ladderAward(this.ladder, this.index++);
  }

  reset(): void {
    this.index = this.startIndex;
  }
}
