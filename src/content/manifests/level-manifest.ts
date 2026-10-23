import type { StageId } from '../../game-engine/core/game-events';
import type { LevelDefinition } from '../../game-engine/world/level-format';
import { STAGE_1_1 } from '../levels/world-1/stage-1-1';
import { GAMEPLAY_ATLAS_ID, tilesetAssetId, type AssetId } from './asset-manifest';
import { TEST_ROOM_STAGE_ID } from './stage-ids';

export { FIRST_STAGE_ID } from './stage-ids';

export const LEVEL_SCENE_KEY = 'LevelScene';

export interface StageEntry {
  readonly sceneKey: string;
  readonly label: string;
  readonly assets: readonly AssetId[];
  readonly level?: LevelDefinition;
}

const PIXEL_ART_ASSETS: readonly AssetId[] = [GAMEPLAY_ATLAS_ID, tilesetAssetId('overworld')];

export const STAGES: Readonly<Record<StageId, StageEntry>> = {
  sandbox: { sceneKey: 'SandboxScene', label: 'SANDBOX', assets: [] },
  [TEST_ROOM_STAGE_ID]: { sceneKey: 'TestRoomScene', label: 'TEST', assets: PIXEL_ART_ASSETS },
  [STAGE_1_1.id]: {
    sceneKey: LEVEL_SCENE_KEY,
    label: STAGE_1_1.label,
    assets: PIXEL_ART_ASSETS,
    level: STAGE_1_1,
  },
};

export function stageEntry(stageId: StageId): StageEntry | null {
  return Object.hasOwn(STAGES, stageId) ? STAGES[stageId] : null;
}

export function sceneKeyForStage(stageId: StageId): string | null {
  return stageEntry(stageId)?.sceneKey ?? null;
}
