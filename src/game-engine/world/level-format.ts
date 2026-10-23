import type { SceneryTheme } from '../../content/art/scenery-layers';
import type { StageId } from '../core/game-events';
import { EMPTY_TILE, Tile } from './tile-ids';

export const LEVEL_ROWS = 15;
export const VIEW_COLUMNS = 27;
export const GOAL_POLE_HEIGHT_TILES = 9;

export type LegendLayer = 'collision' | 'decoration' | 'none';

export type LegendMarker = 'start' | 'coin';

export interface LegendEntry {
  readonly layer: LegendLayer;
  readonly tile: number;
  readonly marker?: LegendMarker;
}

export const LegendSymbol = {
  empty: '.',
  start: 'S',
  ground: '#',
  brick: 'B',
  starBlock: '?',
  solid: 'X',
  coin: 'o',
  depotWall: 'w',
  depotBattlement: 'm',
  depotDoorTop: 'a',
  depotDoor: 'd',
} as const;

export const LEVEL_LEGEND: Readonly<Record<string, LegendEntry>> = {
  [LegendSymbol.empty]: { layer: 'none', tile: EMPTY_TILE },
  [LegendSymbol.start]: { layer: 'none', tile: EMPTY_TILE, marker: 'start' },
  [LegendSymbol.ground]: { layer: 'collision', tile: Tile.ground },
  [LegendSymbol.brick]: { layer: 'collision', tile: Tile.brick },
  [LegendSymbol.starBlock]: { layer: 'collision', tile: Tile.starBlock },
  [LegendSymbol.solid]: { layer: 'collision', tile: Tile.solidBlock },
  [LegendSymbol.coin]: { layer: 'none', tile: EMPTY_TILE, marker: 'coin' },
  [LegendSymbol.depotWall]: { layer: 'decoration', tile: Tile.depotWall },
  [LegendSymbol.depotBattlement]: { layer: 'decoration', tile: Tile.depotBattlement },
  [LegendSymbol.depotDoorTop]: { layer: 'decoration', tile: Tile.depotDoorTop },
  [LegendSymbol.depotDoor]: { layer: 'decoration', tile: Tile.depotDoor },
};

export interface TubeEntity {
  readonly kind: 'tube';
  readonly column: number;
  readonly topRow: number;
  readonly destination: StageId | null;
}

export interface GoalEntity {
  readonly kind: 'goal';
  readonly column: number;
}

export interface PostmarkEntity {
  readonly kind: 'postmark';
  readonly column: number;
  readonly row: number;
}

export type LevelEntity = TubeEntity | GoalEntity | PostmarkEntity;

export interface LevelDefinition {
  readonly id: StageId;
  readonly label: string;
  readonly theme: SceneryTheme;
  readonly music: string;
  readonly timeLimit: number;
  readonly targetTime: number;
  readonly rows: readonly string[];
  readonly entities: readonly LevelEntity[];
}

export interface CellCoordinate {
  readonly column: number;
  readonly row: number;
}

export interface CompiledTube {
  readonly column: number;
  readonly topRow: number;
  readonly bottomRow: number;
  readonly destination: StageId | null;
}

export interface CompiledGoal {
  readonly column: number;
  readonly baseRow: number;
  readonly poleTopRow: number;
}

export interface CompiledLevel {
  readonly width: number;
  readonly height: number;
  readonly collision: number[][];
  readonly decoration: number[][];
  readonly start: CellCoordinate;
  readonly coins: readonly CellCoordinate[];
  readonly postmarks: readonly CellCoordinate[];
  readonly tubes: readonly CompiledTube[];
  readonly goal: CompiledGoal;
  readonly doorColumn: number | null;
}
