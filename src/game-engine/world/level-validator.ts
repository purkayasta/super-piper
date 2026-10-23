import type { StageId } from '../core/game-events';
import {
  BLOCK_ITEMS,
  CHECKPOINT_HEIGHT_TILES,
  GOAL_POLE_HEIGHT_TILES,
  ITEM_BLOCK_SYMBOLS,
  LEVEL_LEGEND,
  LEVEL_ROWS,
  LegendSymbol,
  PLACED_ENEMY_KINDS,
  VIEW_COLUMNS,
  type LevelDefinition,
  type LevelEntity,
} from './level-format';

export const REQUIRED_POSTMARKS = 3;

export const MAX_CHECKPOINTS = 1;

export interface ValidationOptions {
  readonly knownStages?: ReadonlySet<StageId>;
}

export function validateLevel(level: LevelDefinition, options: ValidationOptions = {}): string[] {
  const errors: string[] = [];
  const shapeErrors = validateShape(level);
  if (shapeErrors.length > 0) return shapeErrors;
  errors.push(...validateSymbols(level));
  errors.push(...validateStart(level));
  errors.push(...validateTiming(level));
  errors.push(...validateEntities(level, options));
  return errors;
}

export function isSolidSymbol(symbol: string | undefined): boolean {
  return symbol !== undefined && LEVEL_LEGEND[symbol]?.layer === 'collision';
}

export function firstSolidRowBelow(
  rows: readonly string[],
  column: number,
  fromRow: number,
): number | null {
  for (let row = fromRow; row < rows.length; row++) {
    if (isSolidSymbol(rows[row][column])) return row;
  }
  return null;
}

function validateShape(level: LevelDefinition): string[] {
  const { rows } = level;
  if (rows.length !== LEVEL_ROWS) return [`Level has ${rows.length} rows, expected ${LEVEL_ROWS}`];
  const width = rows[0].length;
  if (width < VIEW_COLUMNS)
    return [`Level is ${width} columns wide, at least ${VIEW_COLUMNS} needed`];
  const errors: string[] = [];
  rows.forEach((row, index) => {
    if (row.length !== width)
      errors.push(`Row ${index} has length ${row.length}, expected ${width}`);
  });
  return errors;
}

function validateSymbols(level: LevelDefinition): string[] {
  const errors: string[] = [];
  level.rows.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column++) {
      if (!Object.hasOwn(LEVEL_LEGEND, row[column])) {
        errors.push(`Unknown symbol "${row[column]}" at row ${rowIndex}, column ${column}`);
      }
    }
  });
  return errors;
}

function validateStart(level: LevelDefinition): string[] {
  const count = level.rows.reduce(
    (total, row) => total + [...row].filter((symbol) => symbol === LegendSymbol.start).length,
    0,
  );
  return count === 1 ? [] : [`Level needs exactly one start "S", found ${count}`];
}

function validateTiming(level: LevelDefinition): string[] {
  const errors: string[] = [];
  if (!(level.timeLimit > 0)) errors.push('Time limit must be positive');
  if (!(level.targetTime > 0 && level.targetTime <= level.timeLimit)) {
    errors.push('Target time must be positive and within the time limit');
  }
  return errors;
}

function validateEntities(level: LevelDefinition, options: ValidationOptions): string[] {
  const errors: string[] = [];
  const goals = level.entities.filter((entity) => entity.kind === 'goal');
  const postmarks = level.entities.filter((entity) => entity.kind === 'postmark');
  if (goals.length !== 1) errors.push(`Level needs exactly one goal, found ${goals.length}`);
  if (postmarks.length !== REQUIRED_POSTMARKS) {
    errors.push(`Level needs exactly ${REQUIRED_POSTMARKS} Postmarks, found ${postmarks.length}`);
  }
  const checkpoints = level.entities.filter((entity) => entity.kind === 'checkpoint');
  if (checkpoints.length > MAX_CHECKPOINTS) {
    errors.push(`Level allows at most ${MAX_CHECKPOINTS} checkpoint, found ${checkpoints.length}`);
  }
  const claimed = new Map<string, string>();
  level.entities.forEach((entity, index) => {
    const label = `${entity.kind} #${index}`;
    errors.push(...validateEntityKind(entity, label));
    const cells = entityCells(level, entity);
    if (cells === null) {
      errors.push(`${label} is outside the level or has no ground below it`);
      return;
    }
    for (const [column, row] of cells) {
      const symbol = level.rows[row][column];
      if (entity.kind === 'item-block') {
        errors.push(...validateItemBlockCell(entity.item, symbol, label));
      } else if (symbol !== LegendSymbol.empty) {
        errors.push(`${label} overlaps "${symbol}" at row ${row}, column ${column}`);
      }
      const key = `${column},${row}`;
      const owner = claimed.get(key);
      if (owner !== undefined)
        errors.push(`${label} overlaps ${owner} at row ${row}, column ${column}`);
      claimed.set(key, label);
    }
    if (entity.kind === 'tube' && entity.destination !== null) {
      const known = options.knownStages;
      if (known !== undefined && !known.has(entity.destination)) {
        errors.push(`${label} leads to unknown stage "${entity.destination}"`);
      }
    }
  });
  errors.push(...validateDoor(level, goals[0]));
  errors.push(...validateCheckpointPlacement(level, checkpoints[0], goals[0]));
  return errors;
}

function validateEntityKind(entity: LevelEntity, label: string): string[] {
  if (entity.kind === 'enemy' && !PLACED_ENEMY_KINDS.includes(entity.enemy)) {
    return [`${label} has unknown enemy "${entity.enemy}"`];
  }
  if (entity.kind === 'item-block' && !BLOCK_ITEMS.includes(entity.item)) {
    return [`${label} has unknown item "${entity.item}"`];
  }
  return [];
}

function validateItemBlockCell(item: string, symbol: string, label: string): string[] {
  if (!ITEM_BLOCK_SYMBOLS.includes(symbol)) {
    return [`${label} must sit on a block ("?", "B" or "h"), found "${symbol}"`];
  }
  if (item === 'multi-coin' && symbol !== LegendSymbol.brick) {
    return [`${label} puts multi-coin on "${symbol}", but only bricks "B" can hold it`];
  }
  return [];
}

function validateCheckpointPlacement(
  level: LevelDefinition,
  checkpoint: LevelEntity | undefined,
  goal: LevelEntity | undefined,
): string[] {
  if (checkpoint === undefined || checkpoint.kind !== 'checkpoint') return [];
  const startColumn = level.rows.reduce(
    (found, row) => (found >= 0 ? found : row.indexOf(LegendSymbol.start)),
    -1,
  );
  const goalColumn = goal !== undefined && goal.kind === 'goal' ? goal.column : Infinity;
  if (checkpoint.column > startColumn && checkpoint.column < goalColumn) return [];
  return [`Checkpoint at column ${checkpoint.column} must lie between the start and the goal`];
}

function entityCells(level: LevelDefinition, entity: LevelEntity): [number, number][] | null {
  const { rows } = level;
  const width = rows[0].length;
  const inBounds = (column: number, row: number): boolean =>
    column >= 0 && column < width && row >= 0 && row < rows.length;
  switch (entity.kind) {
    case 'postmark':
    case 'enemy':
    case 'item-block':
      return inBounds(entity.column, entity.row) ? [[entity.column, entity.row]] : null;
    case 'checkpoint': {
      if (!inBounds(entity.column, 0)) return null;
      const ground = firstSolidRowBelow(rows, entity.column, 0);
      if (ground === null || ground - CHECKPOINT_HEIGHT_TILES < 0) return null;
      const cells: [number, number][] = [];
      for (let row = ground - CHECKPOINT_HEIGHT_TILES; row < ground; row++) {
        cells.push([entity.column, row]);
      }
      return cells;
    }
    case 'tube': {
      if (!inBounds(entity.column, entity.topRow) || !inBounds(entity.column + 1, entity.topRow)) {
        return null;
      }
      const left = firstSolidRowBelow(rows, entity.column, entity.topRow);
      const right = firstSolidRowBelow(rows, entity.column + 1, entity.topRow);
      if (left === null || left !== right || left === entity.topRow) return null;
      const cells: [number, number][] = [];
      for (let row = entity.topRow; row < left; row++) {
        cells.push([entity.column, row], [entity.column + 1, row]);
      }
      return cells;
    }
    case 'goal': {
      if (!inBounds(entity.column, 0)) return null;
      const ground = firstSolidRowBelow(rows, entity.column, 0);
      if (ground === null) return null;
      const baseRow = ground - 1;
      const poleTop = baseRow - GOAL_POLE_HEIGHT_TILES;
      if (poleTop < 0) return null;
      const cells: [number, number][] = [];
      for (let row = poleTop; row <= baseRow; row++) cells.push([entity.column, row]);
      return cells;
    }
  }
}

function validateDoor(level: LevelDefinition, goal: LevelEntity | undefined): string[] {
  if (goal === undefined || goal.kind !== 'goal') return [];
  const doorColumn = findDoorColumn(level.rows);
  if (doorColumn === null || doorColumn > goal.column) return [];
  return [`Depot door at column ${doorColumn} must be to the right of the goal`];
}

export function findDoorColumn(rows: readonly string[]): number | null {
  for (let row = rows.length - 1; row >= 0; row--) {
    const column = rows[row].indexOf(LegendSymbol.depotDoor);
    if (column >= 0) return column;
  }
  return null;
}
