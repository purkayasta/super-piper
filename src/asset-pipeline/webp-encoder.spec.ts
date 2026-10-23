import { describe, expect, it } from 'vitest';
import { createRaster, fillRect, setPixel } from './raster';
import {
  PredictorMode,
  addPixels,
  encodeWebpLossless,
  lengthOrDistancePrefix,
  predictPixel,
  predictorResiduals,
  subtractGreen,
  subtractPixels,
  toArgb,
} from './webp-encoder';

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function decodePrefixValue(prefix: number, extraValue: number): number {
  if (prefix < 4) return prefix + 1;
  const extraBits = (prefix - 2) >> 1;
  const offset = (2 + (prefix & 1)) << extraBits;
  return offset + extraValue + 1;
}

describe('encodeWebpLossless', () => {
  it('wraps a VP8L bitstream in a RIFF container', () => {
    const raster = createRaster(5, 3);
    fillRect(raster, 0, 0, 5, 3, [10, 200, 30, 255]);
    const webp = encodeWebpLossless(raster);
    const view = new DataView(webp.buffer);
    expect(readAscii(webp, 0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(webp.length - 8);
    expect(readAscii(webp, 8, 8)).toBe('WEBPVP8L');
    expect(view.getUint32(16, true) + 20 + (view.getUint32(16, true) % 2)).toBe(webp.length);
    expect(webp[20]).toBe(0x2f);
  });

  it('encodes the image size and alpha flag in the VP8L header', () => {
    const raster = createRaster(300, 7);
    setPixel(raster, 1, 1, [1, 2, 3, 128]);
    const header = new DataView(encodeWebpLossless(raster).buffer).getUint32(21, true);
    expect((header & 0x3fff) + 1).toBe(300);
    expect(((header >>> 14) & 0x3fff) + 1).toBe(7);
    expect((header >>> 28) & 1).toBe(1);
  });

  it('compresses flat regions far below raw size', () => {
    const raster = createRaster(512, 256);
    fillRect(raster, 0, 128, 512, 128, [40, 160, 60, 255]);
    expect(encodeWebpLossless(raster).length).toBeLessThan(1000);
  });

  it('rejects images larger than the format allows', () => {
    expect(() => encodeWebpLossless(createRaster(16385, 1))).toThrow();
  });
});

describe('transforms', () => {
  it('converts RGBA to packed ARGB', () => {
    const raster = createRaster(1, 1);
    setPixel(raster, 0, 0, [0x11, 0x22, 0x33, 0x44]);
    expect(toArgb(raster)[0]).toBe(0x44112233);
  });

  it('subtracts green from red and blue modulo 256', () => {
    const pixels = Uint32Array.of(0xff102030);
    subtractGreen(pixels);
    expect(pixels[0]).toBe(0xfff02010);
  });

  it('adds back what subtractPixels removed, per channel', () => {
    const a = 0x80ff0010;
    const b = 0x7f01ff20;
    expect(addPixels(subtractPixels(a, b), b)).toBe(a);
  });

  it('predicts with opaque black, then left on the top row and top on the left column', () => {
    const pixels = Uint32Array.of(1, 2, 3, 4);
    expect(predictPixel(pixels, 2, 0, 0, PredictorMode.top)).toBe(0xff000000);
    expect(predictPixel(pixels, 2, 1, 0, PredictorMode.top)).toBe(1);
    expect(predictPixel(pixels, 2, 0, 1, PredictorMode.left)).toBe(1);
  });

  it('uses the clamped gradient predictor inside the image', () => {
    const pixels = Uint32Array.of(0x00000010, 0x00000030, 0x00000020, 0);
    expect(predictPixel(pixels, 2, 1, 1, PredictorMode.gradient)).toBe(0x00000040);
  });

  it('produces residuals that rebuild the image with the decoder rule', () => {
    const width = 40;
    const height = 37;
    const pixels = new Uint32Array(width * height);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 2654435761) >>> 0;
    const modeImage = Uint32Array.of(
      PredictorMode.gradient << 8,
      PredictorMode.averageLeftTop << 8,
      PredictorMode.top << 8,
      PredictorMode.left << 8,
    );
    const residuals = predictorResiduals(pixels, width, height, 5, modeImage);
    const rebuilt = new Uint32Array(pixels.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const mode = (modeImage[(y >> 5) * 2 + (x >> 5)] >>> 8) & 0xff;
        const prediction = predictPixel(rebuilt, width, x, y, mode);
        rebuilt[y * width + x] = addPixels(residuals[y * width + x], prediction);
      }
    }
    expect(rebuilt).toEqual(pixels);
  });
});

describe('lengthOrDistancePrefix', () => {
  it('round-trips through the VP8L prefix decoding rule', () => {
    for (const value of [1, 2, 4, 5, 6, 7, 8, 9, 100, 1000, 4096]) {
      const { prefix, extraValue, extraBits } = lengthOrDistancePrefix(value);
      expect(extraValue).toBeLessThan(2 ** Math.max(extraBits, 0) || 1);
      expect(decodePrefixValue(prefix, extraValue)).toBe(value);
    }
  });

  it('keeps the longest match inside the 24 length prefixes', () => {
    expect(lengthOrDistancePrefix(4096).prefix).toBe(23);
  });
});
