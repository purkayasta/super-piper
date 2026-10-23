import { describe, expect, it } from 'vitest';
import { BlockContents } from './block-contents';
import { blockHitOutcome, hiddenBlockOutcome } from './block-hits';
import { Tile } from './tile-ids';

const RULES = { windowMs: 4000, maxCoins: 3 };

function contents(): BlockContents {
  return new BlockContents(
    10,
    5,
    [
      { column: 1, row: 1, item: 'power' },
      { column: 2, row: 1, item: 'multi-coin' },
      { column: 3, row: 1, item: 'one-up' },
    ],
    [{ column: 3, row: 1 }],
    RULES,
  );
}

describe('BlockContents', () => {
  it('looks up items by cell and treats out-of-range cells as empty', () => {
    const blocks = contents();
    expect(blocks.itemAt(1, 1)).toBe('power');
    expect(blocks.itemAt(0, 0)).toBeNull();
    expect(blocks.itemAt(-1, 1)).toBeNull();
    expect(blocks.itemAt(10, 1)).toBeNull();
  });

  it('gives an item once', () => {
    const blocks = contents();
    expect(blocks.takeItem(1, 1)).toBe('power');
    expect(blocks.takeItem(1, 1)).toBeNull();
  });

  it('reveals hidden blocks once', () => {
    const blocks = contents();
    expect(blocks.isHidden(3, 1)).toBe(true);
    blocks.reveal(3, 1);
    expect(blocks.isHidden(3, 1)).toBe(false);
    expect(blocks.isHidden(-5, 9)).toBe(false);
  });

  it('pays multi-coin bricks until the coin cap', () => {
    const blocks = contents();
    expect(blocks.takeItem(2, 1)).toBe('multi-coin');
    expect(blocks.hitMultiCoin(2, 1, 0)).toBe(false);
    expect(blocks.hitMultiCoin(2, 1, 100)).toBe(false);
    expect(blocks.hitMultiCoin(2, 1, 200)).toBe(true);
    expect(blocks.itemAt(2, 1)).toBeNull();
  });

  it('ends a multi-coin brick on the first hit after its window', () => {
    const blocks = contents();
    expect(blocks.hitMultiCoin(2, 1, 1000)).toBe(false);
    expect(blocks.hitMultiCoin(2, 1, 5000)).toBe(true);
  });
});

describe('blockHitOutcome with contents', () => {
  it('releases items from star blocks and bricks', () => {
    expect(blockHitOutcome(Tile.starBlock, 'power')).toBe('release-item');
    expect(blockHitOutcome(Tile.brick, 'star')).toBe('release-item');
    expect(blockHitOutcome(Tile.brick, 'multi-coin')).toBe('multi-coin');
  });

  it('breaks plain bricks only when Pip can', () => {
    expect(blockHitOutcome(Tile.brick, null, true)).toBe('break');
    expect(blockHitOutcome(Tile.brick, null, false)).toBe('bump');
    expect(blockHitOutcome(Tile.starBlock, null, true)).toBe('release-coin');
  });

  it('never acts on used or solid blocks', () => {
    expect(blockHitOutcome(Tile.usedBlock, 'power', true)).toBe('none');
    expect(blockHitOutcome(Tile.solidBlock, null, true)).toBe('none');
  });

  it('pays a coin from an empty hidden block, or its item', () => {
    expect(hiddenBlockOutcome(null)).toBe('release-coin');
    expect(hiddenBlockOutcome('one-up')).toBe('release-item');
  });
});
