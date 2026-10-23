import { describe, expect, it } from 'vitest';
import { WORLD_1 } from '../../../content/manifests/world-manifest';
import type { StageResult } from '../../../game-engine/core/game-events';
import { EMPTY_PROGRESSION, type Progression } from '../models/progression.model';
import {
  RANKS,
  applyClear,
  rankForXp,
  stageStatuses,
  starCount,
  totalStars,
} from './progression-rules';

const CLEAR: StageResult = {
  stageId: '1-1',
  score: 12_345,
  coins: 7,
  timeLeft: 0,
  timeUsed: 180,
  coinsCollected: 107,
  postmarks: 2,
  postmarksCollected: [0, 2],
  postmarkTotal: 3,
};

const TARGET = 150;

describe('applyClear', () => {
  it('records a first clear with the finish star, bests, coins and XP', () => {
    const { progression, report } = applyClear(EMPTY_PROGRESSION, CLEAR, TARGET);
    expect(progression.stages['1-1']).toEqual({
      cleared: true,
      clears: 1,
      bestScore: 12_345,
      bestTime: 180,
      postmarksFound: [0, 2],
      stars: { finish: true, postmarks: false, time: false },
    });
    expect(progression.coins).toBe(107);
    expect(report.xpEarned).toBe(123 + 200 + 100);
    expect(progression.xp).toBe(423);
    expect(report).toMatchObject({
      firstClear: true,
      newBestScore: true,
      newBestTime: true,
      newStars: { finish: true, postmarks: false, time: false },
      postmarksFound: 2,
      postmarkTotal: 3,
      coinsEarned: 107,
    });
  });

  it('awards the time star at or under the target time', () => {
    const fast = applyClear(EMPTY_PROGRESSION, { ...CLEAR, timeUsed: TARGET }, TARGET);
    expect(fast.report.stars.time).toBe(true);
  });

  it('collects Postmarks across runs for the Postmark star', () => {
    const first = applyClear(EMPTY_PROGRESSION, CLEAR, TARGET).progression;
    const second = applyClear(first, { ...CLEAR, postmarksCollected: [1] }, TARGET);
    expect(second.progression.stages['1-1'].postmarksFound).toEqual([0, 1, 2]);
    expect(second.report.newStars).toEqual({ finish: false, postmarks: true, time: false });
    expect(second.report.xpEarned).toBe(123 + 100);
  });

  it('never takes a star or a best away', () => {
    const fast = applyClear(EMPTY_PROGRESSION, { ...CLEAR, timeUsed: 90 }, TARGET).progression;
    const slow = applyClear(fast, { ...CLEAR, timeUsed: 300, score: 100 }, TARGET);
    const record = slow.progression.stages['1-1'];
    expect(record.stars.time).toBe(true);
    expect(record.bestTime).toBe(90);
    expect(record.bestScore).toBe(12_345);
    expect(record.clears).toBe(2);
    expect(slow.report).toMatchObject({
      newBestScore: false,
      newBestTime: false,
      firstClear: false,
    });
  });

  it('reports a rank-up', () => {
    const nearRank: Progression = { ...EMPTY_PROGRESSION, xp: 450 };
    const { report } = applyClear(nearRank, CLEAR, TARGET);
    expect(report.rankBefore.rank.title).toBe('Trainee Courier');
    expect(report.rankAfter.rank.title).toBe('Junior Courier');
  });

  it('leaves the original progression untouched', () => {
    const before = structuredClone(EMPTY_PROGRESSION);
    applyClear(EMPTY_PROGRESSION, CLEAR, TARGET);
    expect(EMPTY_PROGRESSION).toEqual(before);
  });
});

describe('ranks', () => {
  it('climbs from Trainee to Legendary Courier', () => {
    expect(RANKS[0].title).toBe('Trainee Courier');
    expect(RANKS[RANKS.length - 1].title).toBe('Legendary Courier');
    expect(rankForXp(0)).toEqual({ rank: RANKS[0], level: 0, next: RANKS[1], fraction: 0 });
    expect(rankForXp(250).fraction).toBe(0.5);
    expect(rankForXp(1500).rank.title).toBe('Courier');
    expect(rankForXp(1_000_000)).toMatchObject({
      level: RANKS.length - 1,
      next: null,
      fraction: 1,
    });
  });

  it('counts stars per stage and in total', () => {
    expect(starCount({ finish: true, postmarks: false, time: true })).toBe(2);
    const { progression } = applyClear(EMPTY_PROGRESSION, { ...CLEAR, timeUsed: 10 }, TARGET);
    expect(totalStars(progression)).toBe(2);
  });
});

describe('stageStatuses', () => {
  const builtOnly11 = (stageId: string) => stageId === '1-1';

  it('opens only the first stage for a new player', () => {
    const statuses = stageStatuses(WORLD_1, EMPTY_PROGRESSION, builtOnly11);
    expect(statuses.map((status) => status.availability)).toEqual([
      'open',
      'locked',
      'locked',
      'locked',
    ]);
  });

  it('opens the next stage after a clear, as coming soon until it is built', () => {
    const { progression } = applyClear(EMPTY_PROGRESSION, CLEAR, TARGET);
    expect(stageStatuses(WORLD_1, progression, builtOnly11)[1].availability).toBe('coming-soon');
    expect(stageStatuses(WORLD_1, progression, () => true)[1].availability).toBe('open');
    expect(stageStatuses(WORLD_1, progression, () => true)[2].availability).toBe('locked');
  });
});
