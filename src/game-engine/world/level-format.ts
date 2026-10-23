import type { SceneryTheme } from '../../content/art/scenery-layers';
import type { StageMusicId } from '../../content/audio/sound-ids';
import type { StageId } from '../core/game-events';
import { EMPTY_TILE, Tile } from './tile-ids';

export const LEVEL_ROWS = 15;
export const VIEW_COLUMNS = 27;
export const GOAL_POLE_HEIGHT_TILES = 9;
export const BOSS_SIZE_TILES = 2;

export type LegendLayer = 'collision' | 'decoration' | 'hazard' | 'none';

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
  lavaSurface: '~',
  lava: '=',
  gate: 'g',
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
  [LegendSymbol.lavaSurface]: { layer: 'hazard', tile: Tile.lavaSurface },
  [LegendSymbol.lava]: { layer: 'hazard', tile: Tile.lava },
  [LegendSymbol.gate]: { layer: 'collision', tile: Tile.gate },
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

export type AreaId = string;

export const MAIN_AREA: AreaId = 'main';

export type AreaRole = 'stage' | 'bonus';

export interface TubeLink {
  readonly area: AreaId;
  readonly tube: string;
}

export interface TubeEntity {
  readonly kind: 'tube';
  readonly column: number;
  readonly topRow: number;
  readonly id?: string;
  readonly destination: TubeLink | null;
  readonly snapvine?: boolean;
}

export const PLATFORM_WIDTHS = { min: 2, max: 4 } as const;

export interface PlatformEntity {
  readonly kind: 'platform';
  readonly column: number;
  readonly row: number;
  readonly width: number;
  readonly travelX: number;
  readonly travelY: number;
  readonly periodSeconds: number;
  readonly phase: number;
}

export const FIREBAR_SEGMENTS = { min: 2, max: 8 } as const;

export const FIREBAR_MAX_TURNS_PER_SECOND = 1;

export interface FirebarEntity {
  readonly kind: 'firebar';
  readonly column: number;
  readonly row: number;
  readonly segments: number;
  readonly turnsPerSecond: number;
  readonly startDegrees: number;
}

export interface BossEntity {
  readonly kind: 'boss';
  readonly column: number;
  readonly gateColumn: number;
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
  | TubeEntity
  | GoalEntity
  | PostmarkEntity
  | EnemyEntity
  | ItemBlockEntity
  | CheckpointEntity
  | PlatformEntity
  | FirebarEntity
  | BossEntity;

export interface AreaDefinition {
  readonly theme: SceneryTheme;
  readonly music: StageMusicId;
  readonly rows: readonly string[];
  readonly entities: readonly LevelEntity[];
}

export interface LevelDefinition extends AreaDefinition {
  readonly id: StageId;
  readonly label: string;
  readonly timeLimit: number;
  readonly targetTime: number;
  readonly areas?: Readonly<Record<AreaId, AreaDefinition>>;
}

export interface CellCoordinate {
  readonly column: number;
  readonly row: number;
}

export interface CompiledTube {
  readonly column: number;
  readonly topRow: number;
  readonly bottomRow: number;
  readonly id: string | null;
  readonly destination: TubeLink | null;
}

export interface CompiledPlatform {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly travelX: number;
  readonly travelY: number;
  readonly periodSeconds: number;
  readonly phase: number;
}

export interface CompiledFirebar {
  readonly centerX: number;
  readonly centerY: number;
  readonly segments: number;
  readonly turnsPerSecond: number;
  readonly startRadians: number;
}

export interface CompiledBoss {
  readonly centerX: number;
  readonly groundY: number;
  readonly gateColumn: number;
  readonly gateRows: readonly number[];
  readonly arenaLeftPx: number;
  readonly arenaRightPx: number;
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
  readonly hazard: number[][];
  readonly start: CellCoordinate;
  readonly coins: readonly CellCoordinate[];
  readonly postmarks: readonly CellCoordinate[];
  readonly tubes: readonly CompiledTube[];
  readonly goal: CompiledGoal | null;
  readonly doorColumn: number | null;
  readonly enemies: readonly EnemySpawn[];
  readonly blockItems: readonly BlockItemCell[];
  readonly hiddenBlocks: readonly CellCoordinate[];
  readonly checkpoint: CellCoordinate | null;
  readonly platforms: readonly CompiledPlatform[];
  readonly firebars: readonly CompiledFirebar[];
  readonly boss: CompiledBoss | null;
}
