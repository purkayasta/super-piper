export type Random = () => number;

export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function latticeValue(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise1D(x: number, period: number, seed: number): number {
  return valueNoise2D(x, 0, period, seed);
}

export function valueNoise2D(x: number, y: number, periodX: number, seed: number): number {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  const fadeX = fade(x - cellX);
  const fadeY = fade(y - cellY);
  const left = wrap(cellX, periodX);
  const right = wrap(cellX + 1, periodX);
  const top = lerp(latticeValue(left, cellY, seed), latticeValue(right, cellY, seed), fadeX);
  const bottom = lerp(
    latticeValue(left, cellY + 1, seed),
    latticeValue(right, cellY + 1, seed),
    fadeX,
  );
  return lerp(top, bottom, fadeY);
}

export function fbm1D(u: number, basePeriod: number, octaves: number, seed: number): number {
  return fbm2D(u, 0, basePeriod, octaves, seed);
}

export function fbm2D(
  u: number,
  v: number,
  basePeriod: number,
  octaves: number,
  seed: number,
): number {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    const period = basePeriod * frequency;
    sum += amplitude * valueNoise2D(u * period, v * period, period, seed + octave * 101);
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / total;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
