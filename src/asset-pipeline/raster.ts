export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export type Rgba = readonly [red: number, green: number, blue: number, alpha: number];

const CHANNELS = 4;
const OPAQUE = 255;

export function createRaster(width: number, height: number): Raster {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid raster size ${width}x${height}`);
  }
  return { width, height, data: new Uint8ClampedArray(width * height * CHANNELS) };
}

export function parseHex(hex: string): Rgba {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!match) throw new Error(`Invalid colour "${hex}"`);
  const rgb = Number.parseInt(match[1], 16);
  const alpha = match[2] === undefined ? OPAQUE : Number.parseInt(match[2], 16);
  return [(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff, alpha];
}

export function mixColor(from: Rgba, to: Rgba, amount: number): Rgba {
  const t = Math.min(1, Math.max(0, amount));
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
    from[3] + (to[3] - from[3]) * t,
  ];
}

export function getPixel(raster: Raster, x: number, y: number): Rgba {
  const offset = pixelOffset(raster, x, y);
  const data = raster.data;
  return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
}

export function setPixel(raster: Raster, x: number, y: number, color: Rgba): void {
  if (!inBounds(raster, x, y)) return;
  const offset = pixelOffset(raster, x, y);
  raster.data[offset] = color[0];
  raster.data[offset + 1] = color[1];
  raster.data[offset + 2] = color[2];
  raster.data[offset + 3] = color[3];
}

export function fillRect(
  raster: Raster,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgba,
): void {
  const left = Math.max(0, x);
  const top = Math.max(0, y);
  const right = Math.min(raster.width, x + width);
  const bottom = Math.min(raster.height, y + height);
  for (let row = top; row < bottom; row++) {
    for (let column = left; column < right; column++) setPixel(raster, column, row, color);
  }
}

export function blit(
  target: Raster,
  source: Raster,
  destinationX: number,
  destinationY: number,
): void {
  for (let row = 0; row < source.height; row++) {
    const targetRow = destinationY + row;
    if (targetRow < 0 || targetRow >= target.height) continue;
    for (let column = 0; column < source.width; column++) {
      const targetColumn = destinationX + column;
      if (targetColumn < 0 || targetColumn >= target.width) continue;
      const from = pixelOffset(source, column, row);
      target.data.set(
        source.data.subarray(from, from + CHANNELS),
        pixelOffset(target, targetColumn, targetRow),
      );
    }
  }
}

export function blendPixel(raster: Raster, x: number, y: number, color: Rgba, coverage = 1): void {
  if (!inBounds(raster, x, y)) return;
  const sourceAlpha = (color[3] / OPAQUE) * Math.min(1, Math.max(0, coverage));
  if (sourceAlpha <= 0) return;
  const data = raster.data;
  const offset = pixelOffset(raster, x, y);
  const destinationAlpha = data[offset + 3] / OPAQUE;
  const outAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel++) {
    const source = color[channel] * sourceAlpha;
    const destination = data[offset + channel] * destinationAlpha * (1 - sourceAlpha);
    data[offset + channel] = Math.round((source + destination) / outAlpha);
  }
  data[offset + 3] = Math.round(outAlpha * OPAQUE);
}

export function clearTransparentColour(raster: Raster): void {
  const data = raster.data;
  for (let offset = 0; offset < data.length; offset += CHANNELS) {
    if (data[offset + 3] !== 0) continue;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
  }
}

function inBounds(raster: Raster, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < raster.width && y < raster.height;
}

function pixelOffset(raster: Raster, x: number, y: number): number {
  return (y * raster.width + x) * CHANNELS;
}
