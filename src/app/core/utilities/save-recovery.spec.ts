import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS } from '../../../game-engine/systems/input/actions';
import { freshSave, type SaveData } from '../models/save-data.model';
import { migrateSave, type SaveMigration } from './save-migration';
import { parseSave, restoreSave, type SaveContext } from './save-recovery';
import { validateSave } from './save-validation';

const DEFAULTS = freshSave(false);
const KNOWN = new Set(['1-1', '1-2']);
const CONTEXT: SaveContext = { defaults: DEFAULTS, knownStages: KNOWN };

const PLAYED: SaveData = {
  ...DEFAULTS,
  progression: {
    coins: 140,
    xp: 620,
    stages: {
      '1-1': {
        cleared: true,
        clears: 2,
        bestScore: 18250,
        bestTime: 96,
        postmarksFound: [0, 2],
        stars: { finish: true, postmarks: false, time: true },
      },
    },
  },
  settings: { ...DEFAULTS.settings, quality: 'low', volumes: { master: 0.5, music: 0, sfx: 1 } },
};

function withField(path: string[], value: unknown): unknown {
  const copy = structuredClone(PLAYED) as unknown as Record<string, unknown>;
  let target = copy;
  for (const key of path.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[path[path.length - 1]] = value;
  return copy;
}

describe('validateSave', () => {
  it('accepts a full save unchanged', () => {
    expect(validateSave(structuredClone(PLAYED), DEFAULTS, KNOWN)).toEqual(PLAYED);
  });

  it('fills every missing section and field with its default', () => {
    expect(validateSave({ schemaVersion: 1 }, DEFAULTS, KNOWN)).toEqual(DEFAULTS);
    const partial = validateSave(
      { schemaVersion: 1, settings: { quality: 'medium' }, progression: { coins: 5 } },
      DEFAULTS,
      KNOWN,
    );
    expect(partial?.settings).toEqual({ ...DEFAULTS.settings, quality: 'medium' });
    expect(partial?.progression).toEqual({ stages: {}, coins: 5, xp: 0 });
  });

  it('drops stages that no longer exist', () => {
    const save = withField(['progression', 'stages', '9-9'], PLAYED.progression.stages['1-1']);
    expect(Object.keys(validateSave(save, DEFAULTS, KNOWN)!.progression.stages)).toEqual(['1-1']);
  });

  it('sorts and de-duplicates found Postmarks', () => {
    const save = withField(['progression', 'stages', '1-1', 'postmarksFound'], [2, 0, 2]);
    expect(validateSave(save, DEFAULTS, KNOWN)!.progression.stages['1-1'].postmarksFound).toEqual([
      0, 2,
    ]);
  });

  it.each([
    ['a negative coin balance', ['progression', 'coins'], -1],
    ['fractional XP', ['progression', 'xp'], 1.5],
    ['a text score', ['progression', 'stages', '1-1', 'bestScore'], '900'],
    ['a star that is not a flag', ['progression', 'stages', '1-1', 'stars', 'time'], 1],
    ['a volume above 1', ['settings', 'volumes', 'music'], 1.2],
    ['jump sensitivity below its range', ['settings', 'jumpSensitivity'], 0.25],
    ['turn sensitivity above its range', ['settings', 'rightSensitivity'], 2],
    ['an unknown quality', ['settings', 'quality'], 'ultra'],
    ['conflicting key bindings', ['settings', 'bindings'], { ...DEFAULT_BINDINGS, jump: ['KeyA'] }],
    ['an unknown outfit', ['cosmetics', 'equipped'], 'tuxedo'],
    ['an equipped outfit that is not owned', ['cosmetics', 'equipped'], 'forest'],
    ['achievements that are not a list', ['achievements'], 'first-clear'],
    ['a section that is not an object', ['settings'], 7],
  ])('rejects %s', (_name, path, value) => {
    expect(validateSave(withField(path as string[], value), DEFAULTS, KNOWN)).toBeNull();
  });

  it('rejects a different schema version', () => {
    expect(validateSave({ ...PLAYED, schemaVersion: 2 }, DEFAULTS, KNOWN)).toBeNull();
  });
});

describe('migrateSave', () => {
  it('reads an unversioned save as version 1', () => {
    expect(migrateSave({ progression: { coins: 3 } })).toEqual({
      status: 'ok',
      save: { progression: { coins: 3 }, schemaVersion: 1 },
      migrated: true,
    });
  });

  it('leaves a current save alone', () => {
    expect(migrateSave({ schemaVersion: 1 })).toEqual({
      status: 'ok',
      save: { schemaVersion: 1 },
      migrated: false,
    });
  });

  it('runs every step in order up to the target version', () => {
    const steps: Record<number, SaveMigration> = {
      1: (save) => ({ ...save, schemaVersion: 2, trail: ['1→2'] }),
      2: (save) => ({ ...save, schemaVersion: 3, trail: [...(save['trail'] as string[]), '2→3'] }),
    };
    const outcome = migrateSave({ schemaVersion: 1 }, steps, 3);
    expect(outcome).toEqual({
      status: 'ok',
      save: { schemaVersion: 3, trail: ['1→2', '2→3'] },
      migrated: true,
    });
  });

  it('refuses newer saves, broken versions and gaps in the table', () => {
    expect(migrateSave({ schemaVersion: 4 })).toEqual({ status: 'newer' });
    expect(migrateSave({ schemaVersion: 'one' })).toEqual({ status: 'invalid' });
    expect(migrateSave({ schemaVersion: 1 }, {}, 2)).toEqual({ status: 'invalid' });
    const wrongStep: Record<number, SaveMigration> = { 1: (save) => ({ ...save }) };
    expect(migrateSave({ schemaVersion: 1 }, wrongStep, 2)).toEqual({ status: 'invalid' });
  });
});

describe('parseSave', () => {
  it('tells missing, corrupt, newer and good saves apart', () => {
    expect(parseSave(null, CONTEXT)).toEqual({ status: 'missing' });
    expect(parseSave('', CONTEXT)).toEqual({ status: 'missing' });
    expect(parseSave('{"schemaVersion":1', CONTEXT)).toEqual({ status: 'corrupt' });
    expect(parseSave('[1,2]', CONTEXT)).toEqual({ status: 'corrupt' });
    expect(parseSave('null', CONTEXT)).toEqual({ status: 'corrupt' });
    expect(parseSave('{"schemaVersion":9}', CONTEXT)).toEqual({ status: 'newer' });
    expect(parseSave(JSON.stringify(PLAYED), CONTEXT)).toEqual({
      status: 'ok',
      data: PLAYED,
      migrated: false,
    });
  });
});

describe('restoreSave', () => {
  const good = JSON.stringify(PLAYED);
  const older = JSON.stringify({ ...PLAYED, progression: { ...PLAYED.progression, coins: 90 } });

  it('uses a good primary save', () => {
    expect(restoreSave(good, older, CONTEXT)).toEqual({
      data: PLAYED,
      source: 'primary',
      notice: null,
      needsWrite: false,
      corruptText: null,
    });
  });

  it('asks for a write after migrating the primary', () => {
    const unversioned = JSON.stringify({ progression: PLAYED.progression });
    expect(restoreSave(unversioned, null, CONTEXT)).toMatchObject({
      source: 'primary',
      needsWrite: true,
    });
  });

  it('falls back to the backup and keeps the corrupt text', () => {
    const restored = restoreSave('{garbage', older, CONTEXT);
    expect(restored.source).toBe('backup');
    expect(restored.data.progression.coins).toBe(90);
    expect(restored.notice).toBe('restored-backup');
    expect(restored.needsWrite).toBe(true);
    expect(restored.corruptText).toBe('{garbage');
  });

  it('starts fresh with a notice when both slots are bad', () => {
    expect(restoreSave('{garbage', '42', CONTEXT)).toEqual({
      data: DEFAULTS,
      source: 'fresh',
      notice: 'reset-corrupt',
      needsWrite: false,
      corruptText: '{garbage',
    });
  });

  it('starts fresh quietly for a new player', () => {
    expect(restoreSave(null, null, CONTEXT)).toMatchObject({ source: 'fresh', notice: null });
  });

  it('never overwrites a save from a newer version on load', () => {
    const newer = JSON.stringify({ ...PLAYED, schemaVersion: 5 });
    expect(restoreSave(newer, older, CONTEXT)).toMatchObject({
      source: 'backup',
      needsWrite: false,
      corruptText: null,
    });
  });
});
