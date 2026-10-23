import { describe, expect, it } from 'vitest';
import { CheckpointTracker } from './checkpoint';

describe('CheckpointTracker', () => {
  it('reports the crossing once', () => {
    const checkpoint = new CheckpointTracker(800, false);
    expect(checkpoint.update(799)).toBe(false);
    expect(checkpoint.update(800)).toBe(true);
    expect(checkpoint.update(900)).toBe(false);
    expect(checkpoint.reached).toBe(true);
  });

  it('keeps a reached checkpoint across a respawn', () => {
    const checkpoint = new CheckpointTracker(800, true);
    expect(checkpoint.reached).toBe(true);
    expect(checkpoint.update(900)).toBe(false);
  });

  it('does nothing in a stage without one', () => {
    const none = new CheckpointTracker(null, true);
    expect(none.exists).toBe(false);
    expect(none.reached).toBe(false);
    expect(none.update(10_000)).toBe(false);
  });
});
