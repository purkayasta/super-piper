import type { SceneryLayerId } from '../../content/art/scenery-layers';
import type { QualityLevel } from '../core/game-events';

export interface QualityEffects {
  readonly brickDebrisPieces: number;
  readonly sparkles: boolean;
  readonly cloudDrift: boolean;
  readonly skippedSceneryLayers: readonly SceneryLayerId[];
}

export const QUALITY_EFFECTS: Readonly<Record<QualityLevel, QualityEffects>> = {
  low: {
    brickDebrisPieces: 2,
    sparkles: false,
    cloudDrift: false,
    skippedSceneryLayers: ['bushes'],
  },
  medium: { brickDebrisPieces: 4, sparkles: true, cloudDrift: true, skippedSceneryLayers: [] },
  high: { brickDebrisPieces: 4, sparkles: true, cloudDrift: true, skippedSceneryLayers: [] },
};
