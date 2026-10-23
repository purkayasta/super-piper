import { describe, expect, it } from 'vitest';
import { autotileGround, compileLevel } from './level-compiler';
import type { LevelDefinition, LevelEntity, PostmarkEntity } from './level-format';
import { validateLevel } from './level-validator';
import { EMPTY_TILE, Tile } from './tile-ids';

const BLANK = '.'.repeat(30);
const GROUND = '#'.repeat(30);

function rowsWith(overrides: Record<number, string>): string[] {
  return Array.from({ length: 15 }, (_, row) => overrides[row] ?? (row >= 13 ? GROUND : BLANK));
}

const POSTMARKS: PostmarkEntity[] = [
  { kind: 'postmark', column: 3, row: 4 },
  { kind: 'postmark', column: 4, row: 4 },
  { kind: 'postmark', column: 5, row: 4 },
];

function level(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 'test',
    label: 'T-1',
    theme: 'overworld',
    music: 'music.overworld',
    timeLimit: 400,
    targetTime: 200,
    rows: rowsWith({ 12: '.S..o.......B?X...........wdw' + '.', 9: '.....o' + '.'.repeat(24) }),
    entities: [
      { kind: 'tube', column: 8, topRow: 10, destination: null },
      { kind: 'goal', column: 20 },
      ...POSTMARKS,
    ],
    ...overrides,
  };
}

describe('compileLevel', () => {
  const compiled = compileLevel(level());

  it('reports the size, start and coin cells', () => {
    expect([compiled.width, compiled.height]).toEqual([30, 15]);
    expect(compiled.start).toEqual({ column: 1, row: 12 });
    expect(compiled.coins).toEqual([
      { column: 5, row: 9 },
      { column: 4, row: 12 },
    ]);
  });

  it('puts grass on exposed ground and dirt beneath it', () => {
    expect(compiled.collision[13][0]).toBe(Tile.groundTop);
    expect(compiled.collision[14][0]).toBe(Tile.ground);
  });

  it('maps solid symbols to the collision layer and depot symbols to decoration', () => {
    expect(compiled.collision[12][12]).toBe(Tile.brick);
    expect(compiled.collision[12][13]).toBe(Tile.starBlock);
    expect(compiled.collision[12][14]).toBe(Tile.solidBlock);
    expect(compiled.collision[12][27]).toBe(EMPTY_TILE);
    expect(compiled.decoration[12][27]).toBe(Tile.depotDoor);
    expect(compiled.doorColumn).toBe(27);
  });

  it('stamps tubes from their top row down to the ground', () => {
    expect(compiled.collision[10].slice(8, 10)).toEqual([Tile.tubeTopLeft, Tile.tubeTopRight]);
    expect(compiled.collision[12].slice(8, 10)).toEqual([Tile.tubeBodyLeft, Tile.tubeBodyRight]);
    expect(compiled.tubes).toEqual([{ column: 8, topRow: 10, bottomRow: 12, destination: null }]);
  });

  it('places a solid base under the goal pole', () => {
    expect(compiled.goal).toEqual({ column: 20, baseRow: 12, poleTopRow: 3 });
    expect(compiled.collision[12][20]).toBe(Tile.solidBlock);
  });

  it('keeps Postmark cells', () => {
    expect(compiled.postmarks).toEqual(POSTMARKS.map(({ column, row }) => ({ column, row })));
  });

  it('refuses an invalid level', () => {
    expect(() => compileLevel(level({ entities: [] }))).toThrow('is invalid');
  });
});

describe('compileLevel with actors and block contents', () => {
  const rich = compileLevel(
    level({
      rows: rowsWith({
        12: '.S..o.......B?X...........wdw' + '.',
        9: '.....o' + '.'.repeat(24),
        8: '.'.repeat(16) + 'h' + '.'.repeat(13),
      }),
      entities: [
        { kind: 'tube', column: 8, topRow: 10, destination: null, snapvine: true },
        { kind: 'goal', column: 20 },
        ...POSTMARKS,
        { kind: 'enemy', enemy: 'thornbug', column: 18, row: 12 },
        { kind: 'enemy', enemy: 'flapjack', column: 10, row: 6 },
        { kind: 'enemy', enemy: 'shellback', column: 16, row: 12 },
        { kind: 'item-block', item: 'power', column: 13, row: 12 },
        { kind: 'item-block', item: 'multi-coin', column: 12, row: 12 },
        { kind: 'item-block', item: 'one-up', column: 16, row: 8 },
        { kind: 'checkpoint', column: 17 },
      ],
    }),
  );

  it('lists enemy spawns by column, with Snapvines from their tubes', () => {
    expect(rich.enemies).toEqual([
      { kind: 'snapvine', column: 8, row: 10 },
      { kind: 'flapjack', column: 10, row: 6 },
      { kind: 'shellback', column: 16, row: 12 },
      { kind: 'thornbug', column: 18, row: 12 },
    ]);
  });

  it('keeps block contents and hidden blocks out of the collision grid', () => {
    expect(rich.blockItems).toEqual([
      { column: 13, row: 12, item: 'power' },
      { column: 12, row: 12, item: 'multi-coin' },
      { column: 16, row: 8, item: 'one-up' },
    ]);
    expect(rich.hiddenBlocks).toEqual([{ column: 16, row: 8 }]);
    expect(rich.collision[8][16]).toBe(EMPTY_TILE);
  });

  it('stands the checkpoint on the ground', () => {
    expect(rich.checkpoint).toEqual({ column: 17, row: 12 });
    const plain = compileLevel(level());
    expect(plain.checkpoint).toBeNull();
    expect(plain.enemies).toEqual([]);
  });
});

describe('autotileGround', () => {
  it('marks only ground cells without ground above as grass tops', () => {
    const grid = [
      [EMPTY_TILE, Tile.brick],
      [Tile.ground, Tile.ground],
      [Tile.ground, Tile.ground],
    ];
    autotileGround(grid);
    expect(grid).toEqual([
      [EMPTY_TILE, Tile.brick],
      [Tile.groundTop, Tile.groundTop],
      [Tile.ground, Tile.ground],
    ]);
  });
});

describe('validateLevel', () => {
  it('accepts a well-formed level', () => {
    expect(validateLevel(level())).toEqual([]);
  });

  it('requires 15 equal rows at least one view wide', () => {
    expect(validateLevel(level({ rows: rowsWith({}).slice(1) }))).toEqual([
      'Level has 14 rows, expected 15',
    ]);
    expect(validateLevel(level({ rows: rowsWith({}).map((row) => row.slice(0, 20)) }))).toEqual([
      'Level is 20 columns wide, at least 27 needed',
    ]);
    expect(validateLevel(level({ rows: rowsWith({ 4: BLANK + '.' }) }))).toEqual([
      'Row 4 has length 31, expected 30',
    ]);
  });

  it('reports unknown symbols and a missing or doubled start', () => {
    const errors = validateLevel(level({ rows: rowsWith({ 3: 'z' + BLANK.slice(1) }) }));
    expect(errors).toContain('Unknown symbol "z" at row 3, column 0');
    expect(errors).toContain('Level needs exactly one start "S", found 0');
    expect(validateLevel(level({ rows: rowsWith({ 12: 'SS' + BLANK.slice(2) }) }))).toContain(
      'Level needs exactly one start "S", found 2',
    );
  });

  it('requires one goal and exactly three Postmarks', () => {
    const errors = validateLevel(level({ entities: [POSTMARKS[0]] }));
    expect(errors).toContain('Level needs exactly one goal, found 0');
    expect(errors).toContain('Level needs exactly 3 Postmarks, found 1');
  });

  it('rejects entities outside the level or over solid tiles', () => {
    const errors = validateLevel(
      level({
        entities: [
          { kind: 'goal', column: 20 },
          { kind: 'postmark', column: 40, row: 4 },
          { kind: 'postmark', column: 0, row: 13 },
          { kind: 'postmark', column: 5, row: 4 },
        ],
      }),
    );
    expect(errors).toContain('postmark #1 is outside the level or has no ground below it');
    expect(errors).toContain('postmark #2 overlaps "#" at row 13, column 0');
  });

  it('requires tubes to stand on ground and lead to known stages', () => {
    const floating = validateLevel(
      level({
        rows: rowsWith({
          13: GROUND.slice(0, 8) + '..' + GROUND.slice(10),
          14: GROUND.slice(0, 8) + '..' + GROUND.slice(10),
        }),
        entities: [
          { kind: 'tube', column: 8, topRow: 10, destination: null },
          { kind: 'goal', column: 20 },
          ...POSTMARKS,
        ],
      }),
    );
    expect(floating).toContain('tube #0 is outside the level or has no ground below it');
    const errors = validateLevel(
      level({
        entities: [
          { kind: 'tube', column: 8, topRow: 10, destination: 'nowhere' },
          { kind: 'goal', column: 20 },
          ...POSTMARKS,
        ],
      }),
      { knownStages: new Set(['1-1']) },
    );
    expect(errors).toEqual(['tube #0 leads to unknown stage "nowhere"']);
  });

  it('rejects overlapping entities and a depot door left of the goal', () => {
    const errors = validateLevel(
      level({
        entities: [
          { kind: 'goal', column: 28 },
          { kind: 'postmark', column: 28, row: 8 },
          POSTMARKS[0],
          POSTMARKS[1],
        ],
      }),
    );
    expect(errors).toContain('postmark #1 overlaps goal #0 at row 8, column 28');
    expect(errors).toContain('Depot door at column 27 must be to the right of the goal');
  });

  it('checks enemy kinds and placement', () => {
    const errors = validateLevel(
      level({
        entities: [
          { kind: 'goal', column: 20 },
          ...POSTMARKS,
          { kind: 'enemy', enemy: 'ghost' as never, column: 3, row: 12 },
          { kind: 'enemy', enemy: 'thornbug', column: 3, row: 13 },
          { kind: 'enemy', enemy: 'thornbug', column: 40, row: 12 },
        ],
      }),
    );
    expect(errors).toEqual([
      'enemy #4 has unknown enemy "ghost"',
      'enemy #5 overlaps "#" at row 13, column 3',
      'enemy #6 is outside the level or has no ground below it',
    ]);
  });

  it('puts item blocks only on blocks, and multi-coin only on bricks', () => {
    const errors = validateLevel(
      level({
        entities: [
          { kind: 'goal', column: 20 },
          ...POSTMARKS,
          { kind: 'item-block', item: 'power', column: 2, row: 12 },
          { kind: 'item-block', item: 'multi-coin', column: 13, row: 12 },
          { kind: 'item-block', item: 'cake' as never, column: 12, row: 12 },
          { kind: 'item-block', item: 'star', column: 12, row: 12 },
        ],
      }),
    );
    expect(errors).toEqual([
      'item-block #4 must sit on a block ("?", "B" or "h"), found "."',
      'item-block #5 puts multi-coin on "?", but only bricks "B" can hold it',
      'item-block #6 has unknown item "cake"',
      'item-block #7 overlaps item-block #6 at row 12, column 12',
    ]);
  });

  it('allows one checkpoint, on the ground between the start and the goal', () => {
    const entities = (...extra: LevelEntity[]): LevelEntity[] => [
      { kind: 'goal', column: 20 },
      ...POSTMARKS,
      ...extra,
    ];
    expect(
      validateLevel(level({ entities: entities({ kind: 'checkpoint', column: 16 }) })),
    ).toEqual([]);
    expect(
      validateLevel(
        level({
          entities: entities(
            { kind: 'checkpoint', column: 16 },
            { kind: 'checkpoint', column: 17 },
          ),
        }),
      ),
    ).toEqual(['Level allows at most 1 checkpoint, found 2']);
    expect(validateLevel(level({ entities: entities({ kind: 'checkpoint', column: 0 }) }))).toEqual(
      ['Checkpoint at column 0 must lie between the start and the goal'],
    );
  });

  it('checks the time limit and target time', () => {
    expect(validateLevel(level({ timeLimit: 0, targetTime: 10 }))).toEqual([
      'Time limit must be positive',
      'Target time must be positive and within the time limit',
    ]);
  });
});
