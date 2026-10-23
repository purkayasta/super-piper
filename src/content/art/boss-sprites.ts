import { rotateGridClockwise, type PixelGrid, type PixelPalette } from '../../asset-pipeline/pixel-grid';
import { BOSS_FRAME_SIZE, BossFrame } from './atlas-frames';
import type { PalettedGrid } from './stage-object-sprites';

export const BOSS_PALETTE: PixelPalette = {
  K: '#1a1020',
  F: '#2e2650',
  f: '#5a4c92',
  O: '#f08a24',
  o: '#b25414',
  W: '#ffffff',
  Y: '#ffd23a',
  y: '#c88a14',
  G: '#8e8a9c',
  g: '#c4c0d0',
  D: '#5a5668',
  R: '#d8403a',
  r: '#8a2028',
  L: '#d08a34',
};

const OUTLINE = 'K';
const EMPTY = '.';

const HEAD: PixelGrid = [
  '....FFFFFF...',
  '...FFFFFFFFf.',
  '..FFWWFFFFFFf',
  '..FFWKFFFFFFf',
  'OOOOOFFFFFffF',
  'ooooooFFFFFFF',
  '.ooooFFFFFFF.',
  '...FFFFFFFFF.',
  '....FFFFFFF..',
  '.....FFFFF...',
];

const HEAD_HURT: PixelGrid = [
  '....FFFFFF...',
  'OO.FFFFFFFFf.',
  'OOOFKFKFFFFFf',
  '.OOFFKFFFFFFf',
  '..oFKFKFFFffF',
  '.ooooFFFFFFFF',
  '.....FFFFFFF.',
  '...FFFFFFFFF.',
  '....FFFFFFF..',
  '.....FFFFF...',
];

const CROWN: PixelGrid = ['Y..Y..Y', 'YYYYYYY', 'yYyYyYy'];

const TAIL: PixelGrid = [
  'ff....',
  'FFf...',
  'FFFFf.',
  'FFFFFF',
  '.FFFFF',
  '..FFFF',
  '...FF.',
];

const WING_DOWN: PixelGrid = [
  '.FF..',
  'FFFf.',
  'FFFFf',
  'FFFFf',
  'FFFFF',
  '.FFFF',
  '.FFF.',
  '..FF.',
  '..F..',
];

const WING_RAISED_STONE: PixelGrid = [
  '.GGG..',
  'GggGD.',
  'GGGDD.',
  '.DDD..',
  '..FF..',
  '.FFF..',
  '.FFFf.',
  'FFFFf.',
  'FFFFF.',
  '.FFFF.',
  '..FFF.',
];

const WING_RAISED: PixelGrid = [
  '..ff..',
  '.FFf..',
  '.FFFf.',
  'FFFFf.',
  'FFFFF.',
  '.FFFF.',
  '..FFF.',
];

const WING_FORWARD: PixelGrid = [
  '..FFFFFFFF',
  'FFFFFFFFFf',
  'fFFFFFFFF.',
  '..fF......',
];

const LEGS_STAND: PixelGrid = [
  '...LL....LL..',
  '...LL....LL..',
  '...LL....LL..',
  '..LLLL..LLLL.',
  '.LL.LL.LL.LL.',
];

const LEGS_STEP_FRONT: PixelGrid = [
  '...LL....LL..',
  '..LL.....LL..',
  '.LL......LL..',
  'LLLL....LLLL.',
  'L.LL...LL.LL.',
];

const LEGS_STEP_BACK: PixelGrid = [
  '...LL....LL..',
  '...LL.....LL.',
  '...LL......LL',
  '..LLLL....LLL',
  '.LL.LL...LL.L',
];

const LEGS_CROUCH: PixelGrid = ['.LLL....LLL..', 'LL.LL..LL.LL.'];

const LEGS_TUCKED: PixelGrid = ['...LL...LL...', '..LL...LL....', '.LL...LL.....'];

const MANTLE_WIDTH = 13;
const MANTLE_HEIGHT = 14;
const MERLON_HEIGHT = 3;
const MERLON_PERIOD = 5;
const MERLON_WIDTH = 3;

type Canvas = string[][];

function blankCanvas(): Canvas {
  return Array.from({ length: BOSS_FRAME_SIZE }, () => Array<string>(BOSS_FRAME_SIZE).fill(EMPTY));
}

function stamp(canvas: Canvas, grid: PixelGrid, x: number, y: number): void {
  grid.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const symbol = row[dx];
      const cy = y + dy;
      const cx = x + dx;
      if (symbol === EMPTY || cy < 0 || cx < 0 || cy >= BOSS_FRAME_SIZE || cx >= BOSS_FRAME_SIZE) {
        continue;
      }
      canvas[cy][cx] = symbol;
    }
  });
}

function mantleGrid(): PixelGrid {
  const rows: string[] = [];
  for (let y = 0; y < MANTLE_HEIGHT; y++) {
    let line = '';
    for (let x = 0; x < MANTLE_WIDTH; x++) {
      const merlonGap = y < MERLON_HEIGHT && x % MERLON_PERIOD >= MERLON_WIDTH;
      if (merlonGap) {
        line += EMPTY;
        continue;
      }
      const sashRow = MERLON_HEIGHT + 1 + Math.floor((x * 7) / MANTLE_WIDTH);
      if (y === sashRow || y === sashRow + 1) line += 'R';
      else if (y === sashRow + 2) line += 'r';
      else if (x >= MANTLE_WIDTH - 2) line += 'D';
      else if (x === 0 || (y < MERLON_HEIGHT && x % MERLON_PERIOD === 0)) line += 'g';
      else if (y === 7 || y === 11) line += 'D';
      else if ((y < 7 ? x % 6 === 3 : x % 6 === 0) && y > MERLON_HEIGHT) line += 'D';
      else line += 'G';
    }
    rows.push(line);
  }
  return rows;
}

const MANTLE = mantleGrid();

function outline(canvas: Canvas): PixelGrid {
  const size = BOSS_FRAME_SIZE;
  const filled = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < size && y < size && canvas[y][x] !== EMPTY && canvas[y][x] !== OUTLINE;
  const result = canvas.map((row) => [...row]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (canvas[y][x] !== EMPTY) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        result[y][x] = OUTLINE;
      }
    }
  }
  return result.map((row) => row.join(''));
}

interface Pose {
  readonly legs: PixelGrid;
  readonly bodyY: number;
  readonly bodyX?: number;
  readonly head?: PixelGrid;
  readonly frontWing?: 'down' | 'forward' | 'raised' | null;
  readonly backWing?: 'stone' | 'raised' | null;
}

function poseGrid(pose: Pose): PixelGrid {
  const canvas = blankCanvas();
  const x = 11 + (pose.bodyX ?? 0);
  const y = pose.bodyY;
  stamp(canvas, TAIL, x + MANTLE_WIDTH - 2, y + 5);
  if (pose.backWing === 'stone') stamp(canvas, WING_RAISED_STONE, x + MANTLE_WIDTH - 1, y - 9);
  if (pose.backWing === 'raised') stamp(canvas, WING_RAISED, x + MANTLE_WIDTH - 1, y - 5);
  stamp(canvas, pose.legs, x, y + MANTLE_HEIGHT);
  stamp(canvas, MANTLE, x, y);
  stamp(canvas, pose.head ?? HEAD, x - 4, y - 7);
  stamp(canvas, CROWN, x, y - 10);
  if (pose.frontWing === 'down' || pose.frontWing === undefined) {
    stamp(canvas, WING_DOWN, x - 2, y + 4);
  } else if (pose.frontWing === 'forward') {
    stamp(canvas, WING_FORWARD, x - 9, y + 5);
  } else if (pose.frontWing === 'raised') {
    stamp(canvas, WING_RAISED, x - 5, y - 1);
  }
  return outline(canvas);
}

const STAND_Y = BOSS_FRAME_SIZE - 1 - LEGS_STAND.length - MANTLE_HEIGHT + 1;
const CROUCH_Y = BOSS_FRAME_SIZE - 1 - LEGS_CROUCH.length - MANTLE_HEIGHT + 1;

const STONE: PixelGrid = [
  '..KKKK..',
  '.KggGGK.',
  'KgGGGGDK',
  'KGGGDGDK',
  'KGGDGGDK',
  'KGGGGDDK',
  '.KDDDDK.',
  '..KKKK..',
];

export const BOSS_FRAME_GRIDS: Readonly<Record<string, PalettedGrid>> = Object.fromEntries(
  (
    [
      [BossFrame.idle, poseGrid({ legs: LEGS_STAND, bodyY: STAND_Y })],
      [BossFrame.walk0, poseGrid({ legs: LEGS_STEP_FRONT, bodyY: STAND_Y })],
      [BossFrame.walk1, poseGrid({ legs: LEGS_STEP_BACK, bodyY: STAND_Y })],
      [BossFrame.crouch, poseGrid({ legs: LEGS_CROUCH, bodyY: CROUCH_Y })],
      [
        BossFrame.jump,
        poseGrid({ legs: LEGS_TUCKED, bodyY: STAND_Y - 1, frontWing: 'raised', backWing: 'raised' }),
      ],
      [BossFrame.windup, poseGrid({ legs: LEGS_STAND, bodyY: STAND_Y, backWing: 'stone' })],
      [BossFrame.throw, poseGrid({ legs: LEGS_STEP_FRONT, bodyY: STAND_Y, frontWing: 'forward' })],
      [
        BossFrame.hurt,
        poseGrid({
          legs: LEGS_STEP_BACK,
          bodyY: STAND_Y,
          bodyX: 1,
          head: HEAD_HURT,
          frontWing: 'raised',
          backWing: 'raised',
        }),
      ],
      [BossFrame.stone0, STONE],
      [BossFrame.stone1, rotateGridClockwise(STONE)],
    ] as const
  ).map(([name, grid]) => [name, { grid, palette: BOSS_PALETTE }]),
);
