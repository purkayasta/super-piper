import { describe, expect, it } from 'vitest';
import { NoiseGenerator, PulseOscillator, TriangleOscillator, polyBlep } from './oscillators';

const RATE = 32000;

function collect(count: number, next: () => number): number[] {
  return Array.from({ length: count }, next);
}

function risingCrossings(values: readonly number[]): number {
  let crossings = 0;
  for (let i = 1; i < values.length; i++) if (values[i - 1] < 0 && values[i] >= 0) crossings++;
  return crossings;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe('polyBlep', () => {
  it('is zero away from a discontinuity and antisymmetric around it', () => {
    expect(polyBlep(0.5, 0.01)).toBe(0);
    expect(polyBlep(0.002, 0.01)).toBeCloseTo(-polyBlep(0.998, 0.01), 9);
  });
});

describe('PulseOscillator', () => {
  it('runs at the requested frequency', () => {
    const pulse = new PulseOscillator();
    const values = collect(RATE, () => pulse.next(440, 0.5, RATE));
    expect(Math.abs(risingCrossings(values) - 440)).toBeLessThanOrEqual(1);
  });

  it('removes the duty cycle DC offset', () => {
    for (const duty of [0.125, 0.25, 0.5]) {
      const pulse = new PulseOscillator();
      expect(Math.abs(mean(collect(RATE, () => pulse.next(220, duty, RATE))))).toBeLessThan(0.01);
    }
  });

  it('spends the duty fraction of each cycle high', () => {
    const pulse = new PulseOscillator();
    const values = collect(RATE, () => pulse.next(100, 0.25, RATE));
    const high = values.filter((value) => value > 0.5).length / values.length;
    expect(high).toBeCloseTo(0.25, 1);
  });

  it('stays bounded at high pitches', () => {
    const pulse = new PulseOscillator();
    const values = collect(RATE, () => pulse.next(6000, 0.5, RATE));
    expect(Math.max(...values.map(Math.abs))).toBeLessThan(2.1);
  });
});

describe('TriangleOscillator', () => {
  it('steps through 16 levels across the full range', () => {
    const triangle = new TriangleOscillator();
    const values = collect(RATE, () => triangle.next(50, RATE));
    expect(Math.min(...values)).toBe(-1);
    expect(Math.max(...values)).toBe(1);
    expect(new Set(values).size).toBe(16);
  });

  it('runs at the requested frequency', () => {
    const triangle = new TriangleOscillator();
    const values = collect(RATE, () => triangle.next(110, RATE));
    expect(Math.abs(risingCrossings(values) - 110)).toBeLessThanOrEqual(1);
  });
});

describe('NoiseGenerator', () => {
  it('is deterministic and balanced', () => {
    const a = new NoiseGenerator();
    const b = new NoiseGenerator();
    const first = collect(RATE, () => a.next(20000, RATE, false));
    const second = collect(RATE, () => b.next(20000, RATE, false));
    expect(first).toEqual(second);
    expect(Math.abs(mean(first))).toBeLessThan(0.05);
  });

  it('repeats quickly in short mode, giving a metallic tone', () => {
    const noise = new NoiseGenerator();
    const values = collect(4000, () => noise.next(RATE, RATE, true));
    const period = 93;
    let matches = 0;
    for (let i = 1000; i < 2000; i++) if (values[i] === values[i + period]) matches++;
    expect(matches).toBe(1000);
  });

  it('holds its value between clocks', () => {
    const noise = new NoiseGenerator();
    const values = collect(400, () => noise.next(RATE / 4, RATE, false));
    for (let i = 3; i < 396; i += 4) {
      expect(new Set(values.slice(i, i + 4)).size).toBe(1);
    }
  });
});
