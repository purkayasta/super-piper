import { DEFAULT_VOLUMES, type AudioVolumes } from '../../../game-engine/audio/volume';
import type { GameplaySettings, QualityLevel } from '../../../game-engine/core/game-events';
import { DEFAULT_BINDINGS, type KeyBindings } from '../../../game-engine/systems/input/actions';

export const QUALITY_LEVELS: readonly QualityLevel[] = ['low', 'medium', 'high'];

export interface GameSettings {
  readonly volumes: AudioVolumes;
  readonly quality: QualityLevel;
  readonly reducedMotion: boolean;
  readonly screenShake: boolean;
  readonly jumpSensitivity: number;
  readonly leftSensitivity: number;
  readonly rightSensitivity: number;
  readonly bindings: KeyBindings;
}

export function defaultSettings(prefersReducedMotion: boolean): GameSettings {
  return {
    volumes: DEFAULT_VOLUMES,
    quality: 'high',
    reducedMotion: prefersReducedMotion,
    screenShake: true,
    jumpSensitivity: 1,
    leftSensitivity: 1,
    rightSensitivity: 1,
    bindings: DEFAULT_BINDINGS,
  };
}

export function gameplaySettings(settings: GameSettings): GameplaySettings {
  return {
    quality: settings.quality,
    reducedMotion: settings.reducedMotion,
    screenShake: settings.screenShake,
    jumpSensitivity: settings.jumpSensitivity,
    leftSensitivity: settings.leftSensitivity,
    rightSensitivity: settings.rightSensitivity,
  };
}
