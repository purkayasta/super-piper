import { describe, expect, it } from 'vitest';
import { InputTracker } from './input-tracker';

describe('InputTracker', () => {
  it('tracks key down and up', () => {
    const tracker = new InputTracker();
    tracker.keyDown('Space');
    expect(tracker.pressed.has('Space')).toBe(true);
    tracker.keyUp('Space');
    expect(tracker.pressed.has('Space')).toBe(false);
  });

  it('releaseAll clears every key', () => {
    const tracker = new InputTracker();
    tracker.keyDown('Space');
    tracker.keyDown('KeyA');
    tracker.releaseAll();
    expect(tracker.pressed.size).toBe(0);
  });
});
