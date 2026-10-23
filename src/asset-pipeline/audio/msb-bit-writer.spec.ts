import { describe, expect, it } from 'vitest';
import { MsbBitWriter } from './msb-bit-writer';

describe('MsbBitWriter', () => {
  it('writes the most significant bit first', () => {
    const writer = new MsbBitWriter();
    writer.writeBits(0b101, 3);
    writer.writeBits(0b11110, 5);
    writer.writeBits(0xabcd, 16);
    expect([...writer.finish()]).toEqual([0b10111110, 0xab, 0xcd]);
  });

  it('pads the last byte with zeros', () => {
    const writer = new MsbBitWriter();
    writer.writeBits(1, 1);
    expect([...writer.finish()]).toEqual([0b10000000]);
  });

  it('writes values wider than 16 bits', () => {
    const writer = new MsbBitWriter();
    writer.writeBits(0x12345678, 32);
    writer.writeBits(0x1_0000_0001, 36);
    writer.alignToByte();
    expect([...writer.finish()]).toEqual([0x12, 0x34, 0x56, 0x78, 0x10, 0, 0, 0, 0x10]);
  });

  it('writes unary as zeros closed by a one', () => {
    const writer = new MsbBitWriter();
    writer.writeUnary(3);
    writer.writeUnary(0);
    expect([...writer.finish()]).toEqual([0b00011000]);
  });

  it("writes signed values in two's complement", () => {
    const writer = new MsbBitWriter();
    writer.writeSigned(-1, 4);
    writer.writeSigned(-8, 4);
    writer.writeSigned(-2, 16);
    expect([...writer.finish()]).toEqual([0xf8, 0xff, 0xfe]);
  });

  it('tracks the bit length and byte alignment', () => {
    const writer = new MsbBitWriter();
    writer.writeBits(0, 3);
    expect(writer.bitLength).toBe(3);
    writer.alignToByte();
    expect(writer.bitLength).toBe(8);
    expect(writer.byteLength).toBe(1);
  });

  it('grows past its initial capacity', () => {
    const writer = new MsbBitWriter(2);
    for (let i = 0; i < 100; i++) writer.writeBits(i, 8);
    const bytes = writer.finish();
    expect(bytes.length).toBe(100);
    expect(bytes[99]).toBe(99);
  });
});
