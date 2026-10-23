import type { StageId } from '../../game-engine/core/game-events';

export type MapTheme = 'overworld' | 'underground' | 'sky' | 'castle';

export interface MapStage {
  readonly stageId: StageId;
  readonly title: string;
  readonly theme: MapTheme;
  readonly mapX: number;
  readonly mapY: number;
}

export interface WorldEntry {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly stages: readonly MapStage[];
}

export const WORLD_1: WorldEntry = {
  id: 'world-1',
  label: 'WORLD 1',
  title: 'THE MEADOW ROUTE',
  stages: [
    { stageId: '1-1', title: 'Parcel Path', theme: 'overworld', mapX: 14, mapY: 66 },
    { stageId: '1-2', title: 'Cellar Sorting', theme: 'underground', mapX: 38, mapY: 40 },
    { stageId: '1-3', title: 'Updraft Heights', theme: 'sky', mapX: 62, mapY: 62 },
    { stageId: '1-4', title: "Rook's Keep", theme: 'castle', mapX: 86, mapY: 34 },
  ],
};

export const WORLDS: readonly WorldEntry[] = [WORLD_1];

export function nextStageId(stageId: StageId): StageId | null {
  for (const world of WORLDS) {
    const index = world.stages.findIndex((stage) => stage.stageId === stageId);
    if (index >= 0) return world.stages[index + 1]?.stageId ?? null;
  }
  return null;
}
