import type { PixelGrid, PixelPalette } from '../../asset-pipeline/pixel-grid';
import { HazardFrame, LIFT_WIDTHS, liftFrameName } from './atlas-frames';

export interface PalettedGrid {
  readonly grid: PixelGrid;
  readonly palette: PixelPalette;
}

export const LIFT_PALETTE: PixelPalette = {
  K: '#1a1020',
  Y: '#ffd23a',
  H: '#6f80b0',
  F: '#41507a',
  S: '#262e4a',
  R: '#c3cce6',
};

const TILE = 16;
const RIVET_SPACING = 8;

export function liftGrid(widthTiles: number): PixelGrid {
  const width = widthTiles * TILE;
  const line = (edge: string, fill: (x: number) => string): string =>
    Array.from({ length: width }, (_, x) => (x === 0 || x === width - 1 ? edge : fill(x))).join('');
  return [
    '.' + 'K'.repeat(width - 2) + '.',
    line('K', () => 'Y'),
    line('K', () => 'H'),
    line('K', (x) => (x % RIVET_SPACING === 4 ? 'R' : 'F')),
    line('K', (x) => (x % TILE === 0 ? 'S' : 'F')),
    line('K', (x) => (x % RIVET_SPACING === 4 ? 'R' : 'F')),
    line('K', () => 'S'),
    '.' + 'K'.repeat(width - 2) + '.',
  ];
}

export const FIREBALL_PALETTE: PixelPalette = {
  W: '#fffbe0',
  Y: '#ffe04a',
  O: '#ff8a1c',
  R: '#c8301a',
};

const FIREBALL_0: PixelGrid = [
  '..RRRR..',
  '.ROOOOR.',
  'ROYYYYOR',
  'ROYWWYOR',
  'ROYWWYOR',
  'ROYYYYOR',
  '.ROOOOR.',
  '..RRRR..',
];

const FIREBALL_1: PixelGrid = [
  '...RR...',
  '.RROORR.',
  '.ROYYOR.',
  'ROYWWYOR',
  'ROYWWYOR',
  '.ROYYOR.',
  '.RROORR.',
  '...RR...',
];

export const STAGE_OBJECT_FRAME_GRIDS: Readonly<Record<string, PalettedGrid>> = {
  ...Object.fromEntries(
    LIFT_WIDTHS.map((width) => [liftFrameName(width), { grid: liftGrid(width), palette: LIFT_PALETTE }]),
  ),
  [HazardFrame.fireball0]: { grid: FIREBALL_0, palette: FIREBALL_PALETTE },
  [HazardFrame.fireball1]: { grid: FIREBALL_1, palette: FIREBALL_PALETTE },
};
