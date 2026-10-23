import { describe, expect, it } from 'vitest';
import { crc32 } from './crc32';
import { encodePng } from './png-encoder';
import { createRaster, setPixel } from './raster';

const identityDeflate = (bytes: Uint8Array): Uint8Array => bytes;

interface Chunk {
  type: string;
  data: Uint8Array;
  crcMatches: boolean;
}

function readChunks(png: Uint8Array): Chunk[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: Chunk[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = view.getUint32(offset);
    const body = png.subarray(offset + 4, offset + 8 + length);
    chunks.push({
      type: String.fromCharCode(...body.subarray(0, 4)),
      data: body.subarray(4),
      crcMatches: view.getUint32(offset + 8 + length) === crc32(body),
    });
    offset += length + 12;
  }
  return chunks;
}

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('encodePng', () => {
  it('writes the signature then IHDR, IDAT and IEND with valid CRCs', () => {
    const png = encodePng(createRaster(3, 2), identityDeflate);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const chunks = readChunks(png);
    expect(chunks.map((chunk) => chunk.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(chunks.every((chunk) => chunk.crcMatches)).toBe(true);
  });

  it('describes an 8-bit RGBA image of the raster size', () => {
    const [header] = readChunks(encodePng(createRaster(3, 2), identityDeflate));
    const view = new DataView(header.data.buffer, header.data.byteOffset);
    expect(view.getUint32(0)).toBe(3);
    expect(view.getUint32(4)).toBe(2);
    expect([...header.data.subarray(8)]).toEqual([8, 6, 0, 0, 0]);
  });

  it('prefixes every scanline with filter type 0', () => {
    const raster = createRaster(1, 2);
    setPixel(raster, 0, 1, [1, 2, 3, 4]);
    const idat = readChunks(encodePng(raster, identityDeflate))[1].data;
    expect([...idat]).toEqual([0, 0, 0, 0, 0, 0, 1, 2, 3, 4]);
  });
});
