import type { WorldEntry } from '../../../content/manifests/world-manifest';
import type { StageId, StageResult } from '../../../game-engine/core/game-events';
import {
  EMPTY_STAGE_RECORD,
  type ClearReport,
  type Progression,
  type RankEntry,
  type RankProgress,
  type StageRecord,
  type StageStars,
  type StageStatus,
} from '../models/progression.model';

export const XP_RULES = { scorePerXp: 100, firstClear: 200, perStar: 100 } as const;

export const RANKS: readonly RankEntry[] = [
  { title: 'Trainee Courier', minXp: 0 },
  { title: 'Junior Courier', minXp: 500 },
  { title: 'Courier', minXp: 1500 },
  { title: 'Senior Courier', minXp: 3000 },
  { title: 'Express Courier', minXp: 5000 },
  { title: 'Master Courier', minXp: 8000 },
  { title: 'Legendary Courier', minXp: 12000 },
];

export const STARS_PER_STAGE = 3;

export function rankForXp(xp: number): RankProgress {
  let level = 0;
  while (level + 1 < RANKS.length && xp >= RANKS[level + 1].minXp) level++;
  const rank = RANKS[level];
  const next = RANKS[level + 1] ?? null;
  const fraction = next === null ? 1 : (xp - rank.minXp) / (next.minXp - rank.minXp);
  return { rank, level, next, fraction };
}

export function starCount(stars: StageStars): number {
  return Number(stars.finish) + Number(stars.postmarks) + Number(stars.time);
}

export function stageRecord(progression: Progression, stageId: StageId): StageRecord {
  return progression.stages[stageId] ?? EMPTY_STAGE_RECORD;
}

export function totalStars(progression: Progression): number {
  let total = 0;
  for (const record of Object.values(progression.stages)) total += starCount(record.stars);
  return total;
}

export function applyClear(
  progression: Progression,
  result: StageResult,
  targetTime: number,
): { readonly progression: Progression; readonly report: ClearReport } {
  const before = stageRecord(progression, result.stageId);
  const postmarksFound = [
    ...new Set([...before.postmarksFound, ...result.postmarksCollected]),
  ].sort((a, b) => a - b);
  const earned: StageStars = {
    finish: true,
    postmarks: result.postmarkTotal > 0 && postmarksFound.length >= result.postmarkTotal,
    time: result.timeUsed <= targetTime,
  };
  const stars: StageStars = {
    finish: before.stars.finish || earned.finish,
    postmarks: before.stars.postmarks || earned.postmarks,
    time: before.stars.time || earned.time,
  };
  const newStars: StageStars = {
    finish: stars.finish && !before.stars.finish,
    postmarks: stars.postmarks && !before.stars.postmarks,
    time: stars.time && !before.stars.time,
  };
  const firstClear = !before.cleared;
  const newBestScore = result.score > before.bestScore;
  const newBestTime = before.bestTime === null || result.timeUsed < before.bestTime;
  const xpEarned =
    Math.floor(result.score / XP_RULES.scorePerXp) +
    (firstClear ? XP_RULES.firstClear : 0) +
    starCount(newStars) * XP_RULES.perStar;
  const record: StageRecord = {
    cleared: true,
    clears: before.clears + 1,
    bestScore: Math.max(before.bestScore, result.score),
    bestTime: newBestTime ? result.timeUsed : before.bestTime,
    postmarksFound,
    stars,
  };
  const next: Progression = {
    stages: { ...progression.stages, [result.stageId]: record },
    coins: progression.coins + result.coinsCollected,
    xp: progression.xp + xpEarned,
  };
  return {
    progression: next,
    report: {
      stageId: result.stageId,
      score: result.score,
      timeUsed: result.timeUsed,
      targetTime,
      postmarksFound: postmarksFound.length,
      postmarkTotal: result.postmarkTotal,
      stars,
      newStars,
      firstClear,
      newBestScore,
      newBestTime,
      coinsEarned: result.coinsCollected,
      xpEarned,
      rankBefore: rankForXp(progression.xp),
      rankAfter: rankForXp(next.xp),
    },
  };
}

export function stageStatuses(
  world: WorldEntry,
  progression: Progression,
  isBuilt: (stageId: StageId) => boolean,
): StageStatus[] {
  return world.stages.map((stage, index) => {
    const record = stageRecord(progression, stage.stageId);
    const previous = index === 0 ? null : world.stages[index - 1].stageId;
    const unlocked = previous === null || stageRecord(progression, previous).cleared;
    const availability = !unlocked ? 'locked' : isBuilt(stage.stageId) ? 'open' : 'coming-soon';
    return { stageId: stage.stageId, availability, record };
  });
}
