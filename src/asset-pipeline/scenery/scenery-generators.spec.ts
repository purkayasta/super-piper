import { describe, expect, it } from 'vitest';
import { OVERWORLD_SCENERY, type SceneryLayerSpec } from '../../content/art/scenery-layers';
import type { Raster } from '../raster';
import { generateSceneryLayer } from './scenery-generators';

const SCALE = 1;

function columnDifference(raster: Raster, a: number, b: number): number {
  let total = 0;
  for (let y = 0; y < raster.height; y++) {
    for (let channel = 0; channel < 4; channel++) {
      const offsetA = (y * raster.width + a) * 4 + channel;
      const offsetB = (y * raster.width + b) * 4 + channel;
      total += Math.abs(raster.data[offsetA] - raster.data[offsetB]);
    }
  }
  return total / (raster.height * 4);
}

function alphaAt(raster: Raster, x: number, y: number): number {
  return raster.data[(y * raster.width + x) * 4 + 3];
}

const layers = OVERWORLD_SCENERY.map((spec) => [spec.id, spec] as const);
const rendered = new Map<string, Raster>(
  OVERWORLD_SCENERY.map((spec) => [spec.id, generateSceneryLayer(spec, SCALE)]),
);

describe('scenery generators', () => {
  it.each(layers)('%s is the spec size times the scale', (id, spec: SceneryLayerSpec) => {
    const raster = rendered.get(id)!;
    expect([raster.width, raster.height]).toEqual([spec.stripWidth * SCALE, spec.height * SCALE]);
  });

  it.each(layers.filter(([id]) => id !== 'sky'))(
    '%s wraps seamlessly from its right edge to its left edge',
    (id) => {
      const raster = rendered.get(id)!;
      const seam = columnDifference(raster, raster.width - 1, 0);
      const neighbour = columnDifference(raster, 1, 0);
      expect(seam).toBeLessThan(Math.max(6, neighbour * 3));
    },
  );

  it('paints an opaque sky', () => {
    const sky = rendered.get('sky')!;
    for (let i = 3; i < sky.data.length; i += 4) expect(sky.data[i]).toBe(255);
  });

  it('leaves the top of the foreground layers open so the sky shows through', () => {
    for (const id of ['clouds', 'mountains', 'hills', 'bushes']) {
      const raster = rendered.get(id)!;
      expect(alphaAt(raster, 10, 0), id).toBe(0);
    }
  });

  it('fills the bottom of hills and bushes so pits never show a hard edge', () => {
    for (const id of ['hills', 'bushes']) {
      const raster = rendered.get(id)!;
      expect(alphaAt(raster, 10, raster.height - 1), id).toBe(255);
    }
  });

  it('is deterministic', () => {
    const spec = OVERWORLD_SCENERY[1];
    expect(generateSceneryLayer(spec, SCALE).data).toEqual(rendered.get(spec.id)!.data);
  });
});
