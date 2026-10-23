import { describe, expect, it } from 'vitest';
import { fadeOut, foldLoop, highPass, lowPass, normalizePeak, peakOf, toPcm16 } from './mixdown';

const RATE = 32000;

function periodic(length: number, period: number, offset: number): Float32Array {
  return Float32Array.from(
    { length },
    (_, i) => offset + 0.5 * Math.sin((2 * Math.PI * i) / period),
  );
}

describe('mixdown', () => {
  it('folds samples past the loop end back onto its start', () => {
    const folded = foldLoop(Float32Array.from([1, 2, 3, 4, 5, 6, 7]), 3);
    expect([...folded]).toEqual([1 + 4 + 7, 2 + 5, 3 + 6]);
  });

  it('removes a DC offset', () => {
    const buffer = periodic(RATE, 100, 0.4);
    highPass(buffer, RATE, 20, false);
    const tail = buffer.subarray(RATE / 2);
    const mean = tail.reduce((sum, value) => sum + value, 0) / tail.length;
    expect(Math.abs(mean)).toBeLessThan(0.005);
  });

  it('filters circularly so a loop seam stays continuous', () => {
    for (const filter of [highPass, lowPass]) {
      const buffer = periodic(3200, 320, 0.4);
      filter(buffer, RATE, filter === highPass ? 30 : 4000, true);
      const seamStep = Math.abs(buffer[0] - buffer[buffer.length - 1]);
      const typicalStep = Math.abs(buffer[1] - buffer[0]);
      expect(seamStep).toBeLessThan(typicalStep * 1.5 + 1e-6);
    }
  });

  it('normalises to the target peak', () => {
    const buffer = Float32Array.from([0.1, -0.4, 0.2]);
    expect(normalizePeak(buffer, 0.8)).toBeCloseTo(2, 6);
    expect(peakOf(buffer)).toBeCloseTo(0.8, 6);
    expect(normalizePeak(new Float32Array(4), 0.8)).toBe(1);
  });

  it('fades the tail to silence', () => {
    const buffer = new Float32Array(10).fill(1);
    fadeOut(buffer, 4);
    expect([...buffer.subarray(5)]).toEqual([1, 0.75, 0.5, 0.25, 0]);
  });

  it('converts to clamped 16-bit PCM', () => {
    expect([...toPcm16(Float32Array.from([0, 1, -1, 2, -2, 0.5]))]).toEqual([
      0, 32767, -32767, 32767, -32767, 16384,
    ]);
  });

  it('quantises to fewer bits inside the 16-bit range', () => {
    const pcm = toPcm16(Float32Array.from([1, -1, 0.5, 0.0001]), 12);
    expect([...pcm]).toEqual([2047 * 16, -2047 * 16, 1024 * 16, 0]);
    expect(pcm.every((sample) => sample % 16 === 0)).toBe(true);
  });
});
