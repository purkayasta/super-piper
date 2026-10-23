import type { SceneryTheme } from '../../content/art/scenery-layers';
import type { StageMusicId } from '../../content/audio/sound-ids';
import type { StageId } from '../core/game-events';
import { EMPTY_TILE, Tile } from './tile-ids';

export const LEVEL_ROWS = 15;
export const VIEW_COLUMNS = 27;
export const GOAL_POLE_HEIGHT_TILES = 9;

export type LegendLayer = 'collision' | 'decoration' | 'none';

export type LegendMarker = 'start' | 'coin' | 'hidden';

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
  hiddenBlock: 'h',
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
  [LegendSymbol.hiddenBlock]: { layer: 'none', tile: EMPTY_TILE, marker: 'hidden' },
  [LegendSymbol.depotWall]: { layer: 'decoration', tile: Tile.depotWall },
  [LegendSymbol.depotBattlement]: { layer: 'decoration', tile: Tile.depotBattlement },
  [LegendSymbol.depotDoorTop]: { layer: 'decoration', tile: Tile.depotDoorTop },
  [LegendSymbol.depotDoor]: { layer: 'decoration', tile: Tile.depotDoor },
};

export const PLACED_ENEMY_KINDS = ['thornbug', 'shellback', 'flapjack'] as const;

export type PlacedEnemyKind = (typeof PLACED_ENEMY_KINDS)[number];

export type EnemyKind = PlacedEnemyKind | 'snapvine';

export const BLOCK_ITEMS = ['power', 'star', 'one-up', 'multi-coin'] as const;

export type BlockItem = (typeof BLOCK_ITEMS)[number];

export const ITEM_BLOCK_SYMBOLS: readonly string[] = [
  LegendSymbol.starBlock,
  LegendSymbol.brick,
  LegendSymbol.hiddenBlock,
];

export const CHECKPOINT_HEIGHT_TILES = 2;

export interface TubeEntity {
  readonly kind: 'tube';
  readonly column: number;
  readonly topRow: number;
  readonly destination: StageId | null;
  readonly snapvine?: boolean;
}

export interface EnemyEntity {
  readonly kind: 'enemy';
  readonly enemy: PlacedEnemyKind;
  readonly column: number;
  readonly row: number;
}

export interface ItemBlockEntity {
  readonly kind: 'item-block';
  readonly item: BlockItem;
  readonly column: number;
  readonly row: number;
}

export interface CheckpointEntity {
  readonly kind: 'checkpoint';
  readonly column: number;
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

export type LevelEntity =
  TubeEntity | GoalEntity | PostmarkEntity | EnemyEntity | ItemBlockEntity | CheckpointEntity;

export interface LevelDefinition {
  readonly id: StageId;
  readonly label: string;
  readonly theme: SceneryTheme;
  readonly music: StageMusicId;
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

export interface EnemySpawn {
  readonly kind: EnemyKind;
  readonly column: number;
  readonly row: number;
}

export interface BlockItemCell {
  readonly column: number;
  readonly row: number;
  readonly item: BlockItem;
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
  readonly enemies: readonly EnemySpawn[];
  readonly blockItems: readonly BlockItemCell[];
  readonly hiddenBlocks: readonly CellCoordinate[];
  readonly checkpoint: CellCoordinate | null;
}
