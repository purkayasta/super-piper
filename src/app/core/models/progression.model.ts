import type { StageId } from '../../../game-engine/core/game-events';

export interface StageStars {
  readonly finish: boolean;
  readonly postmarks: boolean;
  readonly time: boolean;
}

export interface StageRecord {
  readonly cleared: boolean;
  readonly clears: number;
  readonly bestScore: number;
  readonly bestTime: number | null;
  readonly postmarksFound: readonly number[];
  readonly stars: StageStars;
}

export interface Progression {
  readonly stages: Readonly<Record<StageId, StageRecord>>;
  readonly coins: number;
  readonly xp: number;
}

export interface RankEntry {
  readonly title: string;
  readonly minXp: number;
}

export interface RankProgress {
  readonly rank: RankEntry;
  readonly level: number;
  readonly next: RankEntry | null;
  readonly fraction: number;
}

export interface ClearReport {
  readonly stageId: StageId;
  readonly score: number;
  readonly timeUsed: number;
  readonly targetTime: number;
  readonly postmarksFound: number;
  readonly postmarkTotal: number;
  readonly stars: StageStars;
  readonly newStars: StageStars;
  readonly firstClear: boolean;
  readonly newBestScore: boolean;
  readonly newBestTime: boolean;
  readonly coinsEarned: number;
  readonly xpEarned: number;
  readonly rankBefore: RankProgress;
  readonly rankAfter: RankProgress;
}

export type StageAvailability = 'open' | 'locked' | 'coming-soon';

export interface StageStatus {
  readonly stageId: StageId;
  readonly availability: StageAvailability;
  readonly record: StageRecord;
}

export const NO_STARS: StageStars = { finish: false, postmarks: false, time: false };

export const EMPTY_STAGE_RECORD: StageRecord = {
  cleared: false,
  clears: 0,
  bestScore: 0,
  bestTime: null,
  postmarksFound: [],
  stars: NO_STARS,
};

export const EMPTY_PROGRESSION: Progression = { stages: {}, coins: 0, xp: 0 };
