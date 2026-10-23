import { crc32 } from './crc32';
import type { Raster } from './raster';

export type Deflate = (bytes: Uint8Array) => Uint8Array;

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const HEADER_LENGTH = 13;
const BIT_DEPTH = 8;
const COLOUR_TYPE_RGBA = 6;
const FILTER_NONE = 0;
const BYTES_PER_PIXEL = 4;
const CHUNK_OVERHEAD = 12;

export function encodePng(raster: Raster, deflate: Deflate): Uint8Array {
  const header = new Uint8Array(HEADER_LENGTH);
  const view = new DataView(header.buffer);
  view.setUint32(0, raster.width);
  view.setUint32(4, raster.height);
  header[8] = BIT_DEPTH;
  header[9] = COLOUR_TYPE_RGBA;
  return concatBytes([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflate(filteredScanlines(raster))),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

export function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function filteredScanlines(raster: Raster): Uint8Array {
  const stride = raster.width * BYTES_PER_PIXEL;
  const out = new Uint8Array((stride + 1) * raster.height);
  for (let row = 0; row < raster.height; row++) {
    const start = row * (stride + 1);
    out[start] = FILTER_NONE;
    out.set(raster.data.subarray(row * stride, (row + 1) * stride), start + 1);
  }
  return out;
}

function chunk(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(payload.length + CHUNK_OVERHEAD);
  const view = new DataView(out.buffer);
  view.setUint32(0, payload.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  view.setUint32(8 + payload.length, crc32(out.subarray(4, 8 + payload.length)));
  return out;
}
