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
    bindings: bindings ?? current.bindings,
  };
}

export function sameSettings(a: GameSettings, b: GameSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
