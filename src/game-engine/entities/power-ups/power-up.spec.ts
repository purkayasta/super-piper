import { describe, expect, it } from 'vitest';
import { PARCEL_TUNING, POWER_UP_TUNING } from '../../configuration/actors.config';
import { Parcel, type ParcelWorld } from '../projectiles/parcel';
import { PowerUp, type PowerUpWorld } from './power-up';

const TILE = 16;
const DT = 1 / 60;
const ROWS = ['#..........#', '#..........#', '#....#.....#', '#..........#', '############'];
const WORLD: PowerUpWorld & ParcelWorld = {
  isSolid: (column, row) => ROWS[row]?.[column] === '#',
  tileSize: TILE,
  levelHeightPx: ROWS.length * TILE,
};
const BLOCK_COLUMN = 5;
const BLOCK_ROW = 2;

function released(kind: PowerUp['kind']): PowerUp {
  const item = new PowerUp(POWER_UP_TUNING);
  item.release(kind, BLOCK_COLUMN, BLOCK_ROW, TILE);
  return item;
}

function run(item: PowerUp, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) item.step(DT, WORLD);
}

describe('PowerUp', () => {
  it('emerges out of the top of its block', () => {
    const item = released('parcel-box');
    expect(item.body.y + item.body.height).toBe((BLOCK_ROW + 1) * TILE);
    run(item, POWER_UP_TUNING.emergeMs / 1000 + DT);
    expect(item.mode).toBe('moving');
    expect(item.body.y + item.body.height).toBe(BLOCK_ROW * TILE);
  });

  it('slides right, drops off the block and turns at walls', () => {
    const item = released('parcel-box');
    run(item, POWER_UP_TUNING.emergeMs / 1000 + 3);
    expect(item.body.y + item.body.height).toBe(64);
    expect(item.facing).toBe(-1);
  });

  it('keeps a Spark Stamp still on its block', () => {
    const item = released('spark-stamp');
    run(item, POWER_UP_TUNING.emergeMs / 1000 + 1);
    expect(item.body.x).toBe(BLOCK_COLUMN * TILE + 1);
    expect(item.body.onGround).toBe(true);
  });

  it('bounces a Rush Star off the floor', () => {
    const item = released('rush-star');
    run(item, POWER_UP_TUNING.emergeMs / 1000);
    let bounced = false;
    for (let i = 0; i < 120; i++) {
      item.step(DT, WORLD);
      if (item.body.vy === -POWER_UP_TUNING.starBounceSpeed) bounced = true;
    }
    expect(bounced).toBe(true);
  });

  it('hops away from a bump, but never while emerging', () => {
    const item = released('parcel-box');
    item.hop(-1);
    expect(item.body.vy).toBe(0);
    run(item, POWER_UP_TUNING.emergeMs / 1000 + DT);
    item.hop(-1);
    expect(item.facing).toBe(-1);
    expect(item.body.vy).toBe(-POWER_UP_TUNING.bumpHopSpeed);
  });

  it('frees itself after falling out of the level', () => {
    const item = new PowerUp(POWER_UP_TUNING);
    item.release('green-stamp', 5, 6, TILE);
    run(item, 3);
    expect(item.active).toBe(false);
  });
});

describe('Parcel', () => {
  function thrown(facing: 1 | -1, x = 40): Parcel {
    const parcel = new Parcel(PARCEL_TUNING);
    parcel.launch(x, 56, facing);
    return parcel;
  }

  it('flies forward and bounces along the floor', () => {
    const parcel = thrown(1);
    let bounces = 0;
    for (let i = 0; i < 20; i++) {
      parcel.step(DT, WORLD);
      if (parcel.body.vy === -PARCEL_TUNING.bounceSpeed) bounces++;
    }
    expect(parcel.body.x).toBeGreaterThan(40);
    expect(bounces).toBeGreaterThan(0);
  });

  it('bursts on a wall', () => {
    const parcel = thrown(-1, 24);
    let outcome = parcel.step(DT, WORLD);
    for (let i = 0; i < 30 && outcome === 'flying'; i++) outcome = parcel.step(DT, WORLD);
    expect(outcome).toBe('burst');
  });

  it('reports nothing once freed', () => {
    const parcel = thrown(1);
    parcel.free();
    expect(parcel.step(DT, WORLD)).toBe('gone');
  });
});
