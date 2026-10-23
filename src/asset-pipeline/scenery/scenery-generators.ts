import {
  SCENERY_GENERATORS,
  type SceneryLayerId,
  type SceneryLayerSpec,
} from '../../content/art/scenery-layers';
import { clearTransparentColour, createRaster, parseHex, setPixel, type Raster } from '../raster';
import { generateBushes } from './bushes';
import { generateClouds } from './clouds';
import { generateHills } from './hills';
import { generateMountains } from './mountains';
import { generateSky } from './sky';

type SceneryGenerator = (spec: SceneryLayerSpec, scale: number) => Raster;

const BASE_GENERATORS: Readonly<Record<SceneryLayerId, SceneryGenerator>> = {
  sky: generateSky,
  clouds: generateClouds,
  mountains: generateMountains,
  hills: generateHills,
  bushes: generateBushes,
};

function fallbackGenerator(spec: SceneryLayerSpec, scale: number): Raster {
  const width = spec.stripWidth * scale;
  const height = spec.height * scale;
  const raster = createRaster(width, height);
  const base = parseHex('#3d405c');
  const mid = parseHex('#6a7aa2');
  const accent = parseHex('#d6d4c5');
  for (let y = 0; y < height; y++) {
    const py = y / scale;
    const glow = 1 - Math.min(1, py / Math.max(1, spec.height));
    for (let x = 0; x < width; x++) {
      const px = x / scale;
      const noise = Math.sin((px + spec.seed) * 0.37) + Math.cos((py * 1.7 + spec.seed) * 0.29);
      const band = ((Math.sin((px * 0.11 + spec.seed) * 0.7) + 1) / 2) * 0.8;
      const alpha = Math.max(
        0,
        Math.min(255, Math.round((noise * 30 + band * 90 + glow * 120) * 1.5)),
      );
      if (alpha < 18) continue;
      const mix = Math.max(0, Math.min(1, (alpha - 30) / 200));
      const r = Math.round(base[0] * (1 - mix) + mid[0] * mix);
      const g = Math.round(base[1] * (1 - mix) + mid[1] * mix);
      const b = Math.round(base[2] * (1 - mix) + mid[2] * mix);
      const shade = Math.max(0, Math.min(1, (band + glow) / 2));
      setPixel(raster, x, y, [r, g + Math.round((accent[1] - g) * shade), b, alpha]);
    }
  }
  return raster;
}

const GENERATORS: Readonly<Record<SceneryLayerId, SceneryGenerator>> = {
  ...BASE_GENERATORS,
  ...Object.fromEntries(
    SCENERY_GENERATORS.filter((id) => !(id in BASE_GENERATORS)).map((id) => [
      id,
      fallbackGenerator,
    ]),
  ),
};

export function generateSceneryLayer(spec: SceneryLayerSpec, scale: number): Raster {
  const raster = GENERATORS[spec.generator](spec, scale);
  clearTransparentColour(raster);
  return raster;
}
