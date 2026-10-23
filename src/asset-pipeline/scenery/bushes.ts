import type { SceneryLayerSpec } from '../../content/art/scenery-layers';
import { clamp01, createRandom, fbm2D, lerp, type Random } from '../noise';
import { blendPixel, createRaster, mixColor, parseHex, type Raster } from '../raster';

const HIGHLIGHT = parseHex('#9fd18c');
const BASE = parseHex('#6aa862');
const SHADE = parseHex('#467f4a');
const UNDERGROWTH = parseHex('#3f7444');
const HAZE = parseHex('#cfe4f3');
const HAZE_AMOUNT = 0.08;
const BASELINE = 40;
const CLUSTER_GAP_MIN = 34;
const CLUSTER_GAP_MAX = 80;
const NOISE_PERIOD = 60;

interface Puff {
  x: number;
  y: number;
  radius: number;
}

export function generateBushes(spec: SceneryLayerSpec, scale: number): Raster {
  const raster = createRaster(spec.stripWidth * scale, spec.height * scale);
  const puffs = placePuffs(spec, createRandom(spec.seed));
  paintUndergrowth(raster, spec, scale);
  for (const puff of puffs) paintPuff(raster, spec, scale, puff);
  return raster;
}

function placePuffs(spec: SceneryLayerSpec, random: Random): Puff[] {
  const puffs: Puff[] = [];
  let x = lerp(8, 30, random());
  while (x < spec.stripWidth - CLUSTER_GAP_MIN / 2) {
    const count = 2 + Math.floor(random() * 3);
    const clusterWidth = lerp(18, 40, random());
    for (let i = 0; i < count; i++) {
      const along = count === 1 ? 0.5 : i / (count - 1);
      const radius = lerp(6, 12, 1 - Math.abs(along - 0.5)) * lerp(0.85, 1.15, random());
      puffs.push({ x: x + along * clusterWidth, y: BASELINE - radius * 0.45, radius });
    }
    x += clusterWidth + lerp(CLUSTER_GAP_MIN, CLUSTER_GAP_MAX, random());
  }
  return puffs;
}

function paintUndergrowth(raster: Raster, spec: SceneryLayerSpec, scale: number): void {
  const firstRow = Math.floor(BASELINE * scale);
  for (let y = firstRow; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      const noise = fbm2D(
        x / raster.width,
        y / scale / spec.stripWidth,
        NOISE_PERIOD,
        3,
        spec.seed,
      );
      blendPixel(raster, x, y, mixColor(UNDERGROWTH, SHADE, noise), 1);
    }
  }
}

function paintPuff(raster: Raster, spec: SceneryLayerSpec, scale: number, puff: Puff): void {
  const left = Math.floor((puff.x - puff.radius - 1) * scale);
  const right = Math.ceil((puff.x + puff.radius + 1) * scale);
  const top = Math.max(0, Math.floor((puff.y - puff.radius - 1) * scale));
  const bottom = Math.min(raster.height - 1, Math.ceil((puff.y + puff.radius + 1) * scale));
  for (let px = left; px <= right; px++) {
    const column = ((px % raster.width) + raster.width) % raster.width;
    for (let y = top; y <= bottom; y++) {
      const dx = px / scale - puff.x;
      const dy = y / scale - puff.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const coverage = clamp01((puff.radius - distance) * scale + 0.5);
      if (coverage <= 0) continue;
      const light = clamp01(0.55 + 0.45 * ((dx / puff.radius) * 0.45 - (dy / puff.radius) * 0.9));
      const noise = fbm2D(
        column / raster.width,
        y / scale / spec.stripWidth,
        NOISE_PERIOD,
        3,
        spec.seed + 3,
      );
      const shaded = clamp01(light + (noise - 0.5) * 0.4);
      const color =
        shaded > 0.5
          ? mixColor(BASE, HIGHLIGHT, (shaded - 0.5) * 2)
          : mixColor(SHADE, BASE, shaded * 2);
      blendPixel(raster, column, y, mixColor(color, HAZE, HAZE_AMOUNT), coverage);
    }
  }
}
