import { MsbBitWriter } from './msb-bit-writer';

export interface FlacOptions {
  readonly blockSize: number;
  readonly maxPartitionOrder: number;
}

export const DEFAULT_FLAC_OPTIONS: FlacOptions = { blockSize: 4096, maxPartitionOrder: 6 };

const BITS_PER_SAMPLE = 16;
const MAX_FIXED_ORDER = 4;
const MAX_RICE_PARAMETER = 14;
const STREAMINFO_LENGTH = 34;
const MIN_STREAMINFO_BLOCK = 16;
const FRAME_SYNC = 0xfff8;
const MONO = 0;
const SAMPLE_SIZE_16 = 0b100;
const BLOCK_SIZE_FROM_8_BITS = 0b0110;
const BLOCK_SIZE_FROM_16_BITS = 0b0111;
const SUBFRAME_CONSTANT = 0b000000;
const SUBFRAME_VERBATIM = 0b000001;
const SUBFRAME_FIXED = 0b001000;
const RICE_METHOD_4_BIT = 0b00;
const RICE_HEADER_BITS = 6;
const RICE_PARAMETER_BITS = 4;

const SAMPLE_RATE_CODES: ReadonlyMap<number, number> = new Map([
  [88200, 1],
  [176400, 2],
  [192000, 3],
  [8000, 4],
  [16000, 5],
  [22050, 6],
  [24000, 7],
  [32000, 8],
  [44100, 9],
  [48000, 10],
  [96000, 11],
]);

const BLOCK_SIZE_CODES: ReadonlyMap<number, number> = new Map([
  [192, 1],
  [576, 2],
  [1152, 3],
  [2304, 4],
  [4608, 5],
  [256, 8],
  [512, 9],
  [1024, 10],
  [2048, 11],
  [4096, 12],
  [8192, 13],
  [16384, 14],
  [32768, 15],
]);

const FIXED_COEFFICIENTS: readonly (readonly number[])[] = [
  [],
  [1],
  [2, -1],
  [3, -3, 1],
  [4, -6, 4, -1],
];

interface RicePlan {
  readonly bits: number;
  readonly partitionOrder: number;
  readonly parameters: readonly number[];
}

interface SubframeScratch {
  readonly folded: Uint32Array;
  readonly shifted: Int16Array;
}

interface RiceChoice {
  readonly parameter: number;
  readonly bits: number;
}

export function encodeFlac(
  samples: Int16Array,
  sampleRate: number,
  options: FlacOptions = DEFAULT_FLAC_OPTIONS,
): Uint8Array {
  const writer = new MsbBitWriter(samples.length + 1024);
  writeStreamHeader(writer, samples.length, sampleRate, options.blockSize);
  const scratch: SubframeScratch = {
    folded: new Uint32Array(options.blockSize),
    shifted: new Int16Array(options.blockSize),
  };
  let frameNumber = 0;
  for (let start = 0; start < samples.length; start += options.blockSize) {
    const block = samples.subarray(start, Math.min(samples.length, start + options.blockSize));
    writeFrame(writer, block, frameNumber++, sampleRate, options.maxPartitionOrder, scratch);
  }
  return writer.finish();
}

export function crc8(bytes: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

export function crc16(bytes: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x8005) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function writeStreamHeader(
  writer: MsbBitWriter,
  totalSamples: number,
  sampleRate: number,
  blockSize: number,
): void {
  for (const char of 'fLaC') writer.writeBits(char.charCodeAt(0), 8);
  writer.writeBits(1, 1);
  writer.writeBits(0, 7);
  writer.writeBits(STREAMINFO_LENGTH, 24);
  const streamBlock =
    totalSamples > blockSize
      ? blockSize
      : Math.max(MIN_STREAMINFO_BLOCK, Math.min(blockSize, totalSamples));
  writer.writeBits(streamBlock, 16);
  writer.writeBits(streamBlock, 16);
  writer.writeBits(0, 24);
  writer.writeBits(0, 24);
  writer.writeBits(sampleRate, 20);
  writer.writeBits(0, 3);
  writer.writeBits(BITS_PER_SAMPLE - 1, 5);
  writer.writeBits(totalSamples, 36);
  for (let i = 0; i < 16; i++) writer.writeBits(0, 8);
}

function writeFrame(
  writer: MsbBitWriter,
  block: Int16Array,
  frameNumber: number,
  sampleRate: number,
  maxPartitionOrder: number,
  scratch: SubframeScratch,
): void {
  const frameStart = writer.byteLength;
  const sizeCode =
    BLOCK_SIZE_CODES.get(block.length) ??
    (block.length <= 256 ? BLOCK_SIZE_FROM_8_BITS : BLOCK_SIZE_FROM_16_BITS);
  writer.writeBits(FRAME_SYNC, 16);
  writer.writeBits(sizeCode, 4);
  writer.writeBits(SAMPLE_RATE_CODES.get(sampleRate) ?? 0, 4);
  writer.writeBits(MONO, 4);
  writer.writeBits(SAMPLE_SIZE_16, 3);
  writer.writeBits(0, 1);
  writeUtf8Number(writer, frameNumber);
  if (sizeCode === BLOCK_SIZE_FROM_8_BITS) writer.writeBits(block.length - 1, 8);
  else if (sizeCode === BLOCK_SIZE_FROM_16_BITS) writer.writeBits(block.length - 1, 16);
  writer.writeBits(crc8(writer.bytesSince(frameStart)), 8);
  writeSubframe(writer, block, maxPartitionOrder, scratch);
  writer.alignToByte();
  writer.writeBits(crc16(writer.bytesSince(frameStart)), 16);
}

function writeUtf8Number(writer: MsbBitWriter, value: number): void {
  if (value < 0x80) {
    writer.writeBits(value, 8);
    return;
  }
  let continuationBytes = 1;
  while (value >= 2 ** (6 + 5 * continuationBytes)) continuationBytes++;
  const leadMarker = (0xff << (7 - continuationBytes)) & 0xff;
  writer.writeBits(leadMarker | Math.floor(value / 2 ** (6 * continuationBytes)), 8);
  for (let i = continuationBytes - 1; i >= 0; i--) {
    writer.writeBits(0x80 | (Math.floor(value / 2 ** (6 * i)) & 0x3f), 8);
  }
}

function writeSubframe(
  writer: MsbBitWriter,
  block: Int16Array,
  maxPartitionOrder: number,
  scratch: SubframeScratch,
): void {
  if (isConstant(block)) {
    writeSubframeHeader(writer, SUBFRAME_CONSTANT, 0);
    writer.writeSigned(block[0], BITS_PER_SAMPLE);
    return;
  }
  const wasted = wastedBits(block);
  const samples = wasted === 0 ? block : shiftRight(block, wasted, scratch.shifted);
  const bits = BITS_PER_SAMPLE - wasted;
  const order = bestFixedOrder(samples);
  foldResiduals(samples, order, scratch.folded);
  const plan = planRice(scratch.folded, samples.length, order, maxPartitionOrder);
  const fixedBits = order * bits + plan.bits;
  const verbatimBits = samples.length * bits;
  if (fixedBits >= verbatimBits) {
    writeSubframeHeader(writer, SUBFRAME_VERBATIM, wasted);
    for (let i = 0; i < samples.length; i++) writer.writeSigned(samples[i], bits);
    return;
  }
  writeSubframeHeader(writer, SUBFRAME_FIXED | order, wasted);
  for (let i = 0; i < order; i++) writer.writeSigned(samples[i], bits);
  writeResiduals(writer, scratch.folded, samples.length, order, plan);
}

function wastedBits(block: Int16Array): number {
  let combined = 0;
  for (let i = 0; i < block.length; i++) combined |= block[i];
  if (combined === 0) return 0;
  let wasted = 0;
  while ((combined & 1) === 0) {
    combined >>= 1;
    wasted++;
  }
  return wasted;
}

function shiftRight(block: Int16Array, bits: number, out: Int16Array): Int16Array {
  const shifted = out.subarray(0, block.length);
  for (let i = 0; i < block.length; i++) shifted[i] = block[i] >> bits;
  return shifted;
}

function writeResiduals(
  writer: MsbBitWriter,
  folded: Uint32Array,
  blockSize: number,
  order: number,
  plan: RicePlan,
): void {
  writer.writeBits(RICE_METHOD_4_BIT, 2);
  writer.writeBits(plan.partitionOrder, 4);
  const perPartition = blockSize >> plan.partitionOrder;
  let index = 0;
  for (let p = 0; p < plan.parameters.length; p++) {
    const count = p === 0 ? perPartition - order : perPartition;
    const parameter = plan.parameters[p];
    writer.writeBits(parameter, RICE_PARAMETER_BITS);
    const mask = (1 << parameter) - 1;
    for (let i = 0; i < count; i++, index++) {
      const value = folded[index];
      writer.writeUnary(value >>> parameter);
      if (parameter > 0) writer.writeBits(value & mask, parameter);
    }
  }
}

function writeSubframeHeader(writer: MsbBitWriter, type: number, wasted: number): void {
  writer.writeBits(0, 1);
  writer.writeBits(type, 6);
  if (wasted === 0) {
    writer.writeBits(0, 1);
    return;
  }
  writer.writeBits(1, 1);
  writer.writeUnary(wasted - 1);
}

function isConstant(block: Int16Array): boolean {
  const first = block[0];
  for (let i = 1; i < block.length; i++) if (block[i] !== first) return false;
  return true;
}

function fixedResidual(block: Int16Array, order: number, index: number): number {
  const coefficients = FIXED_COEFFICIENTS[order];
  let prediction = 0;
  for (let j = 0; j < order; j++) prediction += coefficients[j] * block[index - 1 - j];
  return block[index] - prediction;
}

function bestFixedOrder(block: Int16Array): number {
  const maxOrder = Math.min(MAX_FIXED_ORDER, block.length - 1);
  let best = 0;
  let bestCost = Infinity;
  for (let order = 0; order <= maxOrder; order++) {
    let cost = 0;
    for (let i = maxOrder; i < block.length; i++) cost += Math.abs(fixedResidual(block, order, i));
    if (cost < bestCost) {
      bestCost = cost;
      best = order;
    }
  }
  return best;
}

function foldResiduals(block: Int16Array, order: number, out: Uint32Array): void {
  for (let i = order; i < block.length; i++) {
    const residual = fixedResidual(block, order, i);
    out[i - order] = residual >= 0 ? residual * 2 : -residual * 2 - 1;
  }
}

function planRice(
  folded: Uint32Array,
  blockSize: number,
  predictorOrder: number,
  maxPartitionOrder: number,
): RicePlan {
  let best: RicePlan = { bits: Infinity, partitionOrder: 0, parameters: [] };
  for (let partitionOrder = 0; partitionOrder <= maxPartitionOrder; partitionOrder++) {
    const perPartition = blockSize >> partitionOrder;
    if (perPartition << partitionOrder !== blockSize || perPartition <= predictorOrder) break;
    const parameters: number[] = [];
    let bits = RICE_HEADER_BITS;
    let index = 0;
    for (let p = 0; p < 1 << partitionOrder; p++) {
      const count = p === 0 ? perPartition - predictorOrder : perPartition;
      const choice = bestParameter(folded, index, count);
      parameters.push(choice.parameter);
      bits += RICE_PARAMETER_BITS + choice.bits;
      index += count;
    }
    if (bits < best.bits) best = { bits, partitionOrder, parameters };
  }
  return best;
}

function bestParameter(folded: Uint32Array, start: number, count: number): RiceChoice {
  let sum = 0;
  for (let i = start; i < start + count; i++) sum += folded[i];
  const mean = count > 0 ? sum / count : 0;
  const guess = mean < 1 ? 0 : Math.min(MAX_RICE_PARAMETER, Math.floor(Math.log2(mean)));
  let parameter = guess;
  let bits = Infinity;
  for (let k = Math.max(0, guess - 1); k <= Math.min(MAX_RICE_PARAMETER, guess + 1); k++) {
    let total = count * (k + 1);
    for (let i = start; i < start + count; i++) total += folded[i] >>> k;
    if (total < bits) {
      bits = total;
      parameter = k;
    }
  }
  return { parameter, bits };
}
