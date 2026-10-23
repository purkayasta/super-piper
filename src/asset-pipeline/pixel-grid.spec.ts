import { describe, expect, it } from 'vitest';
import {
  mirrorGrid,
  overlayGrid,
  padGridTop,
  rasterizeGrid,
  rotateGridClockwise,
  swapPalette,
  unknownSymbols,
  type PixelGrid,
} from './pixel-grid';
import { getPixel } from './raster';

const palette = { A: '#ff0000', B: '#0000ff' };

describe('rasterizeGrid', () => {
  it('maps symbols to colours and dots to transparency', () => {
    const raster = rasterizeGrid(['A.', '.B'], palette);
    expect(raster.width).toBe(2);
    expect(getPixel(raster, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(getPixel(raster, 1, 0)).toEqual([0, 0, 0, 0]);
    expect(getPixel(raster, 1, 1)).toEqual([0, 0, 255, 255]);
  });

  it('throws on unknown symbols and ragged rows', () => {
    expect(() => rasterizeGrid(['AZ'], palette)).toThrow(
      'Unknown palette symbol "Z" at row 0, col 1',
    );
    expect(() => rasterizeGrid(['AA', 'A'], palette)).toThrow('Grid row 1 has length 1');
  });
});

describe('swapPalette', () => {
  it('replaces only the overridden symbols', () => {
    expect(swapPalette(palette, { B: '#00ff00' })).toEqual({ A: '#ff0000', B: '#00ff00' });
  });

  it('rejects overrides for symbols the base does not have', () => {
    expect(() => swapPalette(palette, { Q: '#00ff00' })).toThrow('unknown symbol "Q"');
  });
});

describe('mirrorGrid', () => {
  it('reverses every row', () => {
    expect(mirrorGrid(['AB.', '.BA'])).toEqual(['.BA', 'AB.']);
  });
});

describe('unknownSymbols', () => {
  it('lists symbols missing from the palette', () => {
    expect(unknownSymbols(['AXY', '.X.'], palette)).toEqual(['X', 'Y']);
  });
});

describe('padGridTop', () => {
  it('adds transparent rows above the art', () => {
    expect(padGridTop(['AB'], 3)).toEqual(['..', '..', 'AB']);
  });

  it('rejects grids taller than the target', () => {
    expect(() => padGridTop(['A', 'B'], 1)).toThrow('taller than 1');
  });
});

describe('overlayGrid', () => {
  it('draws the overlay over the base, keeping the base under transparent cells', () => {
    expect(overlayGrid(['AA', 'AA'], ['B.', '.B'])).toEqual(['BA', 'AB']);
  });

  it('rejects mismatched sizes', () => {
    expect(() => overlayGrid(['AA'], ['A'])).toThrow('match the base grid size');
  });
});

describe('rotateGridClockwise', () => {
  it('turns rows into columns', () => {
    expect(rotateGridClockwise(['AB', '..'])).toEqual(['.A', '.B']);
  });

  it('returns the original after four turns', () => {
    const grid = ['AB.', '..B'];
    let turned: PixelGrid = grid;
    for (let i = 0; i < 4; i++) turned = rotateGridClockwise(turned);
    expect(turned).toEqual(grid);
  });
});
