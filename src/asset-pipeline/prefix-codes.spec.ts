import { describe, expect, it } from 'vitest';
import { BitWriter } from './bit-writer';
import { canonicalCodes, kraftSum, limitedCodeLengths, reverseBits } from './prefix-codes';

describe('BitWriter', () => {
  it('packs bits least-significant first', () => {
    const writer = new BitWriter();
    writer.writeBits(0b1, 1);
    writer.writeBits(0b10, 2);
    writer.writeBits(0b11111, 5);
    writer.writeBits(0xabc, 12);
    expect([...writer.finish()]).toEqual([0b11111101, 0xbc, 0x0a]);
  });

  it('splits values wider than 16 bits', () => {
    const writer = new BitWriter();
    writer.writeBits(0x12345678, 32);
    expect([...writer.finish()]).toEqual([0x78, 0x56, 0x34, 0x12]);
  });

  it('grows past its initial capacity', () => {
    const writer = new BitWriter();
    for (let i = 0; i < 10000; i++) writer.writeBits(i & 0xff, 8);
    const bytes = writer.finish();
    expect(bytes.length).toBe(10000);
    expect(bytes[9999]).toBe(9999 & 0xff);
  });
});

describe('limitedCodeLengths', () => {
  it('gives frequent symbols shorter codes and forms a complete code', () => {
    const lengths = limitedCodeLengths([50, 20, 20, 5, 5], 15);
    expect(lengths[0]).toBeLessThan(lengths[3]);
    expect(kraftSum(lengths)).toBe(1);
  });

  it('respects the maximum length on skewed input', () => {
    const fibonacci = [1, 1];
    while (fibonacci.length < 30) fibonacci.push(fibonacci.at(-1)! + fibonacci.at(-2)!);
    const lengths = limitedCodeLengths(fibonacci, 15);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(15);
    expect(kraftSum(lengths)).toBe(1);
  });

  it('marks a single used symbol with length 1 and unused symbols with 0', () => {
    expect([...limitedCodeLengths([0, 7, 0], 15)]).toEqual([0, 1, 0]);
    expect([...limitedCodeLengths([0, 0], 15)]).toEqual([0, 0]);
  });
});

describe('canonicalCodes', () => {
  it('assigns codes by length then symbol, bit-reversed for LSB-first writing', () => {
    const { codes, usedSymbols } = canonicalCodes(Uint8Array.of(2, 1, 3, 3));
    expect(usedSymbols).toBe(4);
    expect(codes[1]).toBe(reverseBits(0b0, 1));
    expect(codes[0]).toBe(reverseBits(0b10, 2));
    expect(codes[2]).toBe(reverseBits(0b110, 3));
    expect(codes[3]).toBe(reverseBits(0b111, 3));
  });
});

describe('reverseBits', () => {
  it('mirrors the low bits', () => {
    expect(reverseBits(0b0011, 4)).toBe(0b1100);
    expect(reverseBits(0b1, 3)).toBe(0b100);
  });
});
