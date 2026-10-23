import { describe, expect, it } from 'vitest';
import {
  blendPixel,
  blit,
  clearTransparentColour,
  createRaster,
  fillRect,
  getPixel,
  mixColor,
  parseHex,
  setPixel,
} from './raster';

describe('raster', () => {
  it('creates a transparent RGBA buffer', () => {
    const raster = createRaster(3, 2);
    expect(raster.data.length).toBe(24);
    expect(getPixel(raster, 2, 1)).toEqual([0, 0, 0, 0]);
  });

  it('rejects non-integer or empty sizes', () => {
    expect(() => createRaster(0, 2)).toThrow();
    expect(() => createRaster(1.5, 2)).toThrow();
  });

  it('parses hex colours with and without alpha', () => {
    expect(parseHex('#ff8000')).toEqual([255, 128, 0, 255]);
    expect(parseHex('#10203040')).toEqual([16, 32, 48, 64]);
    expect(() => parseHex('red')).toThrow();
  });

  it('mixes colours and clamps the amount', () => {
    expect(mixColor([0, 0, 0, 0], [200, 100, 50, 255], 0.5)).toEqual([100, 50, 25, 127.5]);
    expect(mixColor([0, 0, 0, 0], [10, 10, 10, 10], 2)).toEqual([10, 10, 10, 10]);
  });

  it('ignores writes outside the raster', () => {
    const raster = createRaster(2, 2);
    setPixel(raster, -1, 0, [1, 2, 3, 4]);
    setPixel(raster, 2, 0, [1, 2, 3, 4]);
    expect(raster.data.every((value) => value === 0)).toBe(true);
  });

  it('fills a clipped rectangle', () => {
    const raster = createRaster(3, 3);
    fillRect(raster, 1, 1, 5, 5, [9, 9, 9, 255]);
    expect(getPixel(raster, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(getPixel(raster, 2, 2)).toEqual([9, 9, 9, 255]);
  });

  it('blits a source into a target with clipping', () => {
    const source = createRaster(2, 2);
    fillRect(source, 0, 0, 2, 2, [5, 6, 7, 255]);
    const target = createRaster(3, 3);
    blit(target, source, 2, -1);
    expect(getPixel(target, 2, 0)).toEqual([5, 6, 7, 255]);
    expect(getPixel(target, 1, 0)).toEqual([0, 0, 0, 0]);
  });

  it('composites with straight-alpha "over"', () => {
    const raster = createRaster(1, 1);
    setPixel(raster, 0, 0, [0, 0, 255, 255]);
    blendPixel(raster, 0, 0, [255, 0, 0, 255], 0.5);
    expect(getPixel(raster, 0, 0)).toEqual([128, 0, 128, 255]);
  });

  it('keeps the source colour when blending onto transparency', () => {
    const raster = createRaster(1, 1);
    blendPixel(raster, 0, 0, [200, 100, 50, 255], 0.25);
    expect(getPixel(raster, 0, 0)).toEqual([200, 100, 50, 64]);
  });

  it('zeroes the colour of fully transparent pixels', () => {
    const raster = createRaster(1, 1);
    setPixel(raster, 0, 0, [10, 20, 30, 0]);
    clearTransparentColour(raster);
    expect(getPixel(raster, 0, 0)).toEqual([0, 0, 0, 0]);
  });
});
