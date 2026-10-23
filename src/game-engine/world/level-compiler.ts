import {
  GOAL_POLE_HEIGHT_TILES,
  LEVEL_LEGEND,
  type CellCoordinate,
  type CompiledLevel,
  type CompiledTube,
  type LevelDefinition,
} from './level-format';
import { findDoorColumn, firstSolidRowBelow, validateLevel } from './level-validator';
import { EMPTY_TILE, Tile, isGround } from './tile-ids';

export function compileLevel(level: LevelDefinition): CompiledLevel {
  const errors = validateLevel(level);
  if (errors.length > 0) throw new Error(`Level "${level.id}" is invalid:\n${errors.join('\n')}`);
  const { rows } = level;
  const collision = layerGrid(rows, 'collision');
  const decoration = layerGrid(rows, 'decoration');
  const tubes: CompiledTube[] = [];
  let goal = { column: 0, baseRow: 0, poleTopRow: 0 };
  const postmarks: CellCoordinate[] = [];
  for (const entity of level.entities) {
    switch (entity.kind) {
      case 'tube': {
        const bottomRow = firstSolidRowBelow(rows, entity.column, entity.topRow)! - 1;
        stampTube(collision, entity.column, entity.topRow, bottomRow);
        tubes.push({
          column: entity.column,
          topRow: entity.topRow,
          bottomRow,
          destination: entity.destination,
        });
        break;
      }
      case 'goal': {
        const baseRow = firstSolidRowBelow(rows, entity.column, 0)! - 1;
        collision[baseRow][entity.column] = Tile.solidBlock;
        goal = { column: entity.column, baseRow, poleTopRow: baseRow - GOAL_POLE_HEIGHT_TILES };
        break;
      }
      case 'postmark':
        postmarks.push({ column: entity.column, row: entity.row });
        break;
    }
  }
  autotileGround(collision);
  return {
    width: rows[0].length,
    height: rows.length,
    collision,
    decoration,
    start: markers(rows, 'start')[0],
    coins: markers(rows, 'coin'),
    postmarks,
    tubes,
    goal,
    doorColumn: findDoorColumn(rows),
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

function layerGrid(rows: readonly string[], layer: 'collision' | 'decoration'): number[][] {
  return rows.map((row) =>
    [...row].map((symbol) => {
      const entry = LEVEL_LEGEND[symbol];
      return entry.layer === layer ? entry.tile : EMPTY_TILE;
    }),
  );
}

function markers(rows: readonly string[], marker: 'start' | 'coin'): CellCoordinate[] {
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
