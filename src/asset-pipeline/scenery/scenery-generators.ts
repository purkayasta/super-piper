import type { SceneryLayerId, SceneryLayerSpec } from '../../content/art/scenery-layers';
import { clearTransparentColour, type Raster } from '../raster';
import { generateBushes } from './bushes';
import { generateClouds } from './clouds';
import { generateHills } from './hills';
import { generateMountains } from './mountains';
import { generateSky } from './sky';

type SceneryGenerator = (spec: SceneryLayerSpec, scale: number) => Raster;

const GENERATORS: Readonly<Record<SceneryLayerId, SceneryGenerator>> = {
  sky: generateSky,
  clouds: generateClouds,
  mountains: generateMountains,
  hills: generateHills,
  bushes: generateBushes,
};

export function generateSceneryLayer(spec: SceneryLayerSpec, scale: number): Raster {
  const raster = GENERATORS[spec.id](spec, scale);
  clearTransparentColour(raster);
  return raster;
}
