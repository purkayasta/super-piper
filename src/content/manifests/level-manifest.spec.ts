import { describe, expect, it } from 'vitest';
import { compileLevel } from '../../game-engine/world/level-compiler';
import { validateLevel } from '../../game-engine/world/level-validator';
import { ASSET_MANIFEST } from './asset-manifest';
import {
  FIRST_STAGE_ID,
  LEVEL_SCENE_KEY,
  STAGES,
  sceneKeyForStage,
  stageEntry,
} from './level-manifest';

describe('level manifest', () => {
  it('maps known stages to their scene keys', () => {
    expect(sceneKeyForStage('sandbox')).toBe('SandboxScene');
    expect(sceneKeyForStage('test-room')).toBe('TestRoomScene');
    expect(sceneKeyForStage('1-1')).toBe(LEVEL_SCENE_KEY);
  });

  it('returns null for unknown or inherited keys', () => {
    expect(sceneKeyForStage('world-9')).toBeNull();
    expect(sceneKeyForStage('toString')).toBeNull();
    expect(stageEntry('constructor')).toBeNull();
  });

  it('starts the campaign at a stage that exists', () => {
    expect(FIRST_STAGE_ID).toBe('1-1');
    expect(stageEntry(FIRST_STAGE_ID)?.level?.id).toBe(FIRST_STAGE_ID);
  });

  it('only references asset ids that exist in the asset manifest', () => {
    for (const entry of Object.values(STAGES)) {
      for (const id of entry.assets) expect(Object.hasOwn(ASSET_MANIFEST, id), id).toBe(true);
    }
  });

  it('gives every level scene a level definition', () => {
    for (const entry of Object.values(STAGES)) {
      if (entry.sceneKey === LEVEL_SCENE_KEY) expect(entry.level).toBeDefined();
    }
  });
});

describe('1-1', () => {
  const level = stageEntry('1-1')!.level!;

  it('validates cleanly against the known stages', () => {
    expect(validateLevel(level, { knownStages: new Set(Object.keys(STAGES)) })).toEqual([]);
  });

  it('is a long overworld stage with a goal, a depot door and three Postmarks', () => {
    const compiled = compileLevel(level);
    expect(level.theme).toBe('overworld');
    expect(compiled.width).toBeGreaterThanOrEqual(200);
    expect(compiled.postmarks).toHaveLength(3);
    expect(compiled.doorColumn).toBeGreaterThan(compiled.goal.column);
    expect(compiled.coins.length).toBeGreaterThan(20);
    expect(compiled.tubes.length).toBeGreaterThan(3);
  });
});
