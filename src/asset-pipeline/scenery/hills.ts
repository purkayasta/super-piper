import type { SceneryLayerSpec } from '../../content/art/scenery-layers';
import { clamp01, fbm1D, fbm2D, smoothstep } from '../noise';
import { blendPixel, createRaster, mixColor, parseHex, type Raster, type Rgba } from '../raster';

interface Wave {
  readonly cycles: number;
  readonly amplitude: number;
  readonly phase: number;
}

interface HillBand {
  readonly baseline: number;
  readonly waves: readonly Wave[];
  readonly noiseAmplitude: number;
  readonly base: Rgba;
  readonly rim: Rgba;
  readonly shade: Rgba;
  readonly haze: number;
  readonly clumps: boolean;
  readonly seedOffset: number;
}

const HAZE = parseHex('#cfe4f3');
const CLUMP = parseHex('#5f9466');
const RIM_DEPTH = 2.5;
const SHADE_DEPTH = 70;
const CLUMP_THRESHOLD = 0.6;
const SLOPE_GAIN = 0.9;

const BACK_HILLS: HillBand = {
  baseline: 30,
  waves: [
    { cycles: 2, amplitude: 9, phase: 1.3 },
    { cycles: 5, amplitude: 6, phase: 0.4 },
  ],
  noiseAmplitude: 8,
  base: parseHex('#8dbf8a'),
  rim: parseHex('#b7dcaa'),
  shade: parseHex('#6f9f78'),
  haze: 0.3,
  clumps: true,
  seedOffset: 0,
};

const FRONT_HILLS: HillBand = {
  baseline: 58,
  waves: [
    { cycles: 3, amplitude: 11, phase: 2.1 },
    { cycles: 7, amplitude: 4, phase: 4 },
  ],
  noiseAmplitude: 6,
  base: parseHex('#76ad6e'),
  rim: parseHex('#a6d493'),
  shade: parseHex('#568f5d'),
  haze: 0.12,
  clumps: false,
  seedOffset: 9,
};

export function generateHills(spec: SceneryLayerSpec, scale: number): Raster {
  const raster = createRaster(spec.stripWidth * scale, spec.height * scale);
  paintBand(raster, spec, scale, BACK_HILLS);
  paintBand(raster, spec, scale, FRONT_HILLS);
  return raster;
}

export function hillTop(u: number, spec: SceneryLayerSpec, band: HillBand): number {
  let top = band.baseline;
  for (const wave of band.waves) {
    top += wave.amplitude * Math.sin(2 * Math.PI * wave.cycles * u + wave.phase);
  }
  return top + band.noiseAmplitude * (fbm1D(u, 6, 3, spec.seed + band.seedOffset) - 0.5);
}

function paintBand(raster: Raster, spec: SceneryLayerSpec, scale: number, band: HillBand): void {
  const width = raster.width;
  const step = 1 / width;
  for (let x = 0; x < width; x++) {
    const u = x / width;
    const top = hillTop(u, spec, band);
    const rise = hillTop(u + step, spec, band) - hillTop(u - step, spec, band);
    const lightness = clamp01(0.5 + (rise / (2 * step * spec.stripWidth)) * SLOPE_GAIN);
    const topPixel = top * scale;
    for (let y = Math.max(0, Math.floor(topPixel)); y < raster.height; y++) {
      const coverage = clamp01(y + 1 - topPixel);
      if (coverage <= 0) continue;
      const depth = y / scale - top;
      let color = mixColor(band.shade, band.base, 0.55 + lightness * 0.45);
      color = mixColor(color, band.shade, smoothstep(0, SHADE_DEPTH, depth) * 0.6);
      if (depth < RIM_DEPTH) color = mixColor(band.rim, color, depth / RIM_DEPTH);
      if (band.clumps && depth > RIM_DEPTH) {
        const clump = fbm2D(u, y / scale / spec.stripWidth, 40, 3, spec.seed + band.seedOffset + 5);
        color = mixColor(
          color,
          CLUMP,
          smoothstep(CLUMP_THRESHOLD, CLUMP_THRESHOLD + 0.06, clump) * 0.45,
        );
      }
      blendPixel(raster, x, y, mixColor(color, HAZE, band.haze), coverage);
    }
  }
}
