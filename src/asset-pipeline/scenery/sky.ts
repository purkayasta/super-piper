import type { SceneryLayerSpec } from '../../content/art/scenery-layers';
import { smoothstep } from '../noise';
import { createRaster, mixColor, parseHex, setPixel, type Raster } from '../raster';

const ZENITH = parseHex('#5b9be0');
const MIDDLE = parseHex('#8fc2ee');
const HORIZON = parseHex('#d8edf8');
const SUN_GLOW = parseHex('#fff0c4');
const SUN_DISC = parseHex('#fffbea');
const SUN_X = 0.78;
const SUN_Y = 0.2;
const GLOW_RADIUS = 0.42;
const GLOW_STRENGTH = 0.6;
const DISC_RADIUS = 0.055;
const MIDDLE_STOP = 0.55;

export function generateSky(spec: SceneryLayerSpec, scale: number): Raster {
  const width = spec.stripWidth * scale;
  const height = spec.height * scale;
  const raster = createRaster(width, height);
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    const base =
      t < MIDDLE_STOP
        ? mixColor(ZENITH, MIDDLE, t / MIDDLE_STOP)
        : mixColor(MIDDLE, HORIZON, (t - MIDDLE_STOP) / (1 - MIDDLE_STOP));
    for (let x = 0; x < width; x++) {
      const dx = (x - SUN_X * width) / height;
      const dy = (y - SUN_Y * height) / height;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const glow = Math.exp(-((distance / GLOW_RADIUS) ** 2)) * GLOW_STRENGTH;
      const withGlow = mixColor(base, SUN_GLOW, glow);
      const disc = smoothstep(DISC_RADIUS + 0.012, DISC_RADIUS, distance);
      const color = mixColor(withGlow, SUN_DISC, disc);
      setPixel(raster, x, y, [
        Math.round(color[0]),
        Math.round(color[1]),
        Math.round(color[2]),
        255,
      ]);
    }
  }
  return raster;
}
