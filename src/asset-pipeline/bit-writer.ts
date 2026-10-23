const INITIAL_CAPACITY = 4096;
const MAX_CHUNK_BITS = 16;

export class BitWriter {
  private bytes = new Uint8Array(INITIAL_CAPACITY);
  private length = 0;
  private accumulator = 0;
  private pendingBits = 0;

  writeBits(value: number, bitCount: number): void {
    let remainingValue = value >>> 0;
    let remainingBits = bitCount;
    while (remainingBits > MAX_CHUNK_BITS) {
      this.writeChunk(remainingValue & 0xffff, MAX_CHUNK_BITS);
      remainingValue >>>= MAX_CHUNK_BITS;
      remainingBits -= MAX_CHUNK_BITS;
    }
    if (remainingBits > 0) this.writeChunk(remainingValue, remainingBits);
  }

  finish(): Uint8Array {
    if (this.pendingBits > 0) {
      this.pushByte(this.accumulator & 0xff);
      this.accumulator = 0;
      this.pendingBits = 0;
    }
    return this.bytes.slice(0, this.length);
  }

  private writeChunk(value: number, bitCount: number): void {
    this.accumulator |= (value & ((1 << bitCount) - 1)) << this.pendingBits;
    this.pendingBits += bitCount;
    while (this.pendingBits >= 8) {
      this.pushByte(this.accumulator & 0xff);
      this.accumulator >>>= 8;
      this.pendingBits -= 8;
    }
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
