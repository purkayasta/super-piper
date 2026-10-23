import { TILE_SIZE } from '../configuration/physics.config';
import {
  GOAL_POLE_HEIGHT_TILES,
  LEVEL_LEGEND,
  LegendSymbol,
  MAIN_AREA,
  type AreaDefinition,
  type AreaId,
  type BlockItemCell,
  type BossEntity,
  type CellCoordinate,
  type CompiledBoss,
  type CompiledFirebar,
  type CompiledGoal,
  type CompiledLevel,
  type CompiledPlatform,
  type CompiledTube,
  type EnemySpawn,
  type LegendLayer,
  type LegendMarker,
  type LevelDefinition,
} from './level-format';
import {
  bossArenaLeftColumn,
  findDoorColumn,
  firstSolidRowBelow,
  groundRow,
  levelAreas,
  validateLevel,
} from './level-validator';
import { EMPTY_TILE, Tile, isGround } from './tile-ids';

const DEGREES_TO_RADIANS = Math.PI / 180;

export function compileLevel(level: LevelDefinition): CompiledLevel {
  return compileArea(level, MAIN_AREA);
}

export function compileArea(level: LevelDefinition, areaId: AreaId): CompiledLevel {
  const errors = validateLevel(level);
  if (errors.length > 0) throw new Error(`Level "${level.id}" is invalid:\n${errors.join('\n')}`);
  const area = levelAreas(level).get(areaId);
  if (area === undefined) throw new Error(`Level "${level.id}" has no area "${areaId}"`);
  return compileValidArea(area);
}

function compileValidArea(area: AreaDefinition): CompiledLevel {
  const { rows } = area;
  const collision = layerGrid(rows, 'collision');
  const decoration = layerGrid(rows, 'decoration');
  const hazard = layerGrid(rows, 'hazard');
  const tubes: CompiledTube[] = [];
  let goal: CompiledGoal | null = null;
  const postmarks: CellCoordinate[] = [];
  const enemies: EnemySpawn[] = [];
  const blockItems: BlockItemCell[] = [];
  const platforms: CompiledPlatform[] = [];
  const firebars: CompiledFirebar[] = [];
  let checkpoint: CellCoordinate | null = null;
  let boss: CompiledBoss | null = null;
  for (const entity of area.entities) {
    switch (entity.kind) {
      case 'tube': {
        const bottomRow = firstSolidRowBelow(rows, entity.column, entity.topRow)! - 1;
        stampTube(collision, entity.column, entity.topRow, bottomRow);
        tubes.push({
          column: entity.column,
          topRow: entity.topRow,
          bottomRow,
          id: entity.id ?? null,
          destination: entity.destination,
        });
        if (entity.snapvine === true) {
          enemies.push({ kind: 'snapvine', column: entity.column, row: entity.topRow });
        }
        break;
      }
      case 'goal': {
        const baseRow = groundRow(rows, entity.column)! - 1;
        collision[baseRow][entity.column] = Tile.solidBlock;
        goal = { column: entity.column, baseRow, poleTopRow: baseRow - GOAL_POLE_HEIGHT_TILES };
        break;
      }
      case 'postmark':
        postmarks.push({ column: entity.column, row: entity.row });
        break;
      case 'enemy':
        enemies.push({ kind: entity.enemy, column: entity.column, row: entity.row });
        break;
      case 'item-block':
        blockItems.push({ column: entity.column, row: entity.row, item: entity.item });
        break;
      case 'checkpoint':
        checkpoint = {
          column: entity.column,
          row: groundRow(rows, entity.column)! - 1,
        };
        break;
      case 'platform':
        platforms.push({
          x: entity.column * TILE_SIZE,
          y: entity.row * TILE_SIZE,
          width: entity.width * TILE_SIZE,
          travelX: entity.travelX * TILE_SIZE,
          travelY: entity.travelY * TILE_SIZE,
          periodSeconds: entity.periodSeconds,
          phase: entity.phase,
        });
        break;
      case 'firebar':
        collision[entity.row][entity.column] = Tile.usedBlock;
        firebars.push({
          centerX: (entity.column + 0.5) * TILE_SIZE,
          centerY: (entity.row + 0.5) * TILE_SIZE,
          segments: entity.segments,
          turnsPerSecond: entity.turnsPerSecond,
          startRadians: entity.startDegrees * DEGREES_TO_RADIANS,
        });
        break;
      case 'boss':
        boss = compileBoss(rows, entity);
        break;
    }
  }
  enemies.sort((a, b) => a.column - b.column || a.row - b.row);
  autotileGround(collision);
  return {
    width: rows[0].length,
    height: rows.length,
    collision,
    decoration,
    hazard,
    start: markers(rows, 'start')[0],
    coins: markers(rows, 'coin'),
    postmarks,
    tubes,
    goal,
    doorColumn: findDoorColumn(rows),
    enemies,
    blockItems,
    hiddenBlocks: markers(rows, 'hidden'),
    checkpoint,
    platforms,
    firebars,
    boss,
  };
}

function compileBoss(rows: readonly string[], boss: BossEntity): CompiledBoss {
  const ground = groundRow(rows, boss.column)!;
  const gateRows: number[] = [];
  rows.forEach((row, index) => {
    if (row[boss.gateColumn] === LegendSymbol.gate) gateRows.push(index);
  });
  return {
    centerX: (boss.column + 1) * TILE_SIZE,
    groundY: ground * TILE_SIZE,
    gateColumn: boss.gateColumn,
    gateRows,
    arenaLeftPx: bossArenaLeftColumn(boss.gateColumn) * TILE_SIZE,
    arenaRightPx: (boss.gateColumn + 1) * TILE_SIZE,
  };
}

export function autotileGround(grid: number[][]): void {
  for (let row = grid.length - 1; row >= 0; row--) {
    for (let column = 0; column < grid[row].length; column++) {
      if (!isGround(grid[row][column])) continue;
      const above = row > 0 ? grid[row - 1][column] : EMPTY_TILE;
      grid[row][column] = isGround(above) ? Tile.ground : Tile.groundTop;
    }
  }
}

function layerGrid(rows: readonly string[], layer: LegendLayer): number[][] {
  return rows.map((row) =>
    [...row].map((symbol) => {
      const entry = LEVEL_LEGEND[symbol];
      return entry.layer === layer ? entry.tile : EMPTY_TILE;
    }),
  );
}

function markers(rows: readonly string[], marker: LegendMarker): CellCoordinate[] {
  const found: CellCoordinate[] = [];
  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column++) {
      if (LEVEL_LEGEND[row[column]].marker === marker) found.push({ column, row: rowIndex });
    }
  });
  return found;
}

function stampTube(grid: number[][], column: number, topRow: number, bottomRow: number): void {
  grid[topRow][column] = Tile.tubeTopLeft;
  grid[topRow][column + 1] = Tile.tubeTopRight;
  for (let row = topRow + 1; row <= bottomRow; row++) {
    grid[row][column] = Tile.tubeBodyLeft;
    grid[row][column + 1] = Tile.tubeBodyRight;
  }
}
