import { blit, createRaster, type Raster } from './raster';

export interface AtlasFrameInput {
  readonly name: string;
  readonly raster: Raster;
}

export interface AtlasPlacement {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface PhaserFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: false;
  trimmed: false;
  spriteSourceSize: { x: 0; y: 0; w: number; h: number };
  sourceSize: { w: number; h: number };
}

export interface PhaserAtlasJson {
  frames: Record<string, PhaserFrame>;
  meta: {
    app: string;
    image: string;
    format: 'RGBA8888';
    size: { w: number; h: number };
    scale: '1';
  };
}

export interface PackedAtlas {
  readonly raster: Raster;
  readonly placements: readonly AtlasPlacement[];
  readonly json: PhaserAtlasJson;
}

const DEFAULT_WIDTH = 256;
const PADDING = 1;

export function packAtlas(
  frames: readonly AtlasFrameInput[],
  imageName: string,
  width = DEFAULT_WIDTH,
): PackedAtlas {
  assertUniqueNames(frames);
  const ordered = [...frames].sort(
    (a, b) => b.raster.height - a.raster.height || a.name.localeCompare(b.name),
  );
  const placements: AtlasPlacement[] = [];
  let cursorX = PADDING;
  let cursorY = PADDING;
  let shelfHeight = 0;
  for (const frame of ordered) {
    const { width: frameWidth, height: frameHeight } = frame.raster;
    if (frameWidth + 2 * PADDING > width) {
      throw new Error(`Frame "${frame.name}" is wider than the ${width}px atlas`);
    }
    if (cursorX + frameWidth + PADDING > width) {
      cursorX = PADDING;
      cursorY += shelfHeight + PADDING;
      shelfHeight = 0;
    }
    placements.push({
      name: frame.name,
      x: cursorX,
      y: cursorY,
      width: frameWidth,
      height: frameHeight,
    });
    cursorX += frameWidth + PADDING;
    shelfHeight = Math.max(shelfHeight, frameHeight);
  }
  const height = nextPowerOfTwo(cursorY + shelfHeight + PADDING);
  const raster = createRaster(width, height);
  const byName = new Map(frames.map((frame) => [frame.name, frame.raster]));
  for (const placement of placements)
    blit(raster, byName.get(placement.name)!, placement.x, placement.y);
  return { raster, placements, json: atlasJson(placements, imageName, width, height) };
}

function atlasJson(
  placements: readonly AtlasPlacement[],
  imageName: string,
  width: number,
  height: number,
): PhaserAtlasJson {
  const frames: Record<string, PhaserFrame> = {};
  for (const { name, x, y, width: w, height: h } of [...placements].sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    frames[name] = {
      frame: { x, y, w, h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
    };
  }
  return {
    frames,
    meta: {
      app: 'pip-asset-pipeline',
      image: imageName,
      format: 'RGBA8888',
      size: { w: width, h: height },
      scale: '1',
    },
  };
}

function assertUniqueNames(frames: readonly AtlasFrameInput[]): void {
  const seen = new Set<string>();
  for (const { name } of frames) {
    if (seen.has(name)) throw new Error(`Duplicate atlas frame "${name}"`);
    seen.add(name);
  }
}

function nextPowerOfTwo(value: number): number {
  let power = 1;
  while (power < value) power *= 2;
  return power;
}
