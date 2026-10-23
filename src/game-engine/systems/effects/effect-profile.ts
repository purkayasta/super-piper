import { QUALITY_EFFECTS, type QualityEffects } from '../../configuration/quality.config';
import type { GameplaySettings } from '../../core/game-events';

export interface EffectProfile extends QualityEffects {
  readonly screenShake: boolean;
}

export function effectProfile(settings: GameplaySettings): EffectProfile {
  const quality = QUALITY_EFFECTS[settings.quality];
  return {
    ...quality,
    cloudDrift: quality.cloudDrift && !settings.reducedMotion,
    screenShake: settings.screenShake && !settings.reducedMotion,
  };
}
