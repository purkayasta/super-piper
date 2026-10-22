import { describe, expect, it } from 'vitest';
import { FrameStats } from './frame-stats';

describe('FrameStats', () => {
  it('computes average, p95 and long frames over 1..100', () => {
    const stats = new FrameStats(240);
    for (let i = 1; i <= 100; i++) stats.push(i);
    expect(stats.average).toBeCloseTo(50.5);
    expect(stats.p95).toBe(95);
    expect(stats.longFrames).toBe(50);
  });

  it('keeps only the most recent samples at capacity', () => {
    const stats = new FrameStats(3);
    [1, 2, 3, 4].forEach((value) => stats.push(value));
    expect(stats.average).toBeCloseTo(3);
  });

  it('ignores tab-switch gaps', () => {
    const stats = new FrameStats(240);
    [16.67, 900, 16.67].forEach((value) => stats.push(value));
    expect(stats.longFrames).toBe(0);
    expect(stats.average).toBeCloseTo(16.67);
  });

  it('counts evicted long frames in the session total but not the window', () => {
    const stats = new FrameStats(3);
    [60, 900, 10, 10, 10].forEach((value) => stats.push(value));
    expect(stats.longFrames).toBe(0);
    expect(stats.totalLongFrames).toBe(1);
  });

  it('reports zero when empty', () => {
    const stats = new FrameStats(240);
    expect(stats.fps).toBe(0);
    expect(stats.average).toBe(0);
    expect(stats.p95).toBe(0);
  });

  it('derives fps from the average', () => {
    const stats = new FrameStats(10);
    stats.push(20);
    expect(stats.fps).toBeCloseTo(50);
  });
});
