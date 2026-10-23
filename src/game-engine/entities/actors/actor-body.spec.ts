import { describe, expect, it } from 'vitest';
import {
  applyGravity,
  boxesOverlap,
  createBody,
  moveThroughTiles,
  placeBody,
  type SolidQuery,
} from './actor-body';

const TILE = 16;

function grid(rows: readonly string[]): SolidQuery {
  return (column, row) => rows[row]?.[column] === '#';
}

const ROOM = grid(['......', '......', '..#...', '......', '######']);

describe('placeBody', () => {
  it('centres the body on x and stands it on the bottom edge', () => {
    const body = createBody(14, 14);
    placeBody(body, 40, 64);
    expect([body.x, body.y]).toEqual([33, 50]);
  });
});

describe('moveThroughTiles', () => {
  it('lands on a floor and flags the ground', () => {
    const body = createBody(14, 14);
    placeBody(body, 8, 62);
    body.vy = 100;
    moveThroughTiles(body, 0, 5, TILE, ROOM);
    expect(body.y).toBe(64 - 14);
    expect(body.onGround).toBe(true);
    expect(body.vy).toBe(0);
  });

  it('stops at a wall on either side', () => {
    const right = createBody(14, 14);
    placeBody(right, 23, 48);
    moveThroughTiles(right, 4, 0, TILE, ROOM);
    expect(right.x + right.width).toBe(32);
    expect(right.hitRight).toBe(true);
    const left = createBody(14, 14);
    placeBody(left, 57, 48);
    moveThroughTiles(left, -4, 0, TILE, ROOM);
    expect(left.x).toBe(48);
    expect(left.hitLeft).toBe(true);
  });

  it('stops at a ceiling', () => {
    const body = createBody(14, 14);
    placeBody(body, 40, 64);
    moveThroughTiles(body, 0, -5, TILE, ROOM);
    expect(body.y).toBe(48);
    expect(body.hitCeiling).toBe(true);
  });

  it('falls freely where there is no floor', () => {
    const body = createBody(14, 14);
    placeBody(body, 8, 100);
    moveThroughTiles(body, 0, 4, TILE, grid([]));
    expect(body.y).toBe(90);
    expect(body.onGround).toBe(false);
  });
});

describe('applyGravity', () => {
  it('uses the midpoint velocity for the step', () => {
    const body = createBody(4, 4);
    const dy = applyGravity(body, 1000, 500, 0.1);
    expect(body.vy).toBe(100);
    expect(dy).toBeCloseTo(5);
  });

  it('caps at the max fall speed mid-step', () => {
    const body = createBody(4, 4);
    body.vy = 90;
    const dy = applyGravity(body, 1000, 100, 0.1);
    expect(body.vy).toBe(100);
    expect(dy).toBeCloseTo(((90 + 100) / 2) * 0.01 + 100 * 0.09);
  });

  it('matches across step rates', () => {
    const fallFor = (hz: number): number => {
      const body = createBody(4, 4);
      let y = 0;
      for (let i = 0; i < hz; i++) y += applyGravity(body, 1350, 240, 1 / hz);
      return y;
    };
    expect(fallFor(120)).toBeCloseTo(fallFor(60), 6);
    expect(fallFor(144)).toBeCloseTo(fallFor(60), 6);
  });
});

describe('boxesOverlap', () => {
  it('ignores boxes that only touch', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(boxesOverlap(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(false);
    expect(boxesOverlap(a, { x: 9, y: 9, width: 5, height: 5 })).toBe(true);
  });
});
