import { BitWriter } from './bit-writer';
import { canonicalCodes, limitedCodeLengths, type PrefixCode } from './prefix-codes';
import type { Raster } from './raster';

const SIGNATURE = 0x2f;
const MAX_DIMENSION = 16384;
const TRANSFORM_PREDICTOR = 0;
const TRANSFORM_SUBTRACT_GREEN = 2;
const PREDICTOR_BLOCK_BITS = 5;
const LITERAL_SYMBOLS = 256;
const LENGTH_PREFIX_SYMBOLS = 24;
const DISTANCE_PREFIX_SYMBOLS = 40;
const MAX_CODE_LENGTH = 15;
const MAX_CODE_LENGTH_CODE_LENGTH = 7;
const CODE_LENGTH_SYMBOLS = 19;
const ZERO_RUN_SHORT = 17;
const ZERO_RUN_LONG = 18;
const CODE_LENGTH_ORDER = [17, 18, 0, 1, 2, 3, 4, 5, 16, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const MIN_MATCH = 3;
const MAX_MATCH = 4096;
const DISTANCE_CODE_ABOVE = 1;
const DISTANCE_CODE_LEFT = 2;
const OPAQUE_BLACK = 0xff000000;

export const PredictorMode = { left: 1, top: 2, averageLeftTop: 7, gradient: 12 } as const;
export type PredictorModeValue = (typeof PredictorMode)[keyof typeof PredictorMode];

const CANDIDATE_MODES: readonly PredictorModeValue[] = [
  PredictorMode.left,
  PredictorMode.top,
  PredictorMode.averageLeftTop,
  PredictorMode.gradient,
];

export function encodeWebpLossless(raster: Raster): Uint8Array {
  const { width, height } = raster;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(`WebP lossless cannot encode ${width}x${height}`);
  }
  const argb = toArgb(raster);
  const writer = new BitWriter();
  writer.writeBits(SIGNATURE, 8);
  writer.writeBits(width - 1, 14);
  writer.writeBits(height - 1, 14);
  writer.writeBits(usesAlpha(argb) ? 1 : 0, 1);
  writer.writeBits(0, 3);

  writer.writeBits(1, 1);
  writer.writeBits(TRANSFORM_SUBTRACT_GREEN, 2);
  subtractGreen(argb);

  writer.writeBits(1, 1);
  writer.writeBits(TRANSFORM_PREDICTOR, 2);
  writer.writeBits(PREDICTOR_BLOCK_BITS - 2, 3);
  const modes = choosePredictorModes(argb, width, height, PREDICTOR_BLOCK_BITS);
  writeEntropyCodedImage(writer, modes.image, modes.width, false);
  const residuals = predictorResiduals(argb, width, height, PREDICTOR_BLOCK_BITS, modes.image);

  writer.writeBits(0, 1);
  writeEntropyCodedImage(writer, residuals, width, true);
  return wrapInRiff(writer.finish());
}

export function toArgb(raster: Raster): Uint32Array {
  const pixels = new Uint32Array(raster.width * raster.height);
  const data = raster.data;
  for (let i = 0; i < pixels.length; i++) {
    const offset = i * 4;
    pixels[i] =
      ((data[offset + 3] << 24) |
        (data[offset] << 16) |
        (data[offset + 1] << 8) |
        data[offset + 2]) >>>
      0;
  }
  return pixels;
}

export function subtractGreen(argb: Uint32Array): void {
  for (let i = 0; i < argb.length; i++) {
    const pixel = argb[i];
    const green = (pixel >>> 8) & 0xff;
    const red = (((pixel >>> 16) & 0xff) - green) & 0xff;
    const blue = ((pixel & 0xff) - green) & 0xff;
    argb[i] = ((pixel & 0xff00ff00) | (red << 16) | blue) >>> 0;
  }
}

export function predictPixel(
  argb: Uint32Array,
  width: number,
  x: number,
  y: number,
  mode: number,
): number {
  if (x === 0 && y === 0) return OPAQUE_BLACK;
  const index = y * width + x;
  if (y === 0) return argb[index - 1];
  if (x === 0) return argb[index - width];
  const left = argb[index - 1];
  const top = argb[index - width];
  const topLeft = argb[index - width - 1];
  switch (mode) {
    case PredictorMode.left:
      return left;
    case PredictorMode.top:
      return top;
    case PredictorMode.averageLeftTop:
      return average2(left, top);
    case PredictorMode.gradient:
      return clampAddSubtractFull(left, top, topLeft);
    default:
      throw new Error(`Unsupported predictor mode ${mode}`);
  }
}

export function subtractPixels(a: number, b: number): number {
  return (
    (((((a >>> 24) - (b >>> 24)) & 0xff) << 24) |
      ((((a >>> 16) - (b >>> 16)) & 0xff) << 16) |
      ((((a >>> 8) - (b >>> 8)) & 0xff) << 8) |
      ((a - b) & 0xff)) >>>
    0
  );
}

export function addPixels(a: number, b: number): number {
  return (
    (((((a >>> 24) + (b >>> 24)) & 0xff) << 24) |
      ((((a >>> 16) + (b >>> 16)) & 0xff) << 16) |
      ((((a >>> 8) + (b >>> 8)) & 0xff) << 8) |
      ((a + b) & 0xff)) >>>
    0
  );
}

export function predictorResiduals(
  argb: Uint32Array,
  width: number,
  height: number,
  blockBits: number,
  modeImage: Uint32Array,
): Uint32Array {
  const blocksWide = blockCount(width, blockBits);
  const residuals = new Uint32Array(argb.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mode = (modeImage[(y >> blockBits) * blocksWide + (x >> blockBits)] >>> 8) & 0xff;
      const index = y * width + x;
      residuals[index] = subtractPixels(argb[index], predictPixel(argb, width, x, y, mode));
    }
  }
  return residuals;
}

export function lengthOrDistancePrefix(value: number): {
  prefix: number;
  extraBits: number;
  extraValue: number;
} {
  const zeroBased = value - 1;
  if (zeroBased < 4) return { prefix: zeroBased, extraBits: 0, extraValue: 0 };
  const highestBit = 31 - Math.clz32(zeroBased);
  const secondBit = (zeroBased >>> (highestBit - 1)) & 1;
  const extraBits = highestBit - 1;
  return {
    prefix: 2 * highestBit + secondBit,
    extraBits,
    extraValue: zeroBased & ((1 << extraBits) - 1),
  };
}

function choosePredictorModes(
  argb: Uint32Array,
  width: number,
  height: number,
  blockBits: number,
): { image: Uint32Array; width: number } {
  const blocksWide = blockCount(width, blockBits);
  const blocksHigh = blockCount(height, blockBits);
  const image = new Uint32Array(blocksWide * blocksHigh);
  for (let blockY = 0; blockY < blocksHigh; blockY++) {
    for (let blockX = 0; blockX < blocksWide; blockX++) {
      let bestMode: number = PredictorMode.left;
      let bestCost = Infinity;
      for (const mode of CANDIDATE_MODES) {
        const cost = blockCost(argb, width, height, blockX, blockY, blockBits, mode);
        if (cost < bestCost) {
          bestCost = cost;
          bestMode = mode;
        }
      }
      image[blockY * blocksWide + blockX] = (OPAQUE_BLACK | (bestMode << 8)) >>> 0;
    }
  }
  return { image, width: blocksWide };
}

function blockCost(
  argb: Uint32Array,
  width: number,
  height: number,
  blockX: number,
  blockY: number,
  blockBits: number,
  mode: number,
): number {
  const size = 1 << blockBits;
  const right = Math.min(width, (blockX + 1) * size);
  const bottom = Math.min(height, (blockY + 1) * size);
  let cost = 0;
  for (let y = blockY * size; y < bottom; y++) {
    for (let x = blockX * size; x < right; x++) {
      const residual = subtractPixels(argb[y * width + x], predictPixel(argb, width, x, y, mode));
      for (let shift = 0; shift < 32; shift += 8) {
        const channel = (residual >>> shift) & 0xff;
        cost += channel < 128 ? channel : 256 - channel;
      }
    }
  }
  return cost;
}

interface Tokens {
  readonly kinds: Uint8Array;
  readonly values: Uint32Array;
  readonly distances: Uint8Array;
  count: number;
}

const LITERAL = 0;
const BACKWARD_REFERENCE = 1;

function tokenize(pixels: Uint32Array, width: number): Tokens {
  const tokens: Tokens = {
    kinds: new Uint8Array(pixels.length),
    values: new Uint32Array(pixels.length),
    distances: new Uint8Array(pixels.length),
    count: 0,
  };
  let index = 0;
  while (index < pixels.length) {
    const leftRun = index > 0 ? runLength(pixels, index, 1) : 0;
    const aboveRun = index >= width ? runLength(pixels, index, width) : 0;
    const best = Math.max(leftRun, aboveRun);
    const token = tokens.count++;
    if (best >= MIN_MATCH) {
      tokens.kinds[token] = BACKWARD_REFERENCE;
      tokens.values[token] = best;
      tokens.distances[token] = leftRun >= aboveRun ? DISTANCE_CODE_LEFT : DISTANCE_CODE_ABOVE;
      index += best;
    } else {
      tokens.kinds[token] = LITERAL;
      tokens.values[token] = pixels[index];
      index++;
    }
  }
  return tokens;
}

function runLength(pixels: Uint32Array, start: number, distance: number): number {
  const limit = Math.min(pixels.length - start, MAX_MATCH);
  let length = 0;
  while (length < limit && pixels[start + length] === pixels[start + length - distance]) length++;
  return length;
}

function writeEntropyCodedImage(
  writer: BitWriter,
  pixels: Uint32Array,
  width: number,
  isMainImage: boolean,
): void {
  writer.writeBits(0, 1);
  if (isMainImage) writer.writeBits(0, 1);
  const tokens = tokenize(pixels, width);
  const green = new Uint32Array(LITERAL_SYMBOLS + LENGTH_PREFIX_SYMBOLS);
  const red = new Uint32Array(LITERAL_SYMBOLS);
  const blue = new Uint32Array(LITERAL_SYMBOLS);
  const alpha = new Uint32Array(LITERAL_SYMBOLS);
  const distance = new Uint32Array(DISTANCE_PREFIX_SYMBOLS);
  for (let i = 0; i < tokens.count; i++) {
    const value = tokens.values[i];
    if (tokens.kinds[i] === LITERAL) {
      green[(value >>> 8) & 0xff]++;
      red[(value >>> 16) & 0xff]++;
      blue[value & 0xff]++;
      alpha[value >>> 24]++;
    } else {
      green[LITERAL_SYMBOLS + lengthOrDistancePrefix(value).prefix]++;
      distance[lengthOrDistancePrefix(tokens.distances[i]).prefix]++;
    }
  }
  const codes = [green, red, blue, alpha, distance].map((histogram) =>
    writePrefixCode(writer, histogram),
  );
  const [greenCode, redCode, blueCode, alphaCode, distanceCode] = codes;
  for (let i = 0; i < tokens.count; i++) {
    const value = tokens.values[i];
    if (tokens.kinds[i] === LITERAL) {
      writeSymbol(writer, greenCode, (value >>> 8) & 0xff);
      writeSymbol(writer, redCode, (value >>> 16) & 0xff);
      writeSymbol(writer, blueCode, value & 0xff);
      writeSymbol(writer, alphaCode, value >>> 24);
      continue;
    }
    const length = lengthOrDistancePrefix(value);
    writeSymbol(writer, greenCode, LITERAL_SYMBOLS + length.prefix);
    writer.writeBits(length.extraValue, length.extraBits);
    const offset = lengthOrDistancePrefix(tokens.distances[i]);
    writeSymbol(writer, distanceCode, offset.prefix);
    writer.writeBits(offset.extraValue, offset.extraBits);
  }
}

function writeSymbol(writer: BitWriter, code: PrefixCode, symbol: number): void {
  if (code.usedSymbols <= 1) return;
  writer.writeBits(code.codes[symbol], code.lengths[symbol]);
}

function writePrefixCode(writer: BitWriter, histogram: Uint32Array): PrefixCode {
  const used: number[] = [];
  for (let symbol = 0; symbol < histogram.length; symbol++) {
    if (histogram[symbol] > 0) used.push(symbol);
  }
  if (used.length === 0) used.push(0);
  if (used.length <= 2 && used.every((symbol) => symbol < LITERAL_SYMBOLS)) {
    return writeSimplePrefixCode(writer, used, histogram.length);
  }
  const code = canonicalCodes(limitedCodeLengths(histogram, MAX_CODE_LENGTH));
  writeNormalPrefixCode(writer, code.lengths);
  return code;
}

function writeSimplePrefixCode(
  writer: BitWriter,
  symbols: readonly number[],
  alphabetSize: number,
): PrefixCode {
  writer.writeBits(1, 1);
  writer.writeBits(symbols.length - 1, 1);
  const [first, second] = symbols;
  if (first < 2) {
    writer.writeBits(0, 1);
    writer.writeBits(first, 1);
  } else {
    writer.writeBits(1, 1);
    writer.writeBits(first, 8);
  }
  if (second !== undefined) writer.writeBits(second, 8);
  const lengths = new Uint8Array(alphabetSize);
  for (const symbol of symbols) lengths[symbol] = 1;
  return canonicalCodes(lengths);
}

function writeNormalPrefixCode(writer: BitWriter, lengths: Uint8Array): void {
  const runs = codeLengthTokens(lengths);
  const histogram = new Uint32Array(CODE_LENGTH_SYMBOLS);
  for (const run of runs) histogram[run.symbol]++;
  const lengthCode = canonicalCodes(limitedCodeLengths(histogram, MAX_CODE_LENGTH_CODE_LENGTH));
  let written = CODE_LENGTH_ORDER.length;
  while (written > 4 && lengthCode.lengths[CODE_LENGTH_ORDER[written - 1]] === 0) written--;
  writer.writeBits(0, 1);
  writer.writeBits(written - 4, 4);
  for (let i = 0; i < written; i++) writer.writeBits(lengthCode.lengths[CODE_LENGTH_ORDER[i]], 3);
  writer.writeBits(0, 1);
  for (const run of runs) {
    writeSymbol(writer, lengthCode, run.symbol);
    writer.writeBits(run.extraValue, run.extraBits);
  }
}

function codeLengthTokens(
  lengths: Uint8Array,
): { symbol: number; extraBits: number; extraValue: number }[] {
  const tokens: { symbol: number; extraBits: number; extraValue: number }[] = [];
  let index = 0;
  while (index < lengths.length) {
    if (lengths[index] !== 0) {
      tokens.push({ symbol: lengths[index], extraBits: 0, extraValue: 0 });
      index++;
      continue;
    }
    let zeros = 0;
    while (index + zeros < lengths.length && lengths[index + zeros] === 0 && zeros < 138) zeros++;
    if (zeros < 3) {
      for (let i = 0; i < zeros; i++) tokens.push({ symbol: 0, extraBits: 0, extraValue: 0 });
    } else if (zeros <= 10) {
      tokens.push({ symbol: ZERO_RUN_SHORT, extraBits: 3, extraValue: zeros - 3 });
    } else {
      tokens.push({ symbol: ZERO_RUN_LONG, extraBits: 7, extraValue: zeros - 11 });
    }
    index += zeros;
  }
  return tokens;
}

function wrapInRiff(payload: Uint8Array): Uint8Array {
  const padding = payload.length % 2;
  const out = new Uint8Array(20 + payload.length + padding);
  const view = new DataView(out.buffer);
  writeAscii(out, 0, 'RIFF');
  view.setUint32(4, out.length - 8, true);
  writeAscii(out, 8, 'WEBP');
  writeAscii(out, 12, 'VP8L');
  view.setUint32(16, payload.length, true);
  out.set(payload, 20);
  return out;
}

function writeAscii(target: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) target[offset + i] = text.charCodeAt(i);
}

function usesAlpha(argb: Uint32Array): boolean {
  for (const pixel of argb) if (pixel >>> 24 !== 0xff) return true;
  return false;
}

function blockCount(size: number, blockBits: number): number {
  return (size + (1 << blockBits) - 1) >> blockBits;
}

function average2(a: number, b: number): number {
  return ((((a ^ b) & 0xfefefefe) >>> 1) + (a & b)) >>> 0;
}

function clampAddSubtractFull(left: number, top: number, topLeft: number): number {
  let out = 0;
  for (let shift = 0; shift < 32; shift += 8) {
    const value =
      ((left >>> shift) & 0xff) + ((top >>> shift) & 0xff) - ((topLeft >>> shift) & 0xff);
    out |= Math.min(255, Math.max(0, value)) << shift;
  }
  return out >>> 0;
}
