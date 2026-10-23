import { describe, expect, it } from 'vitest';
import { MILESTONE_RULES } from '../../configuration/rules.config';
import { EMPTY_RUN_STATS, RunStatsTracker } from './run-stats';

describe('RunStatsTracker', () => {
  it('counts hits and reports the finishing power', () => {
    const stats = new RunStatsTracker(MILESTONE_RULES);
    stats.recordHit();
    stats.recordHit();
    expect(stats.snapshot('spark')).toEqual({ ...EMPTY_RUN_STATS, hits: 2, finishPower: 'spark' });
  });

  it('reaches a combo milestone once, at its threshold', () => {
    const stats = new RunStatsTracker(MILESTONE_RULES);
    expect(stats.combo('stomp', MILESTONE_RULES.stompChain - 1)).toBeNull();
    expect(stats.combo('stomp', MILESTONE_RULES.stompChain)).toBe('stomp-chain');
    expect(stats.combo('stomp', MILESTONE_RULES.stompChain + 1)).toBeNull();
    expect(stats.combo('shell', MILESTONE_RULES.shellChain)).toBe('shell-chain');
    expect(stats.reach('bonus-room')).toBe(true);
    expect(stats.reach('bonus-room')).toBe(false);
    expect(stats.snapshot('small').milestones).toEqual(['stomp-chain', 'shell-chain', 'bonus-room']);
  });

  it('carries everything across a restart or a tube', () => {
    const first = new RunStatsTracker(MILESTONE_RULES);
    first.recordHit();
    first.reach('bonus-room');
    first.recordBoss(1, true);
    const next = new RunStatsTracker(MILESTONE_RULES, first.snapshot('big'));
    expect(next.reach('bonus-room')).toBe(false);
    expect(next.snapshot('big')).toEqual({
      hits: 1,
      finishPower: 'big',
      bossDefeated: true,
      bossStompHits: 1,
      milestones: ['bonus-room'],
    });
  });
});
