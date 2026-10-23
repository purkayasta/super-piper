const DEFAULT_CAPACITY = 1 << 16;
const MAX_CHUNK_BITS = 24;

export class MsbBitWriter {
  private bytes: Uint8Array;
  private length = 0;
  private accumulator = 0;
  private pendingBits = 0;

  constructor(initialCapacity = DEFAULT_CAPACITY) {
    this.bytes = new Uint8Array(Math.max(1, initialCapacity));
  }

  get bitLength(): number {
    return this.length * 8 + this.pendingBits;
  }

  get byteLength(): number {
    return this.length;
  }

  writeBits(value: number, bitCount: number): void {
    let remaining = bitCount;
    while (remaining > MAX_CHUNK_BITS) {
      remaining -= MAX_CHUNK_BITS;
      this.writeChunk(Math.floor(value / 2 ** remaining) % 2 ** MAX_CHUNK_BITS, MAX_CHUNK_BITS);
    }
    if (remaining > 0) this.writeChunk(value % 2 ** remaining, remaining);
  }

  writeSigned(value: number, bitCount: number): void {
    this.writeBits(value < 0 ? value + 2 ** bitCount : value, bitCount);
  }

  writeUnary(zeros: number): void {
    let remaining = zeros;
    while (remaining >= MAX_CHUNK_BITS) {
      this.writeChunk(0, MAX_CHUNK_BITS);
      remaining -= MAX_CHUNK_BITS;
    }
    this.writeChunk(1, remaining + 1);
  }

  alignToByte(): void {
    if (this.pendingBits > 0) this.writeChunk(0, 8 - this.pendingBits);
  }

  finish(): Uint8Array {
    this.alignToByte();
    return this.bytes.slice(0, this.length);
  }

  bytesSince(startByte: number): Uint8Array {
    return this.bytes.subarray(startByte, this.length);
  }

  private writeChunk(value: number, bitCount: number): void {
    this.accumulator = (this.accumulator << bitCount) | (value & ((1 << bitCount) - 1));
    this.pendingBits += bitCount;
    while (this.pendingBits >= 8) {
      this.pendingBits -= 8;
      this.pushByte((this.accumulator >>> this.pendingBits) & 0xff);
    }
    this.accumulator &= (1 << this.pendingBits) - 1;
  }

  private pushByte(byte: number): void {
    if (this.length === this.bytes.length) {
      const grown = new Uint8Array(this.bytes.length * 2);
      grown.set(this.bytes);
      this.bytes = grown;
    }
    this.bytes[this.length++] = byte;
  }
}
