import { sanitizeVolumes, type AudioVolumes } from '../../../game-engine/audio/volume';
import { QUALITY_LEVELS, type GameSettings } from '../models/settings.model';
import { validateBindings } from './key-binding-rules';

export type SettingsPatch = Partial<Omit<GameSettings, 'volumes'>> & {
  readonly volumes?: Partial<AudioVolumes>;
};

export function mergeSettings(current: GameSettings, patch: SettingsPatch): GameSettings {
  const bindings = patch.bindings === undefined ? null : validateBindings(patch.bindings);
  return {
    volumes:
      patch.volumes === undefined
        ? current.volumes
        : sanitizeVolumes({ ...current.volumes, ...patch.volumes }),
    quality:
      patch.quality !== undefined && QUALITY_LEVELS.includes(patch.quality)
        ? patch.quality
        : current.quality,
    reducedMotion: patch.reducedMotion ?? current.reducedMotion,
    screenShake: patch.screenShake ?? current.screenShake,
    jumpSensitivity: sensitivity(patch.jumpSensitivity, current.jumpSensitivity),
    leftSensitivity: sensitivity(patch.leftSensitivity, current.leftSensitivity),
    rightSensitivity: sensitivity(patch.rightSensitivity, current.rightSensitivity),
    bindings: bindings ?? current.bindings,
  };
}

function sensitivity(value: number | undefined, current: number): number {
  if (value === undefined || !Number.isFinite(value)) return current;
  return Math.min(1.5, Math.max(0.5, value));
}

export function sameSettings(a: GameSettings, b: GameSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
