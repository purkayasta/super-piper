import { PIP_OUTFITS } from '../../../content/art/atlas-frames';
import type { AudioVolumes, VolumeChannel } from '../../../game-engine/audio/volume';
import type { QualityLevel, StageId } from '../../../game-engine/core/game-events';
import {
  NO_STARS,
  type Progression,
  type StageRecord,
  type StageStars,
} from '../models/progression.model';
import { SAVE_SCHEMA_VERSION, type Cosmetics, type SaveData } from '../models/save-data.model';
import { QUALITY_LEVELS, type GameSettings } from '../models/settings.model';
import { validateBindings } from './key-binding-rules';

type Fields = Readonly<Record<string, unknown>>;

class CorruptField extends Error {}

const VOLUME_CHANNELS: readonly VolumeChannel[] = ['master', 'music', 'sfx'];
const MAX_POSTMARK_INDEX = 63;

export function validateSave(
  value: unknown,
  defaults: SaveData,
  knownStages: ReadonlySet<StageId>,
): SaveData | null {
  try {
    const save = fields(value);
    if (save['schemaVersion'] !== SAVE_SCHEMA_VERSION) return null;
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      progression: readProgression(save['progression'], defaults.progression, knownStages),
      settings: readSettings(save['settings'], defaults.settings),
      cosmetics: readCosmetics(save['cosmetics'], defaults.cosmetics),
      achievements: optional(save['achievements'], defaults.achievements, stringList),
    };
  } catch (error) {
    if (error instanceof CorruptField) return null;
    throw error;
  }
}

function readProgression(
  value: unknown,
  defaults: Progression,
  knownStages: ReadonlySet<StageId>,
): Progression {
  if (value === undefined) return defaults;
  const progression = fields(value);
  const stages: Record<StageId, StageRecord> = {};
  const storedStages = optional(progression['stages'], {}, fields);
  for (const [stageId, record] of Object.entries(storedStages)) {
    const parsed = readStageRecord(record);
    if (knownStages.has(stageId)) stages[stageId] = parsed;
  }
  return {
    stages,
    coins: optional(progression['coins'], defaults.coins, count),
    xp: optional(progression['xp'], defaults.xp, count),
  };
}

function readStageRecord(value: unknown): StageRecord {
  const record = fields(value);
  const bestTime = record['bestTime'];
  return {
    cleared: optional(record['cleared'], false, flag),
    clears: optional(record['clears'], 0, count),
    bestScore: optional(record['bestScore'], 0, count),
    bestTime: bestTime === undefined || bestTime === null ? null : count(bestTime),
    postmarksFound: optional(record['postmarksFound'], [], postmarkList),
    stars: optional(record['stars'], NO_STARS, readStars),
  };
}

function readStars(value: unknown): StageStars {
  const stars = fields(value);
  return {
    finish: optional(stars['finish'], false, flag),
    postmarks: optional(stars['postmarks'], false, flag),
    time: optional(stars['time'], false, flag),
  };
}

function readSettings(value: unknown, defaults: GameSettings): GameSettings {
  if (value === undefined) return defaults;
  const settings = fields(value);
  const bindings = settings['bindings'];
  return {
    volumes: optional(settings['volumes'], defaults.volumes, (raw) =>
      readVolumes(raw, defaults.volumes),
    ),
    quality: optional(settings['quality'], defaults.quality, quality),
    reducedMotion: optional(settings['reducedMotion'], defaults.reducedMotion, flag),
    screenShake: optional(settings['screenShake'], defaults.screenShake, flag),
    jumpSensitivity: optional(settings['jumpSensitivity'], defaults.jumpSensitivity, sensitivity),
    leftSensitivity: optional(settings['leftSensitivity'], defaults.leftSensitivity, sensitivity),
    rightSensitivity: optional(
      settings['rightSensitivity'],
      defaults.rightSensitivity,
      sensitivity,
    ),
    bindings: bindings === undefined ? defaults.bindings : orCorrupt(validateBindings(bindings)),
  };
}

function readVolumes(value: unknown, defaults: AudioVolumes): AudioVolumes {
  const volumes = fields(value);
  const result: Record<VolumeChannel, number> = { ...defaults };
  for (const channel of VOLUME_CHANNELS) {
    result[channel] = optional(volumes[channel], defaults[channel], unitInterval);
  }
  return result;
}

function readCosmetics(value: unknown, defaults: Cosmetics): Cosmetics {
  if (value === undefined) return defaults;
  const cosmetics = fields(value);
  const owned = optional(cosmetics['owned'], defaults.owned, outfitList);
  const equipped = optional(cosmetics['equipped'], defaults.equipped, outfit);
  if (!owned.includes(equipped)) throw new CorruptField();
  return { owned, equipped };
}

function optional<T>(value: unknown, fallback: T, read: (value: unknown) => T): T {
  return value === undefined ? fallback : read(value);
}

function orCorrupt<T>(value: T | null): T {
  if (value === null) throw new CorruptField();
  return value;
}

function fields(value: unknown): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CorruptField();
  }
  return value as Fields;
}

function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new CorruptField();
  return value;
}

function count(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new CorruptField();
  return value as number;
}

function unitInterval(value: unknown): number {
  if (typeof value !== 'number' || !(value >= 0 && value <= 1)) throw new CorruptField();
  return value;
}

function sensitivity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.5 || value > 1.5) {
    throw new CorruptField();
  }
  return value;
}

function quality(value: unknown): QualityLevel {
  if (!QUALITY_LEVELS.includes(value as QualityLevel)) throw new CorruptField();
  return value as QualityLevel;
}

function outfit(value: unknown): string {
  if (!(PIP_OUTFITS as readonly unknown[]).includes(value)) throw new CorruptField();
  return value as string;
}

function stringList(value: unknown): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new CorruptField();
  }
  return [...new Set(value as string[])];
}

function outfitList(value: unknown): readonly string[] {
  const list = stringList(value);
  list.forEach(outfit);
  return list;
}

function postmarkList(value: unknown): readonly number[] {
  if (!Array.isArray(value)) throw new CorruptField();
  const indices = value.map(count);
  if (indices.some((index) => index > MAX_POSTMARK_INDEX)) throw new CorruptField();
  return [...new Set(indices)].sort((a, b) => a - b);
}
