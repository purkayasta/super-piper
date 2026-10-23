import { describe, expect, it } from 'vitest';
import { FIRST_STAGE_ID, stageEntry } from './level-manifest';
import { WORLD_1, WORLDS, nextStageId } from './world-manifest';

describe('world manifest', () => {
  it('lays out World 1 as four stages in order, starting at the first stage', () => {
    expect(WORLD_1.stages.map((stage) => stage.stageId)).toEqual(['1-1', '1-2', '1-3', '1-4']);
    expect(WORLD_1.stages[0].stageId).toBe(FIRST_STAGE_ID);
  });

  it('gives every stage a title and an on-map position', () => {
    for (const stage of WORLD_1.stages) {
      expect(stage.title.length).toBeGreaterThan(0);
      expect(stage.mapX).toBeGreaterThanOrEqual(0);
      expect(stage.mapX).toBeLessThanOrEqual(100);
      expect(stage.mapY).toBeGreaterThanOrEqual(0);
      expect(stage.mapY).toBeLessThanOrEqual(100);
    }
  });

  it('never names a stage twice', () => {
    const ids = WORLDS.flatMap((world) => world.stages.map((stage) => stage.stageId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves built stages through the level manifest', () => {
    expect(stageEntry(WORLD_1.stages[0].stageId)?.level).toBeDefined();
  });

  it('finds the next stage in world order', () => {
    expect(nextStageId('1-1')).toBe('1-2');
    expect(nextStageId('1-4')).toBeNull();
    expect(nextStageId('test-room')).toBeNull();
  });
});
