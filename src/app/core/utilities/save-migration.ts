import { SAVE_SCHEMA_VERSION } from '../models/save-data.model';

export type RawSave = Readonly<Record<string, unknown>>;

export type SaveMigration = (save: RawSave) => RawSave;

export type MigrationOutcome =
  | { readonly status: 'ok'; readonly save: RawSave; readonly migrated: boolean }
  | { readonly status: 'newer' }
  | { readonly status: 'invalid' };

const UNVERSIONED = 0;

export const SAVE_MIGRATIONS: Readonly<Record<number, SaveMigration>> = {
  [UNVERSIONED]: (save) => ({ ...save, schemaVersion: 1 }),
};

export function saveVersion(save: RawSave): number | null {
  const version = save['schemaVersion'];
  if (version === undefined) return UNVERSIONED;
  return Number.isSafeInteger(version) && (version as number) >= 0 ? (version as number) : null;
}

export function migrateSave(
  save: RawSave,
  migrations: Readonly<Record<number, SaveMigration>> = SAVE_MIGRATIONS,
  targetVersion: number = SAVE_SCHEMA_VERSION,
): MigrationOutcome {
  const startVersion = saveVersion(save);
  if (startVersion === null) return { status: 'invalid' };
  if (startVersion > targetVersion) return { status: 'newer' };
  let version = startVersion;
  let current = save;
  while (version < targetVersion) {
    const migrate = migrations[version];
    if (migrate === undefined) return { status: 'invalid' };
    current = migrate(current);
    if (saveVersion(current) !== version + 1) return { status: 'invalid' };
    version++;
  }
  return { status: 'ok', save: current, migrated: version !== startVersion };
}
