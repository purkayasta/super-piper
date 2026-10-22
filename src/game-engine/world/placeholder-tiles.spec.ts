import { describe, expect, it } from 'vitest';
import {
  PLACEHOLDER_TILE_COUNT,
  drawPixelGrid,
  drawPlaceholderTileset,
  type PixelTarget,
} from './placeholder-tiles';

interface FilledRect {
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function recordingTarget(): PixelTarget & { rects: FilledRect[] } {
  const rects: FilledRect[] = [];
  return {
    rects,
    fillStyle: '',
    fillRect(x: number, y: number, width: number, height: number) {
      rects.push({ color: this.fillStyle as string, x, y, width, height });
    },
  };
}

describe('drawPixelGrid', () => {
  it('fills one pixel per palette symbol and skips others', () => {
    const target = recordingTarget();
    drawPixelGrid(target, ['A.', '.B'], { A: '#111111', B: '#222222' }, 10, 20);
    expect(target.rects).toEqual([
      { color: '#111111', x: 10, y: 20, width: 1, height: 1 },
      { color: '#222222', x: 11, y: 21, width: 1, height: 1 },
    ]);
  });
});

describe('drawPlaceholderTileset', () => {
  it('draws every tile inside its own 16×16 cell of the strip', () => {
    const target = recordingTarget();
    drawPlaceholderTileset(target, 16);
    for (const rect of target.rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(16 * PLACEHOLDER_TILE_COUNT);
      expect(rect.y + rect.height).toBeLessThanOrEqual(16);
      expect(Math.floor(rect.x / 16)).toBe(Math.floor((rect.x + rect.width - 1) / 16));
    }
    for (let tile = 0; tile < PLACEHOLDER_TILE_COUNT; tile++) {
      expect(target.rects.some((rect) => Math.floor(rect.x / 16) === tile)).toBe(true);
    }
  });
});
