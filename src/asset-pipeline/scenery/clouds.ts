import type { SceneryLayerSpec } from '../../content/art/scenery-layers';
import { clamp01, createRandom, fbm2D, lerp, smoothstep, type Random } from '../noise';
import { blendPixel, createRaster, mixColor, parseHex, type Raster } from '../raster';

const LIT = parseHex('#ffffff');
const BODY = parseHex('#eef3fa');
const SHADOW = parseHex('#b9cbe2');
const CLOUD_COUNT = 6;
const MAX_ALPHA = 0.94;
const EDGE_LOW = 0.04;
const EDGE_HIGH = 0.3;
const NOISE_AMOUNT = 0.42;
const NOISE_PERIOD = 18;
const NOISE_FADE_IN = 0.2;

interface Puff {
  x: number;
  y: number;
  radius: number;
}

interface Cloud {
  baseY: number;
  topY: number;
  puffs: Puff[];
  left: number;
  right: number;
}

export function generateClouds(spec: SceneryLayerSpec, scale: number): Raster {
  const width = spec.stripWidth * scale;
  const height = spec.height * scale;
  const raster = createRaster(width, height);
  const clouds = placeClouds(spec, createRandom(spec.seed));
  for (const cloud of clouds) paintCloud(raster, cloud, spec, scale);
  return raster;
}

function placeClouds(spec: SceneryLayerSpec, random: Random): Cloud[] {
  const clouds: Cloud[] = [];
  const spacing = spec.stripWidth / CLOUD_COUNT;
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const centreX = (i + 0.2 + random() * 0.6) * spacing;
    const baseY = lerp(spec.height * 0.38, spec.height * 0.86, random());
    const halfWidth = lerp(26, 52, random());
    const puffCount = 4 + Math.floor(random() * 4);
    const puffs: Puff[] = [];
    for (let p = 0; p < puffCount; p++) {
      const along = puffCount === 1 ? 0 : p / (puffCount - 1) - 0.5;
      const centreWeight = 1 - Math.abs(along) * 1.3;
      const radius = lerp(9, 24, centreWeight) * lerp(0.8, 1.15, random());
      puffs.push({
        x: centreX + along * 2 * halfWidth + lerp(-4, 4, random()),
        y: baseY - radius * lerp(0.35, 0.7, random()),
        radius,
      });
    }
    const left = Math.min(...puffs.map((puff) => puff.x - puff.radius)) - 6;
    const right = Math.max(...puffs.map((puff) => puff.x + puff.radius)) + 6;
    const topY = Math.min(...puffs.map((puff) => puff.y - puff.radius));
    clouds.push({ baseY, topY, puffs, left, right });
  }
  return clouds;
}

function paintCloud(raster: Raster, cloud: Cloud, spec: SceneryLayerSpec, scale: number): void {
  const firstRow = Math.max(0, Math.floor((cloud.topY - 6) * scale));
  const lastRow = Math.min(raster.height - 1, Math.ceil((cloud.baseY + 4) * scale));
  for (let px = Math.floor(cloud.left * scale); px <= Math.ceil(cloud.right * scale); px++) {
    const column = ((px % raster.width) + raster.width) % raster.width;
    const lx = px / scale;
    for (let y = firstRow; y <= lastRow; y++) {
      const ly = y / scale;
      let density = 0;
      for (const puff of cloud.puffs) {
        const dx = lx - puff.x;
        const dy = ly - puff.y;
        density = Math.max(density, 1 - Math.sqrt(dx * dx + dy * dy) / puff.radius);
      }
      const u = column / raster.width;
      const noise = fbm2D(u, ly / spec.stripWidth, NOISE_PERIOD, 4, spec.seed) - 0.5;
      const edgeNoise = noise * NOISE_AMOUNT * smoothstep(0, NOISE_FADE_IN, density);
      const shaped = (density + edgeNoise) * smoothstep(cloud.baseY + 3, cloud.baseY - 3, ly);
      const alpha = smoothstep(EDGE_LOW, EDGE_HIGH, shaped) * MAX_ALPHA;
      if (alpha <= 0) continue;
      const depth = clamp01((ly - cloud.topY) / (cloud.baseY - cloud.topY));
      const body = mixColor(LIT, BODY, clamp01(depth * 1.6));
      const shade = clamp01(depth ** 1.6 * 0.9 - noise * 0.4);
      blendPixel(raster, column, y, mixColor(body, SHADOW, shade), alpha);
    }
  }
}
