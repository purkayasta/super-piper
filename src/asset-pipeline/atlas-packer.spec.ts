import { describe, expect, it } from 'vitest';
import { packAtlas, type AtlasFrameInput } from './atlas-packer';
import { buildTileset } from './tileset-builder';
import { createRaster, fillRect, getPixel, setPixel } from './raster';

function solidFrame(name: string, width: number, height: number, shade: number): AtlasFrameInput {
  const raster = createRaster(width, height);
  fillRect(raster, 0, 0, width, height, [shade, shade, shade, 255]);
  return { name, raster };
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('packAtlas', () => {
  const frames = [
    solidFrame('small', 8, 8, 10),
    solidFrame('pip', 16, 16, 20),
    solidFrame('tall', 16, 32, 30),
    ...Array.from({ length: 20 }, (_, i) => solidFrame(`coin-${i}`, 16, 16, 40 + i)),
  ];

  it('places every frame without overlap, with padding, inside the atlas', () => {
    const { placements, raster } = packAtlas(frames, 'atlas.png', 64);
    expect(placements).toHaveLength(frames.length);
    for (const placement of placements) {
      expect(placement.x).toBeGreaterThanOrEqual(1);
      expect(placement.y).toBeGreaterThanOrEqual(1);
      expect(placement.x + placement.width).toBeLessThanOrEqual(raster.width - 1);
      expect(placement.y + placement.height).toBeLessThanOrEqual(raster.height - 1);
    }
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const padded = {
          ...placements[i],
          width: placements[i].width + 1,
          height: placements[i].height + 1,
        };
        expect(overlaps(padded, placements[j])).toBe(false);
      }
    }
  });

  it('copies each frame to its placement and uses a power-of-two height', () => {
    const { placements, raster } = packAtlas(frames, 'atlas.png', 64);
    const tall = placements.find((placement) => placement.name === 'tall')!;
    expect(getPixel(raster, tall.x, tall.y + 31)).toEqual([30, 30, 30, 255]);
    expect(Math.log2(raster.height) % 1).toBe(0);
  });

  it('writes a Phaser JSON hash keyed by frame name', () => {
    const { json, placements } = packAtlas(frames, 'atlas.png', 64);
    const pip = placements.find((placement) => placement.name === 'pip')!;
    expect(json.frames['pip']).toEqual({
      frame: { x: pip.x, y: pip.y, w: 16, h: 16 },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: 16, h: 16 },
      sourceSize: { w: 16, h: 16 },
    });
    expect(json.meta.image).toBe('atlas.png');
  });

  it('is deterministic regardless of input order', () => {
    const forward = packAtlas(frames, 'a.png', 64).json;
    const reversed = packAtlas([...frames].reverse(), 'a.png', 64).json;
    expect(reversed).toEqual(forward);
  });

  it('rejects duplicate names and frames wider than the atlas', () => {
    expect(() => packAtlas([solidFrame('a', 4, 4, 1), solidFrame('a', 4, 4, 1)], 'a.png')).toThrow(
      'Duplicate atlas frame "a"',
    );
    expect(() => packAtlas([solidFrame('wide', 64, 4, 1)], 'a.png', 64)).toThrow('wider');
  });
});

describe('buildTileset', () => {
  const layout = { tileSize: 2, columns: 2, margin: 1, spacing: 2 };

  function tile(color: number): ReturnType<typeof createRaster> {
    const raster = createRaster(2, 2);
    setPixel(raster, 0, 0, [color, 0, 0, 255]);
    setPixel(raster, 1, 0, [color, 1, 0, 255]);
    setPixel(raster, 0, 1, [color, 2, 0, 255]);
    setPixel(raster, 1, 1, [color, 3, 0, 255]);
    return raster;
  }

  it('lays tiles out on a pitch of size plus spacing', () => {
    const tileset = buildTileset([tile(10), tile(20), tile(30)], layout);
    expect(tileset.width).toBe(8);
    expect(tileset.height).toBe(8);
    expect(getPixel(tileset, 5, 1)).toEqual([20, 0, 0, 255]);
    expect(getPixel(tileset, 1, 5)).toEqual([30, 0, 0, 255]);
  });

  it('extrudes each edge pixel into the gutter', () => {
    const tileset = buildTileset([tile(10)], layout);
    expect(getPixel(tileset, 0, 0)).toEqual([10, 0, 0, 255]);
    expect(getPixel(tileset, 3, 1)).toEqual([10, 1, 0, 255]);
    expect(getPixel(tileset, 1, 3)).toEqual([10, 2, 0, 255]);
    expect(getPixel(tileset, 3, 3)).toEqual([10, 3, 0, 255]);
  });

  it('rejects tiles of the wrong size and an unbalanced gutter', () => {
    expect(() => buildTileset([createRaster(3, 2)], layout)).toThrow('Tile 0 is 3x2');
    expect(() => buildTileset([tile(1)], { ...layout, spacing: 1 })).toThrow('twice the margin');
  });
});
