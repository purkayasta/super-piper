import type { EnemyKind } from '../world/level-format';

export const SCORING = {
  coinPoints: 200,
  postmarkPoints: 1000,
  coinsPerExtraLife: 100,
  startingLives: 3,
  timeUnitMs: 400,
  powerUpPoints: 1000,
  brickPoints: 50,
  kickPoints: 400,
  timeBonusPerUnit: 50,
} as const;

export type ScoringRules = { readonly [K in keyof typeof SCORING]: number };

export const SCORE_LADDER: readonly number[] = [
  100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000,
];

export const CHAIN_START = { stomp: 0, shell: 3, star: 0 } as const;

export const ENEMY_POINTS: Readonly<Record<EnemyKind, number>> = {
  thornbug: 100,
  shellback: 200,
  flapjack: 200,
  snapvine: 200,
};

export interface GoalHeightBand {
  readonly minFraction: number;
  readonly points: number;
}

export const GOAL_HEIGHT_BANDS: readonly GoalHeightBand[] = [
  { minFraction: 0.92, points: 5000 },
  { minFraction: 0.62, points: 2000 },
  { minFraction: 0.38, points: 800 },
  { minFraction: 0.16, points: 400 },
  { minFraction: 0, points: 100 },
];

export const TIME_TALLY = { unitsPerTick: 8, tickMs: 80 } as const;
