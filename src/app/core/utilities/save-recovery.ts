import type { StageId } from '../../../game-engine/core/game-events';
import type { SaveData, SaveNotice } from '../models/save-data.model';
import { migrateSave, type RawSave, type SaveMigration } from './save-migration';
import { validateSave } from './save-validation';

export interface SaveContext {
  readonly defaults: SaveData;
  readonly knownStages: ReadonlySet<StageId>;
  readonly migrations?: Readonly<Record<number, SaveMigration>>;
}

export type ParsedSave =
  | { readonly status: 'ok'; readonly data: SaveData; readonly migrated: boolean }
  | { readonly status: 'missing' }
  | { readonly status: 'corrupt' }
  | { readonly status: 'newer' };

export type SaveSource = 'primary' | 'backup' | 'fresh';

export interface RestoredSave {
  readonly data: SaveData;
  readonly source: SaveSource;
  readonly notice: SaveNotice | null;
  readonly needsWrite: boolean;
  readonly corruptText: string | null;
}

export function parseSave(text: string | null, context: SaveContext): ParsedSave {
  if (text === null || text === '') return { status: 'missing' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { status: 'corrupt' };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { status: 'corrupt' };
  const migration = migrateSave(raw as RawSave, context.migrations);
  if (migration.status === 'newer') return { status: 'newer' };
  if (migration.status === 'invalid') return { status: 'corrupt' };
  const data = validateSave(migration.save, context.defaults, context.knownStages);
  return data === null
    ? { status: 'corrupt' }
    : { status: 'ok', data, migrated: migration.migrated };
}

export function restoreSave(
  primaryText: string | null,
  backupText: string | null,
  context: SaveContext,
): RestoredSave {
  const primary = parseSave(primaryText, context);
  if (primary.status === 'ok') {
    return {
      data: primary.data,
      source: 'primary',
      notice: null,
      needsWrite: primary.migrated,
      corruptText: null,
    };
  }
  const corruptText = primary.status === 'corrupt' ? primaryText : null;
  const backup = parseSave(backupText, context);
  if (backup.status === 'ok') {
    return {
      data: backup.data,
      source: 'backup',
      notice: 'restored-backup',
      needsWrite: primary.status !== 'newer',
      corruptText,
    };
  }
  const nothingStored = primary.status === 'missing' && backup.status === 'missing';
  return {
    data: context.defaults,
    source: 'fresh',
    notice: nothingStored ? null : 'reset-corrupt',
    needsWrite: false,
    corruptText,
  };
}
