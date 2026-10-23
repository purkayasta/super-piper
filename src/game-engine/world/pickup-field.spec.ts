import { describe, expect, it } from 'vitest';
import { blockHitOutcome, headRow, pickBumpedColumn } from './block-hits';
import { PickupField } from './pickup-field';
import { Tile } from './tile-ids';

const COIN_INSET = { x: 4, top: 2, bottom: 2 };

function field(): PickupField {
  return new PickupField(
    10,
    5,
    [
      { column: 2, row: 1 },
      { column: 3, row: 1 },
      { column: 7, row: 4 },
    ],
    16,
    COIN_INSET,
  );
}

describe('PickupField', () => {
  it('collects pickups whose inset box overlaps the rectangle', () => {
    const pickups = field();
    const collected: number[] = [];
    const count = pickups.collectOverlapping(40, 20, 53, 34, collected);
    expect(collected.slice(0, count)).toEqual([0, 1]);
    expect(pickups.remaining).toBe(1);
  });

  it('ignores rectangles that only touch the inset edge', () => {
    const pickups = field();
    const collected: number[] = [];
    expect(pickups.collectOverlapping(20, 20, 36, 30, collected)).toBe(0);
    expect(pickups.collectOverlapping(60, 20, 70, 30, collected)).toBe(0);
  });

  it('collects each pickup only once', () => {
    const pickups = field();
    const collected: number[] = [];
    pickups.collectOverlapping(40, 20, 53, 34, collected);
    expect(pickups.collectOverlapping(40, 20, 53, 34, collected)).toBe(0);
  });

  it('collects a single cell, including out-of-range requests', () => {
    const pickups = field();
    expect(pickups.collectCell(7, 4)).toBe(2);
    expect(pickups.collectCell(7, 4)).toBe(-1);
    expect(pickups.collectCell(-1, 0)).toBe(-1);
    expect(pickups.collectCell(10, 0)).toBe(-1);
  });
});

describe('block hits', () => {
  const solid = new Set(['3,2', '4,2']);
  const isSolid = (column: number, row: number): boolean => solid.has(`${column},${row}`);

  it('finds the row just above the head', () => {
    expect(headRow(48, 16)).toBe(2);
    expect(headRow(49, 16)).toBe(3);
  });

  it('bumps the block under the body centre when two are touched', () => {
    expect(pickBumpedColumn(58, 70, 2, 16, isSolid)).toBe(4);
    expect(pickBumpedColumn(54, 66, 2, 16, isSolid)).toBe(3);
  });

  it('falls back to the only solid block the body overlaps', () => {
    expect(pickBumpedColumn(70, 82, 2, 16, isSolid)).toBe(4);
    expect(pickBumpedColumn(90, 102, 2, 16, isSolid)).toBeNull();
  });

  it('releases coins from star blocks and only bumps bricks', () => {
    expect(blockHitOutcome(Tile.starBlock)).toBe('release-coin');
    expect(blockHitOutcome(Tile.starBlockShine)).toBe('release-coin');
    expect(blockHitOutcome(Tile.brick)).toBe('bump');
    expect(blockHitOutcome(Tile.usedBlock)).toBe('none');
  });
});
