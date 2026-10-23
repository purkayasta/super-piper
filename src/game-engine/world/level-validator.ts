import { isStageMusic } from '../../content/audio/sound-ids';
import {
  BLOCK_ITEMS,
  BOSS_SIZE_TILES,
  CHECKPOINT_HEIGHT_TILES,
  FIREBAR_MAX_TURNS_PER_SECOND,
  FIREBAR_SEGMENTS,
  GOAL_POLE_HEIGHT_TILES,
  ITEM_BLOCK_SYMBOLS,
  LEVEL_LEGEND,
  LEVEL_ROWS,
  LegendSymbol,
  MAIN_AREA,
  PLACED_ENEMY_KINDS,
  PLATFORM_WIDTHS,
  VIEW_COLUMNS,
  type AreaDefinition,
  type AreaId,
  type AreaRole,
  type BossEntity,
  type FirebarEntity,
  type LevelDefinition,
  type LevelEntity,
  type PlatformEntity,
  type TubeEntity,
} from './level-format';

export const REQUIRED_POSTMARKS = 3;

export const MAX_CHECKPOINTS = 1;

export const MAX_BOSSES = 1;

const STAGE_ONLY_KINDS: readonly LevelEntity['kind'][] = ['goal', 'postmark', 'checkpoint', 'boss'];

export function validateLevel(level: LevelDefinition): string[] {
  const errors = validateArea(level, 'stage');
  if (errors.length === 0 || !isShapeError(errors[0])) errors.push(...validateTiming(level));
  for (const [areaId, area] of Object.entries(level.areas ?? {})) {
    if (areaId === MAIN_AREA) {
      errors.push(`Area "${MAIN_AREA}" is reserved for the stage itself`);
      continue;
    }
    for (const error of validateArea(area, 'bonus')) errors.push(`Area "${areaId}": ${error}`);
  }
  errors.push(...validateTubeLinks(level));
  return errors;
}

export function levelAreas(level: LevelDefinition): ReadonlyMap<AreaId, AreaDefinition> {
  return new Map<AreaId, AreaDefinition>([[MAIN_AREA, level], ...Object.entries(level.areas ?? {})]);
}

export function validateArea(area: AreaDefinition, role: AreaRole): string[] {
  const shapeErrors = validateShape(area);
  if (shapeErrors.length > 0) return shapeErrors;
  const errors: string[] = [];
  errors.push(...validateSymbols(area));
  errors.push(...validateStart(area));
  if (!isStageMusic(area.music)) errors.push(`Music "${area.music}" is not a stage theme`);
  errors.push(...validateEntities(area, role));
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

export function groundRow(rows: readonly string[], column: number): number | null {
  let row = rows.length - 1;
  if (!isSolidSymbol(rows[row][column])) return null;
  while (row > 0 && isSolidSymbol(rows[row - 1][column])) row--;
  return row;
}

export function bossArenaLeftColumn(gateColumn: number): number {
  return gateColumn - (VIEW_COLUMNS - 1);
}

function isShapeError(error: string): boolean {
  return error.startsWith('Level has') || error.startsWith('Level is') || error.startsWith('Row ');
}

function validateShape(area: AreaDefinition): string[] {
  const { rows } = area;
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

function validateSymbols(area: AreaDefinition): string[] {
  const errors: string[] = [];
  area.rows.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column++) {
      if (!Object.hasOwn(LEVEL_LEGEND, row[column])) {
        errors.push(`Unknown symbol "${row[column]}" at row ${rowIndex}, column ${column}`);
      }
    }
  });
  return errors;
}

function validateStart(area: AreaDefinition): string[] {
  const count = area.rows.reduce(
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

function validateEntities(area: AreaDefinition, role: AreaRole): string[] {
  const errors: string[] = [];
  const count = (kind: LevelEntity['kind']): number =>
    area.entities.filter((entity) => entity.kind === kind).length;
  const goals = area.entities.filter((entity) => entity.kind === 'goal');
  const checkpoints = area.entities.filter((entity) => entity.kind === 'checkpoint');
  const bosses = area.entities.filter((entity) => entity.kind === 'boss');
  if (role === 'stage') {
    if (goals.length !== 1) errors.push(`Level needs exactly one goal, found ${goals.length}`);
    const postmarks = count('postmark');
    if (postmarks !== REQUIRED_POSTMARKS) {
      errors.push(`Level needs exactly ${REQUIRED_POSTMARKS} Postmarks, found ${postmarks}`);
    }
    if (checkpoints.length > MAX_CHECKPOINTS) {
      errors.push(
        `Level allows at most ${MAX_CHECKPOINTS} checkpoint, found ${checkpoints.length}`,
      );
    }
    if (bosses.length > MAX_BOSSES) {
      errors.push(`Level allows at most ${MAX_BOSSES} boss, found ${bosses.length}`);
    }
  } else {
    for (const kind of STAGE_ONLY_KINDS) {
      if (count(kind) > 0) errors.push(`A bonus area cannot have a ${kind}`);
    }
    if (!area.entities.some((entity) => entity.kind === 'tube' && entity.destination !== null)) {
      errors.push('A bonus area needs a tube that leads out');
    }
  }
  errors.push(...validateTubeIds(area));
  const claimed = new Map<string, string>();
  area.entities.forEach((entity, index) => {
    const label = `${entity.kind} #${index}`;
    errors.push(...validateEntityKind(area, entity, label));
    const cells = entityCells(area, entity);
    if (cells === null) {
      errors.push(`${label} is outside the level or has no ground below it`);
      return;
    }
    for (const [column, row] of cells) {
      const symbol = area.rows[row][column];
      if (entity.kind === 'item-block') {
        errors.push(...validateItemBlockCell(entity.item, symbol, label));
      } else if (entity.kind === 'firebar') {
        if (!isSolidSymbol(symbol)) {
          errors.push(`${label} must turn around a solid block, found "${symbol}"`);
        }
      } else if (symbol !== LegendSymbol.empty) {
        errors.push(`${label} overlaps "${symbol}" at row ${row}, column ${column}`);
      }
      const key = `${column},${row}`;
      const owner = claimed.get(key);
      if (owner !== undefined)
        errors.push(`${label} overlaps ${owner} at row ${row}, column ${column}`);
      claimed.set(key, label);
    }
  });
  if (role === 'stage') {
    errors.push(...validateDoor(area, goals[0]));
    errors.push(...validateCheckpointPlacement(area, checkpoints[0], goals[0]));
    errors.push(...validateBossArena(area, bosses[0], goals[0]));
  }
  return errors;
}

function validateTubeIds(area: AreaDefinition): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const entity of area.entities) {
    if (entity.kind !== 'tube' || entity.id === undefined) continue;
    if (seen.has(entity.id)) errors.push(`Tube id "${entity.id}" is used twice`);
    seen.add(entity.id);
  }
  return errors;
}

function validateEntityKind(area: AreaDefinition, entity: LevelEntity, label: string): string[] {
  switch (entity.kind) {
    case 'enemy':
      return PLACED_ENEMY_KINDS.includes(entity.enemy)
        ? []
        : [`${label} has unknown enemy "${entity.enemy}"`];
    case 'item-block':
      return BLOCK_ITEMS.includes(entity.item) ? [] : [`${label} has unknown item "${entity.item}"`];
    case 'platform':
      return validatePlatform(area, entity, label);
    case 'firebar':
      return validateFirebar(entity, label);
    case 'tube':
      return entity.snapvine === true && entity.destination !== null
        ? [`${label} leads somewhere, so it cannot hold a Snapvine`]
        : [];
    default:
      return [];
  }
}

function validatePlatform(area: AreaDefinition, platform: PlatformEntity, label: string): string[] {
  const errors: string[] = [];
  const { min, max } = PLATFORM_WIDTHS;
  if (!Number.isInteger(platform.width) || platform.width < min || platform.width > max) {
    errors.push(`${label} must be ${min} to ${max} tiles wide`);
  }
  if (platform.travelX === 0 && platform.travelY === 0) errors.push(`${label} never moves`);
  if (!(platform.periodSeconds > 0)) errors.push(`${label} needs a positive period`);
  if (!(platform.phase >= 0 && platform.phase < 1)) {
    errors.push(`${label} needs a phase from 0 up to 1`);
  }
  const width = area.rows[0].length;
  const endColumn = platform.column + platform.travelX;
  const endRow = platform.row + platform.travelY;
  const endInside =
    endColumn >= 0 && endColumn + platform.width <= width && endRow >= 0 && endRow < LEVEL_ROWS;
  if (!endInside) errors.push(`${label} moves outside the level`);
  return errors;
}

function validateFirebar(firebar: FirebarEntity, label: string): string[] {
  const errors: string[] = [];
  const { min, max } = FIREBAR_SEGMENTS;
  if (!Number.isInteger(firebar.segments) || firebar.segments < min || firebar.segments > max) {
    errors.push(`${label} needs ${min} to ${max} segments`);
  }
  const speed = Math.abs(firebar.turnsPerSecond);
  if (!(speed > 0 && speed <= FIREBAR_MAX_TURNS_PER_SECOND)) {
    errors.push(`${label} must turn, at most ${FIREBAR_MAX_TURNS_PER_SECOND} turn per second`);
  }
  if (!Number.isFinite(firebar.startDegrees)) errors.push(`${label} needs a start angle`);
  return errors;
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

function startColumn(area: AreaDefinition): number {
  return area.rows.reduce(
    (found, row) => (found >= 0 ? found : row.indexOf(LegendSymbol.start)),
    -1,
  );
}

function validateCheckpointPlacement(
  area: AreaDefinition,
  checkpoint: LevelEntity | undefined,
  goal: LevelEntity | undefined,
): string[] {
  if (checkpoint === undefined || checkpoint.kind !== 'checkpoint') return [];
  const goalColumn = goal !== undefined && goal.kind === 'goal' ? goal.column : Infinity;
  if (checkpoint.column > startColumn(area) && checkpoint.column < goalColumn) return [];
  return [`Checkpoint at column ${checkpoint.column} must lie between the start and the goal`];
}

function validateBossArena(
  area: AreaDefinition,
  boss: BossEntity | undefined,
  goal: LevelEntity | undefined,
): string[] {
  if (boss === undefined) return [];
  const errors: string[] = [];
  const { rows } = area;
  const gate = boss.gateColumn;
  const arenaLeft = bossArenaLeftColumn(gate);
  if (arenaLeft < 0 || gate >= rows[0].length) {
    return [`Boss gate at column ${gate} leaves no room for a one-view arena`];
  }
  if (!rows.some((row) => row[gate] === LegendSymbol.gate)) {
    errors.push(`Boss gate column ${gate} has no gate "g" tiles`);
  }
  if (boss.column < arenaLeft || boss.column + BOSS_SIZE_TILES > gate) {
    errors.push(`Boss at column ${boss.column} must stand inside the arena (${arenaLeft}-${gate})`);
  }
  if (startColumn(area) >= arenaLeft) errors.push('The start must lie before the boss arena');
  if (goal !== undefined && goal.kind === 'goal' && goal.column <= gate) {
    errors.push(`Goal at column ${goal.column} must lie past the boss gate`);
  }
  return errors;
}

function entityCells(area: AreaDefinition, entity: LevelEntity): [number, number][] | null {
  const { rows } = area;
  const width = rows[0].length;
  const inBounds = (column: number, row: number): boolean =>
    column >= 0 && column < width && row >= 0 && row < rows.length;
  switch (entity.kind) {
    case 'postmark':
    case 'enemy':
    case 'item-block':
    case 'firebar':
      return inBounds(entity.column, entity.row) ? [[entity.column, entity.row]] : null;
    case 'platform': {
      const cells: [number, number][] = [];
      for (let offset = 0; offset < Math.max(1, entity.width); offset++) {
        if (!inBounds(entity.column + offset, entity.row)) return null;
        cells.push([entity.column + offset, entity.row]);
      }
      return cells;
    }
    case 'checkpoint': {
      if (!inBounds(entity.column, 0)) return null;
      const ground = groundRow(rows, entity.column);
      if (ground === null || ground - CHECKPOINT_HEIGHT_TILES < 0) return null;
      const cells: [number, number][] = [];
      for (let row = ground - CHECKPOINT_HEIGHT_TILES; row < ground; row++) {
        cells.push([entity.column, row]);
      }
      return cells;
    }
    case 'boss':
      return bossCells(rows, entity, inBounds);
    case 'tube':
      return tubeCells(rows, entity, inBounds);
    case 'goal': {
      if (!inBounds(entity.column, 0)) return null;
      const ground = groundRow(rows, entity.column);
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

function bossCells(
  rows: readonly string[],
  boss: BossEntity,
  inBounds: (column: number, row: number) => boolean,
): [number, number][] | null {
  const right = boss.column + BOSS_SIZE_TILES - 1;
  if (!inBounds(boss.column, 0) || !inBounds(right, 0)) return null;
  const ground = groundRow(rows, boss.column);
  if (ground === null || ground !== groundRow(rows, right)) return null;
  if (ground - BOSS_SIZE_TILES < 0) return null;
  const cells: [number, number][] = [];
  for (let row = ground - BOSS_SIZE_TILES; row < ground; row++) {
    for (let column = boss.column; column <= right; column++) cells.push([column, row]);
  }
  return cells;
}

function tubeCells(
  rows: readonly string[],
  tube: TubeEntity,
  inBounds: (column: number, row: number) => boolean,
): [number, number][] | null {
  if (!inBounds(tube.column, tube.topRow) || !inBounds(tube.column + 1, tube.topRow)) {
    return null;
  }
  const left = firstSolidRowBelow(rows, tube.column, tube.topRow);
  const right = firstSolidRowBelow(rows, tube.column + 1, tube.topRow);
  if (left === null || left !== right || left === tube.topRow) return null;
  const cells: [number, number][] = [];
  for (let row = tube.topRow; row < left; row++) {
    cells.push([tube.column, row], [tube.column + 1, row]);
  }
  return cells;
}

function validateTubeLinks(level: LevelDefinition): string[] {
  const areas = levelAreas(level);
  const errors: string[] = [];
  for (const [areaId, area] of areas) {
    area.entities.forEach((entity, index) => {
      if (entity.kind !== 'tube' || entity.destination === null) return;
      const { area: targetArea, tube: targetTube } = entity.destination;
      const where = areaId === MAIN_AREA ? '' : `Area "${areaId}": `;
      const target = areas.get(targetArea);
      if (target === undefined) {
        errors.push(`${where}tube #${index} leads to unknown area "${targetArea}"`);
        return;
      }
      const exit = target.entities.find(
        (candidate): candidate is TubeEntity =>
          candidate.kind === 'tube' && candidate.id === targetTube,
      );
      if (exit === undefined) {
        errors.push(`${where}tube #${index} leads to unknown tube "${targetTube}"`);
      } else if (exit.snapvine === true) {
        errors.push(`${where}tube #${index} leads to tube "${targetTube}", which holds a Snapvine`);
      }
    });
  }
  return errors;
}

function validateDoor(area: AreaDefinition, goal: LevelEntity | undefined): string[] {
  if (goal === undefined || goal.kind !== 'goal') return [];
  const doorColumn = findDoorColumn(area.rows);
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
