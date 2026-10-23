import { DEFAULT_OUTFIT } from '../../../content/art/atlas-frames';
import { EMPTY_PROGRESSION, type Progression } from './progression.model';
import { defaultSettings, type GameSettings } from './settings.model';

export const SAVE_SCHEMA_VERSION = 1;

export interface Cosmetics {
  readonly owned: readonly string[];
  readonly equipped: string;
}

export interface SaveData {
  readonly schemaVersion: number;
  readonly progression: Progression;
  readonly settings: GameSettings;
  readonly cosmetics: Cosmetics;
  readonly achievements: readonly string[];
}

export type SaveNotice = 'restored-backup' | 'reset-corrupt' | 'storage-unavailable';

export function freshSave(prefersReducedMotion: boolean): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    progression: EMPTY_PROGRESSION,
    settings: defaultSettings(prefersReducedMotion),
    cosmetics: { owned: [DEFAULT_OUTFIT], equipped: DEFAULT_OUTFIT },
    achievements: [],
  };
}
