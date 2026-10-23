import { describe, expect, it } from 'vitest';
import { compileArea, compileLevel } from './level-compiler';
import type {
  AreaDefinition,
  LevelDefinition,
  LevelEntity,
  PostmarkEntity,
  TubeEntity,
} from './level-format';
import { validateLevel } from './level-validator';
import { EMPTY_TILE, Tile } from './tile-ids';

const WIDTH = 70;
const BLANK = '.'.repeat(WIDTH);
const GROUND = '#'.repeat(WIDTH);

function rowsWith(overrides: Record<number, string>, width = WIDTH): string[] {
  return Array.from(
    { length: 15 },
    (_, row) => overrides[row] ?? (row >= 13 ? '#'.repeat(width) : '.'.repeat(width)),
  );
}

function place(row: string, column: number, text: string): string {
  return row.slice(0, column) + text + row.slice(column + text.length);
}

const POSTMARKS: PostmarkEntity[] = [
  { kind: 'postmark', column: 3, row: 4 },
  { kind: 'postmark', column: 4, row: 4 },
  { kind: 'postmark', column: 5, row: 4 },
];

const START_ROW = place(BLANK, 1, 'S');

function level(extra: LevelEntity[] = [], overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 'test',
    label: 'T-1',
    theme: 'overworld',
    music: 'music.overworld',
    timeLimit: 400,
    targetTime: 200,
    rows: rowsWith({ 12: START_ROW }),
    entities: [{ kind: 'goal', column: 66 }, ...POSTMARKS, ...extra],
    ...overrides,
  };
}

describe('moving platforms in levels', () => {
  const platform: LevelEntity = {
    kind: 'platform',
    column: 10,
    row: 8,
    width: 3,
    travelX: 4,
    travelY: 0,
    periodSeconds: 4,
    phase: 0.25,
  };

  it('compiles platforms to pixel paths', () => {
    expect(compileLevel(level([platform])).platforms).toEqual([
      { x: 160, y: 128, width: 48, travelX: 64, travelY: 0, periodSeconds: 4, phase: 0.25 },
    ]);
  });

  it('checks size, movement, timing and that the path stays inside', () => {
    const errors = validateLevel(
      level([
        { ...platform, width: 1 },
        { ...platform, column: 20, travelX: 0, travelY: 0 },
        { ...platform, column: 30, periodSeconds: 0, phase: 1 },
        { ...platform, column: 60, travelX: 9 },
        { ...platform, column: 40, row: 13 },
      ]),
    );
    expect(errors).toEqual([
      'platform #4 must be 2 to 4 tiles wide',
      'platform #5 never moves',
      'platform #6 needs a positive period',
      'platform #6 needs a phase from 0 up to 1',
      'platform #7 moves outside the level',
      'platform #8 overlaps "#" at row 13, column 40',
      'platform #8 overlaps "#" at row 13, column 41',
      'platform #8 overlaps "#" at row 13, column 42',
    ]);
  });
});

describe('firebars in levels', () => {
  const rows = rowsWith({ 12: START_ROW, 8: place(BLANK, 20, 'X') });
  const firebar: LevelEntity = {
    kind: 'firebar',
    column: 20,
    row: 8,
    segments: 5,
    turnsPerSecond: -0.4,
    startDegrees: 90,
  };

  it('turns around a used block at the anchor centre', () => {
    const compiled = compileLevel(level([firebar], { rows }));
    expect(compiled.firebars).toEqual([
      {
        centerX: 328,
        centerY: 136,
        segments: 5,
        turnsPerSecond: -0.4,
        startRadians: Math.PI / 2,
      },
    ]);
    expect(compiled.collision[8][20]).toBe(Tile.usedBlock);
  });

  it('needs a solid anchor, a sensible length and a turning speed', () => {
    const errors = validateLevel(
      level(
        [
          { ...firebar, column: 21 },
          { ...firebar, segments: 9, turnsPerSecond: 0 },
          { ...firebar, column: 20, row: 13, turnsPerSecond: 1.5 },
        ],
        { rows },
      ),
    );
    expect(errors).toEqual([
      'firebar #4 must turn around a solid block, found "."',
      'firebar #5 needs 2 to 8 segments',
      'firebar #5 must turn, at most 1 turn per second',
      'firebar #6 must turn, at most 1 turn per second',
    ]);
  });
});

describe('lava', () => {
  it('goes on the hazard layer and is never solid', () => {
    const rows = rowsWith({
      12: START_ROW,
      13: place(GROUND, 10, '~~~'),
      14: place(GROUND, 10, '==='),
    });
    const compiled = compileLevel(level([], { rows }));
    expect(compiled.hazard[13].slice(10, 13)).toEqual([
      Tile.lavaSurface,
      Tile.lavaSurface,
      Tile.lavaSurface,
    ]);
    expect(compiled.hazard[14][11]).toBe(Tile.lava);
    expect(compiled.collision[13][11]).toBe(EMPTY_TILE);
    expect(compiled.hazard[13][9]).toBe(EMPTY_TILE);
  });
});

describe('the boss arena', () => {
  const gateRows = (rows: string[]): string[] =>
    rows.map((row, index) => (index >= 9 && index <= 12 ? place(row, 60, 'g') : row));
  const rows = gateRows(rowsWith({ 12: START_ROW }));
  const boss: LevelEntity = { kind: 'boss', column: 50, gateColumn: 60 };

  it('compiles the arena, the gate rows and where the boss stands', () => {
    expect(compileLevel(level([boss], { rows })).boss).toEqual({
      centerX: 816,
      groundY: 208,
      gateColumn: 60,
      gateRows: [9, 10, 11, 12],
      arenaLeftPx: 544,
      arenaRightPx: 976,
    });
    expect(compileLevel(level([boss], { rows })).collision[10][60]).toBe(Tile.gate);
  });

  it('needs a gate, a boss inside the arena and the goal past the gate', () => {
    const errors = validateLevel(
      level([{ kind: 'boss', column: 20, gateColumn: 40 }], {
        rows: rowsWith({ 12: place(BLANK, 20, 'S') }),
        entities: [{ kind: 'goal', column: 30 }, ...POSTMARKS, { kind: 'boss', column: 10, gateColumn: 40 }],
      }),
    );
    expect(errors).toEqual([
      'Boss gate column 40 has no gate "g" tiles',
      'Boss at column 10 must stand inside the arena (14-40)',
      'The start must lie before the boss arena',
      'Goal at column 30 must lie past the boss gate',
    ]);
  });

  it('allows one boss only and needs a full view for the arena', () => {
    expect(validateLevel(level([boss, { kind: 'boss', column: 52, gateColumn: 60 }], { rows }))).toContain(
      'Level allows at most 1 boss, found 2',
    );
    expect(
      validateLevel(level([{ kind: 'boss', column: 2, gateColumn: 10 }], { rows })),
    ).toContain('Boss gate at column 10 leaves no room for a one-view arena');
  });
});

describe('areas and tube links', () => {
  const bonusRows = rowsWith({ 12: place('.'.repeat(30), 1, 'S') }, 30);
  const bonus = (entities: LevelEntity[]): AreaDefinition => ({
    theme: 'overworld',
    music: 'music.underground',
    rows: bonusRows,
    entities,
  });
  const entryTube: TubeEntity = { kind: 'tube', column: 4, topRow: 11, id: 'entry', destination: null };
  const exitTube: TubeEntity = {
    kind: 'tube',
    column: 24,
    topRow: 11,
    destination: { area: 'main', tube: 'return' },
  };
  const linked = (areaEntities: LevelEntity[], mainTubes: TubeEntity[]): LevelDefinition =>
    level(mainTubes, { areas: { bonus: bonus(areaEntities) } });
  const intoBonus: TubeEntity = {
    kind: 'tube',
    column: 10,
    topRow: 11,
    destination: { area: 'bonus', tube: 'entry' },
  };
  const returnTube: TubeEntity = { kind: 'tube', column: 40, topRow: 11, id: 'return', destination: null };

  it('accepts a bonus room linked both ways and compiles each area', () => {
    const stage = linked([entryTube, exitTube], [intoBonus, returnTube]);
    expect(validateLevel(stage)).toEqual([]);
    const room = compileArea(stage, 'bonus');
    expect(room.goal).toBeNull();
    expect(room.tubes.map((tube) => [tube.id, tube.destination])).toEqual([
      ['entry', null],
      [null, { area: 'main', tube: 'return' }],
    ]);
    expect(compileArea(stage, 'main').tubes[0].destination).toEqual({ area: 'bonus', tube: 'entry' });
    expect(() => compileArea(stage, 'attic')).toThrow('has no area "attic"');
  });

  it('reports links to unknown areas, unknown tubes and Snapvine tubes', () => {
    const errors = validateLevel(
      linked(
        [entryTube, { ...exitTube, destination: { area: 'main', tube: 'nowhere' } }],
        [
          { ...intoBonus, destination: { area: 'attic', tube: 'entry' } },
          { ...returnTube, snapvine: true },
          { ...intoBonus, column: 50, destination: { area: 'main', tube: 'return' } },
          { ...intoBonus, column: 30, snapvine: true },
        ],
      ),
    );
    expect(errors).toEqual([
      'tube #7 leads somewhere, so it cannot hold a Snapvine',
      'tube #4 leads to unknown area "attic"',
      'tube #6 leads to tube "return", which holds a Snapvine',
      'Area "bonus": tube #1 leads to unknown tube "nowhere"',
    ]);
  });

  it('keeps bonus rooms free of stage furniture and gives them a way out', () => {
    const errors = validateLevel(
      linked([entryTube, { kind: 'goal', column: 20 }, POSTMARKS[0]], [intoBonus, returnTube]),
    );
    expect(errors).toEqual([
      'Area "bonus": A bonus area cannot have a goal',
      'Area "bonus": A bonus area cannot have a postmark',
      'Area "bonus": A bonus area needs a tube that leads out',
    ]);
  });

  it('reserves the main area name and keeps tube ids unique', () => {
    const errors = validateLevel(
      level([returnTube, { ...returnTube, column: 50 }], { areas: { main: bonus([exitTube]) } }),
    );
    expect(errors).toContain('Area "main" is reserved for the stage itself');
    expect(errors).toContain('Tube id "return" is used twice');
  });
});
