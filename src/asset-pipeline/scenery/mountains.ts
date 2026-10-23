import type { SceneryLayerSpec } from '../../content/art/scenery-layers';
import { clamp01, fbm1D, fbm2D, smoothstep } from '../noise';
import { blendPixel, createRaster, mixColor, parseHex, type Raster, type Rgba } from '../raster';

interface RidgeStyle {
  readonly lit: Rgba;
  readonly shade: Rgba;
  readonly snowLit: Rgba;
  readonly snowShade: Rgba;
  readonly baseHaze: number;
  readonly depthHaze: number;
  readonly snowLine: number;
  readonly crest: number;
  readonly depth: number;
  readonly period: number;
  readonly seedOffset: number;
}

const HAZE = parseHex('#cfe4f3');
const SLOPE_GAIN = 1.4;
const TEXTURE_PERIOD = 30;
const RIDGE_OCTAVES = 5;
const LIGHTING_OCTAVES = 3;
const SLOPE_SPAN_PX = 6;
const LIGHT_FALLOFF = 55;

const FAR_RIDGE: RidgeStyle = {
  lit: parseHex('#b3c6dd'),
  shade: parseHex('#7f97b8'),
  snowLit: parseHex('#f6f9fd'),
  snowShade: parseHex('#c6d3e5'),
  baseHaze: 0.38,
  depthHaze: 0.5,
  snowLine: 52,
  crest: 14,
  depth: 74,
  period: 4,
  seedOffset: 0,
};

const NEAR_RIDGE: RidgeStyle = {
  lit: parseHex('#9fb6cf'),
  shade: parseHex('#6a86a8'),
  snowLit: parseHex('#eef3f9'),
  snowShade: parseHex('#bccbdd'),
  baseHaze: 0.16,
  depthHaze: 0.55,
  snowLine: 64,
  crest: 58,
  depth: 50,
  period: 6,
  seedOffset: 7,
};

export function generateMountains(spec: SceneryLayerSpec, scale: number): Raster {
  const raster = createRaster(spec.stripWidth * scale, spec.height * scale);
  paintRidge(raster, spec, scale, FAR_RIDGE);
  paintRidge(raster, spec, scale, NEAR_RIDGE);
  return raster;
}

export function ridgeTop(
  u: number,
  spec: SceneryLayerSpec,
  style: RidgeStyle,
  octaves = RIDGE_OCTAVES,
): number {
  const noise = fbm1D(u, style.period, octaves, spec.seed + style.seedOffset);
  const ridged = 1 - Math.abs(2 * noise - 1);
  return style.crest + style.depth * (1 - ridged ** 1.4);
}

function paintRidge(
  raster: Raster,
  spec: SceneryLayerSpec,
  scale: number,
  style: RidgeStyle,
): void {
  const width = raster.width;
  const step = 1 / width;
  for (let x = 0; x < width; x++) {
    const u = x / width;
    const top = ridgeTop(u, spec, style);
    const slopeStep = step * SLOPE_SPAN_PX;
    const rise =
      ridgeTop(u + slopeStep, spec, style, LIGHTING_OCTAVES) -
      ridgeTop(u - slopeStep, spec, style, LIGHTING_OCTAVES);
    const slope = rise / (2 * slopeStep * spec.stripWidth);
    const snowJitter = (fbm1D(u, 24, 3, spec.seed + style.seedOffset + 3) - 0.5) * 14;
    const topPixel = top * scale;
    for (let y = Math.max(0, Math.floor(topPixel)); y < raster.height; y++) {
      const coverage = clamp01(y + 1 - topPixel);
      if (coverage <= 0) continue;
      const ly = y / scale;
      const texture =
        fbm2D(u, ly / spec.stripWidth, TEXTURE_PERIOD, 3, spec.seed + style.seedOffset) - 0.5;
      const facing = slope * SLOPE_GAIN * Math.exp(-(ly - top) / LIGHT_FALLOFF);
      const shaded = clamp01(0.5 + facing + texture * 0.3);
      let color = mixColor(style.shade, style.lit, shaded);
      const snow = smoothstep(style.snowLine + snowJitter + 4, style.snowLine + snowJitter - 2, ly);
      if (snow > 0) color = mixColor(color, mixColor(style.snowShade, style.snowLit, shaded), snow);
      const haze = style.baseHaze + style.depthHaze * smoothstep(0, 70, ly - top);
      blendPixel(raster, x, y, mixColor(color, HAZE, haze), coverage);
    }
  }
}
