import { describe, expect, it } from 'vitest';
import { createRandom } from '../noise';
import { decodeFlac } from './flac-decoder.test-helpers';
import { crc16, crc8, encodeFlac } from './flac-encoder';

const ASCII_123456789 = new TextEncoder().encode('123456789');

function sine(length: number, amplitude: number, period: number): Int16Array {
  return Int16Array.from({ length }, (_, i) =>
    Math.round(amplitude * Math.sin((2 * Math.PI * i) / period)),
  );
}

function squareWave(length: number, period: number, amplitude: number): Int16Array {
  return Int16Array.from({ length }, (_, i) => (i % period < period / 2 ? amplitude : -amplitude));
}

describe('FLAC CRCs', () => {
  it('match the standard check values', () => {
    expect(crc8(ASCII_123456789)).toBe(0xf4);
    expect(crc16(ASCII_123456789)).toBe(0xfee8);
  });
});

describe('encodeFlac', () => {
  it('writes the stream marker and STREAMINFO fields', () => {
    const decoded = decodeFlac(encodeFlac(sine(10000, 9000, 37), 32000));
    expect(decoded.sampleRate).toBe(32000);
    expect(decoded.channels).toBe(1);
    expect(decoded.bitsPerSample).toBe(16);
    expect(decoded.totalSamples).toBe(10000);
    expect(decoded.minBlockSize).toBe(4096);
    expect(decoded.maxBlockSize).toBe(4096);
  });

  it('round-trips a sine bit-exactly through fixed predictors', () => {
    const samples = sine(20000, 20000, 91.3);
    const decoded = decodeFlac(encodeFlac(samples, 32000));
    expect(decoded.samples).toEqual(samples);
    expect(decoded.subframeTypes.every((type) => type.startsWith('fixed-'))).toBe(true);
  });

  it('stores silence as constant subframes', () => {
    const decoded = decodeFlac(encodeFlac(new Int16Array(9000), 32000));
    expect(decoded.subframeTypes).toEqual(['constant', 'constant', 'constant']);
    expect(decoded.samples.every((sample) => sample === 0)).toBe(true);
  });

  it('falls back to verbatim for incompressible noise and keeps the extremes', () => {
    const random = createRandom(7);
    const samples = Int16Array.from({ length: 5000 }, () => Math.floor(random() * 65536 - 32768));
    samples[0] = -32768;
    samples[1] = 32767;
    const decoded = decodeFlac(encodeFlac(samples, 44100));
    expect(decoded.samples).toEqual(samples);
    expect(decoded.subframeTypes).toContain('verbatim');
  });

  it('encodes a short last block with an explicit size', () => {
    const samples = sine(4096 + 300, 12000, 50);
    const decoded = decodeFlac(encodeFlac(samples, 22050));
    expect(decoded.samples).toEqual(samples);
    expect(decoded.subframeTypes).toHaveLength(2);
  });

  it('handles a stream shorter than one block', () => {
    const samples = sine(100, 8000, 13);
    const decoded = decodeFlac(encodeFlac(samples, 32000));
    expect(decoded.samples).toEqual(samples);
    expect(decoded.maxBlockSize).toBe(100);
  });

  it('numbers frames past the one-byte UTF-8 range', () => {
    const samples = squareWave(256 * 300, 64, 10000);
    const decoded = decodeFlac(
      encodeFlac(samples, 32000, { blockSize: 256, maxPartitionOrder: 4 }),
    );
    expect(decoded.samples).toEqual(samples);
  });

  it('compresses a smooth tone well below raw size', () => {
    const samples = sine(32000, 12000, 73.4);
    const bytes = encodeFlac(samples, 32000);
    expect(bytes.length).toBeLessThan(samples.length * 2 * 0.4);
    expect(decodeFlac(bytes).samples).toEqual(samples);
  });

  it('stores samples quantised to fewer bits with wasted bits, smaller than full depth', () => {
    const full = sine(20000, 20000, 91.3);
    const quantised = full.map((sample) => Math.round(sample / 16) * 16);
    const bytes = encodeFlac(quantised, 24000);
    const decoded = decodeFlac(bytes);
    expect(decoded.samples).toEqual(quantised);
    expect(decoded.wastedBits.every((bits) => bits === 4)).toBe(true);
    expect(bytes.length).toBeLessThan(encodeFlac(full, 24000).length * 0.8);
  });

  it('keeps wasted bits for verbatim blocks of quantised noise', () => {
    const random = createRandom(3);
    const samples = Int16Array.from({ length: 4096 }, () => Math.floor(random() * 4096 - 2048) * 8);
    const decoded = decodeFlac(encodeFlac(samples, 24000));
    expect(decoded.samples).toEqual(samples);
    expect(decoded.wastedBits).toEqual([3]);
  });

  it('never grows a hard-edged square wave beyond raw size', () => {
    const samples = squareWave(32000, 73, 12000);
    const bytes = encodeFlac(samples, 32000);
    expect(bytes.length).toBeLessThan(samples.length * 2);
    expect(decodeFlac(bytes).samples).toEqual(samples);
  });
});
