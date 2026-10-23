import type { QualityLevel } from '../core/game-events';

export interface QualityEffects {
  readonly brickDebrisPieces: number;
  readonly sparkles: boolean;
  readonly cloudDrift: boolean;
  readonly detailScenery: boolean;
}

export const QUALITY_EFFECTS: Readonly<Record<QualityLevel, QualityEffects>> = {
  low: { brickDebrisPieces: 2, sparkles: false, cloudDrift: false, detailScenery: false },
  medium: { brickDebrisPieces: 4, sparkles: true, cloudDrift: true, detailScenery: true },
  high: { brickDebrisPieces: 4, sparkles: true, cloudDrift: true, detailScenery: true },
};
