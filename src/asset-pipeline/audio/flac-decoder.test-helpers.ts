import { crc16, crc8 } from './flac-encoder';

export interface DecodedFlac {
  readonly sampleRate: number;
  readonly channels: number;
  readonly bitsPerSample: number;
  readonly totalSamples: number;
  readonly minBlockSize: number;
  readonly maxBlockSize: number;
  readonly samples: Int16Array;
  readonly subframeTypes: readonly string[];
  readonly wastedBits: readonly number[];
}

const FIXED_COEFFICIENTS: readonly (readonly number[])[] = [
  [],
  [1],
  [2, -1],
  [3, -3, 1],
  [4, -6, 4, -1],
];

class BitReader {
  private bitPosition = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get bytePosition(): number {
    return this.bitPosition >> 3;
  }

  get atEnd(): boolean {
    return this.bitPosition >= this.bytes.length * 8;
  }

  read(bitCount: number): number {
    let value = 0;
    for (let i = 0; i < bitCount; i++) {
      const byte = this.bytes[this.bitPosition >> 3];
      const bit = (byte >> (7 - (this.bitPosition & 7))) & 1;
      value = value * 2 + bit;
      this.bitPosition++;
    }
    return value;
  }

  readSigned(bitCount: number): number {
    const value = this.read(bitCount);
    return value >= 2 ** (bitCount - 1) ? value - 2 ** bitCount : value;
  }

  readUnary(): number {
    let zeros = 0;
    while (this.read(1) === 0) zeros++;
    return zeros;
  }

  align(): void {
    this.bitPosition = Math.ceil(this.bitPosition / 8) * 8;
  }
}

const SAMPLE_RATES: Readonly<Record<number, number>> = {
  1: 88200,
  2: 176400,
  3: 192000,
  4: 8000,
  5: 16000,
  6: 22050,
  7: 24000,
  8: 32000,
  9: 44100,
  10: 48000,
  11: 96000,
};

export function decodeFlac(bytes: Uint8Array): DecodedFlac {
  const reader = new BitReader(bytes);
  const magic = String.fromCharCode(reader.read(8), reader.read(8), reader.read(8), reader.read(8));
  if (magic !== 'fLaC') throw new Error('missing fLaC marker');
  const last = reader.read(1);
  const type = reader.read(7);
  const length = reader.read(24);
  if (last !== 1 || type !== 0 || length !== 34) throw new Error('expected a lone STREAMINFO');
  const minBlockSize = reader.read(16);
  const maxBlockSize = reader.read(16);
  reader.read(24);
  reader.read(24);
  const sampleRate = reader.read(20);
  const channels = reader.read(3) + 1;
  const bitsPerSample = reader.read(5) + 1;
  const totalSamples = reader.read(36);
  for (let i = 0; i < 16; i++) reader.read(8);

  const samples = new Int16Array(totalSamples);
  const subframeTypes: string[] = [];
  const wastedBits: number[] = [];
  let written = 0;
  let expectedFrame = 0;
  while (!reader.atEnd) {
    const frameStart = reader.bytePosition;
    if (reader.read(16) !== 0xfff8) throw new Error(`bad sync at byte ${frameStart}`);
    const sizeCode = reader.read(4);
    const rateCode = reader.read(4);
    if (reader.read(4) !== 0) throw new Error('expected mono');
    if (reader.read(3) !== 0b100) throw new Error('expected 16-bit');
    reader.read(1);
    const frameNumber = readUtf8Number(reader);
    if (frameNumber !== expectedFrame++) throw new Error(`frame ${frameNumber} out of order`);
    const blockSize = blockSizeFor(sizeCode, reader);
    if (rateCode !== 0 && SAMPLE_RATES[rateCode] !== sampleRate) throw new Error('rate mismatch');
    const headerCrc = crc8(bytes.subarray(frameStart, reader.bytePosition));
    if (reader.read(8) !== headerCrc)
      throw new Error(`header CRC mismatch in frame ${frameNumber}`);
    const subframe = readSubframe(reader, blockSize, samples, written);
    subframeTypes.push(subframe.type);
    wastedBits.push(subframe.wasted);
    written += blockSize;
    reader.align();
    const frameCrc = crc16(bytes.subarray(frameStart, reader.bytePosition));
    if (reader.read(16) !== frameCrc) throw new Error(`frame CRC mismatch in frame ${frameNumber}`);
  }
  if (written !== totalSamples) throw new Error(`decoded ${written} of ${totalSamples} samples`);
  return {
    sampleRate,
    channels,
    bitsPerSample,
    totalSamples,
    minBlockSize,
    maxBlockSize,
    samples,
    subframeTypes,
    wastedBits,
  };
}

function readUtf8Number(reader: BitReader): number {
  const lead = reader.read(8);
  if (lead < 0x80) return lead;
  let continuation = 0;
  while (lead & (0x40 >> continuation)) continuation++;
  let value = lead & (0x3f >> continuation);
  for (let i = 0; i < continuation; i++) value = value * 64 + (reader.read(8) & 0x3f);
  return value;
}

function blockSizeFor(code: number, reader: BitReader): number {
  if (code === 1) return 192;
  if (code >= 2 && code <= 5) return 576 * 2 ** (code - 2);
  if (code === 6) return reader.read(8) + 1;
  if (code === 7) return reader.read(16) + 1;
  if (code >= 8) return 256 * 2 ** (code - 8);
  throw new Error(`reserved block size code ${code}`);
}

function readSubframe(
  reader: BitReader,
  blockSize: number,
  out: Int16Array,
  offset: number,
): { type: string; wasted: number } {
  if (reader.read(1) !== 0) throw new Error('subframe padding bit set');
  const typeCode = reader.read(6);
  const wasted = reader.read(1) === 1 ? reader.readUnary() + 1 : 0;
  const type = readSubframeBody(reader, typeCode, 16 - wasted, blockSize, out, offset);
  if (wasted > 0) {
    for (let i = 0; i < blockSize; i++) out[offset + i] = out[offset + i] * 2 ** wasted;
  }
  return { type, wasted };
}

function readSubframeBody(
  reader: BitReader,
  type: number,
  bits: number,
  blockSize: number,
  out: Int16Array,
  offset: number,
): string {
  if (type === 0) {
    out.fill(reader.readSigned(bits), offset, offset + blockSize);
    return 'constant';
  }
  if (type === 1) {
    for (let i = 0; i < blockSize; i++) out[offset + i] = reader.readSigned(bits);
    return 'verbatim';
  }
  if ((type & 0b111000) !== 0b001000) throw new Error(`unsupported subframe type ${type}`);
  const order = type & 0b111;
  for (let i = 0; i < order; i++) out[offset + i] = reader.readSigned(bits);
  if (reader.read(2) !== 0) throw new Error('expected 4-bit Rice parameters');
  const partitionOrder = reader.read(4);
  const perPartition = blockSize >> partitionOrder;
  let index = order;
  for (let p = 0; p < 1 << partitionOrder; p++) {
    const parameter = reader.read(4);
    if (parameter === 15) throw new Error('escape partitions are not used');
    const count = p === 0 ? perPartition - order : perPartition;
    for (let i = 0; i < count; i++, index++) {
      const folded = reader.readUnary() * 2 ** parameter + reader.read(parameter);
      const residual = folded % 2 === 0 ? folded / 2 : -(folded + 1) / 2;
      let prediction = 0;
      for (let j = 0; j < order; j++) {
        prediction += FIXED_COEFFICIENTS[order][j] * out[offset + index - 1 - j];
      }
      out[offset + index] = prediction + residual;
    }
  }
  return `fixed-${order}`;
}
