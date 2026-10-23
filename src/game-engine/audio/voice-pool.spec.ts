import { describe, expect, it } from 'vitest';
import { VoicePool } from './voice-pool';

describe('VoicePool', () => {
  it('gives each new sound a free slot', () => {
    const pool = new VoicePool(4);
    expect(pool.claim('coin', 3, 0, 0.3)).toBe(0);
    expect(pool.claim('jump', 1, 0, 0.2)).toBe(1);
    expect(pool.stole).toBe(false);
    expect(pool.activeCount('coin', 0.1)).toBe(1);
  });

  it("steals the sound's oldest voice once it reaches its limit", () => {
    const pool = new VoicePool(8);
    const first = pool.claim('coin', 2, 0, 1);
    pool.claim('coin', 2, 0.1, 1);
    pool.claim('jump', 1, 0.15, 1);
    expect(pool.claim('coin', 2, 0.2, 1)).toBe(first);
    expect(pool.stole).toBe(true);
    expect(pool.activeCount('coin', 0.25)).toBe(2);
  });

  it('reuses slots whose sound has ended', () => {
    const pool = new VoicePool(2);
    pool.claim('coin', 3, 0, 0.1);
    pool.claim('coin', 3, 0, 0.5);
    expect(pool.claim('stomp', 2, 0.2, 0.1)).toBe(0);
    expect(pool.stole).toBe(false);
  });

  it('steals the oldest voice overall when every slot is busy', () => {
    const pool = new VoicePool(3);
    pool.claim('a', 3, 0.2, 1);
    pool.claim('b', 3, 0.1, 1);
    pool.claim('c', 3, 0.3, 1);
    expect(pool.claim('d', 3, 0.4, 1)).toBe(1);
    expect(pool.stole).toBe(true);
    expect(pool.activeCount('b', 0.5)).toBe(0);
  });

  it('frees released slots', () => {
    const pool = new VoicePool(1);
    const slot = pool.claim('jump', 1, 0, 1);
    pool.release(slot);
    pool.claim('coin', 1, 0.1, 1);
    expect(pool.stole).toBe(false);
    pool.releaseAll();
    expect(pool.activeCount('coin', 0.2)).toBe(0);
  });
});
