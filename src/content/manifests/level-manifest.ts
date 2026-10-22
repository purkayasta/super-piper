import type { StageId } from '../../game-engine/core/game-events';

export const STAGE_SCENES: Readonly<Record<StageId, string>> = {
  sandbox: 'SandboxScene',
  'test-room': 'TestRoomScene',
};

export function sceneKeyForStage(stageId: StageId): string | null {
  return Object.hasOwn(STAGE_SCENES, stageId) ? STAGE_SCENES[stageId] : null;
}
