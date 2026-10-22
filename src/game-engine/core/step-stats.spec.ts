import { describe, expect, it } from 'vitest';
import { IGNORED_GAP_MS } from '../configuration/performance.config';
import { StepStats } from './step-stats';

describe('StepStats', () => {
  it('starts at zero', () => {
    expect(new StepStats().offStepFrames).toBe(0);
  });

  it('counts only frames with zero or two-plus steps', () => {
    const stats = new StepStats();
    [1, 1, 0, 1, 2, 3, 1].forEach((steps) => stats.recordFrame(steps, 16));
    expect(stats.offStepFrames).toBe(3);
  });

  it('ignores tab-switch gaps', () => {
    const stats = new StepStats();
    stats.recordFrame(9, IGNORED_GAP_MS + 1);
    expect(stats.offStepFrames).toBe(0);
  });
});
