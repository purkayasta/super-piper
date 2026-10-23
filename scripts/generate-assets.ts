import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { packAtlas } from '../src/asset-pipeline/atlas-packer';
import { encodeFlac } from '../src/asset-pipeline/audio/flac-encoder';
import { toPcm16 } from '../src/asset-pipeline/audio/mixdown';
import {
  AUDIO_BIT_DEPTH,
  AUDIO_SAMPLE_RATE,
  renderSfx,
  renderSong,
} from '../src/asset-pipeline/audio/render-sound';
import { encodePng } from '../src/asset-pipeline/png-encoder';
import { generateSceneryLayer } from '../src/asset-pipeline/scenery/scenery-generators';
import { buildTileset } from '../src/asset-pipeline/tileset-builder';
import { encodeWebpLossless } from '../src/asset-pipeline/webp-encoder';
import { gameplayAtlasFrames, tilesetTiles } from '../src/content/art/art-sources';
import { MUSIC_LIBRARY } from '../src/content/audio/music-library';
import { SFX_LIBRARY } from '../src/content/audio/sfx-library';
import { isSfxId, type SoundId } from '../src/content/audio/sound-ids';
import { SCENERY_BY_THEME, SCENERY_RESOLUTIONS } from '../src/content/art/scenery-layers';
import {
  ASSET_MANIFEST,
  GENERATED_ASSET_ROOT,
  type AssetEntry,
} from '../src/content/manifests/asset-manifest';
import { TILESET_LAYOUT } from '../src/game-engine/world/tile-ids';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const OVERRIDES_DIR = join(ROOT, 'art-overrides');
const STAMP_FILE = join(PUBLIC_DIR, GENERATED_ASSET_ROOT, '.stamp');
const INPUTS = [
  'src/asset-pipeline',
  'src/content/art',
  'src/content/audio',
  'src/content/manifests/asset-manifest.ts',
  'src/game-engine/world/tile-ids.ts',
  'scripts/generate-assets.ts',
  'art-overrides',
];

const deflate = (bytes: Uint8Array): Uint8Array => deflateSync(bytes, { level: 9 });

function main(): void {
  const entries = Object.values(ASSET_MANIFEST);
  const stamp = hashInputs();
  if (isUpToDate(stamp, entries)) {
    console.log('assets: up to date');
    return;
  }
  const started = performance.now();
  for (const entry of entries) {
    const entryStarted = performance.now();
    const overridden = copyOverrides(entry);
    if (!overridden) writeOutputs(produce(entry));
    const took = Math.round(performance.now() - entryStarted);
    console.log(
      `assets: ${overridden ? 'copied override for' : 'generated'} ${entry.id} (${took}ms)`,
    );
  }
  reportAudioSize(entries);
  writeFileSync(STAMP_FILE, stamp);
  console.log(`assets: done in ${Math.round(performance.now() - started)}ms`);
}

function produce(entry: AssetEntry): Map<string, Uint8Array> {
  const outputs = new Map<string, Uint8Array>();
  switch (entry.kind) {
    case 'atlas': {
      const imageName = entry.path.split('/').at(-1)!;
      const atlas = packAtlas(gameplayAtlasFrames(), imageName);
      outputs.set(entry.path, encodePng(atlas.raster, deflate));
      outputs.set(entry.dataPath!, new TextEncoder().encode(JSON.stringify(atlas.json, null, 1)));
      break;
    }
    case 'tileset':
      outputs.set(
        entry.path,
        encodePng(buildTileset(tilesetTiles(entry.theme!), TILESET_LAYOUT), deflate),
      );
      break;
    case 'scenery': {
      const spec = SCENERY_BY_THEME[entry.theme!].find((layer) => layer.id === entry.layer)!;
      const raster = generateSceneryLayer(spec, SCENERY_RESOLUTIONS[entry.resolution!]);
      outputs.set(entry.path, encodeWebpLossless(raster));
      break;
    }
    case 'sound':
      outputs.set(
        entry.path,
        encodeFlac(toPcm16(renderSound(entry.sound!), AUDIO_BIT_DEPTH), AUDIO_SAMPLE_RATE),
      );
      break;
  }
  return outputs;
}

function renderSound(id: SoundId): Float32Array {
  if (isSfxId(id)) return renderSfx(SFX_LIBRARY[id].tones, SFX_LIBRARY[id].peak);
  const { song, tempoScale } = MUSIC_LIBRARY[id];
  return renderSong(song, AUDIO_SAMPLE_RATE, tempoScale);
}

function reportAudioSize(entries: readonly AssetEntry[]): void {
  const sounds = entries.filter((entry) => entry.kind === 'sound');
  const bytes = sounds.reduce((sum, entry) => sum + statSync(join(PUBLIC_DIR, entry.path)).size, 0);
  console.log(`assets: ${sounds.length} sounds, ${Math.round(bytes / 1024)} kB`);
}

function writeOutputs(outputs: Map<string, Uint8Array>): void {
  for (const [path, bytes] of outputs) {
    const target = join(PUBLIC_DIR, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
}

function copyOverrides(entry: AssetEntry): boolean {
  const paths = [entry.path, entry.dataPath].filter((path): path is string => path !== undefined);
  const sources = paths.map((path) => join(OVERRIDES_DIR, relative(GENERATED_ASSET_ROOT, path)));
  if (!sources.every((source) => existsSync(source))) return false;
  paths.forEach((path, index) => {
    const target = join(PUBLIC_DIR, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(sources[index], target);
  });
  return true;
}

function isUpToDate(stamp: string, entries: readonly AssetEntry[]): boolean {
  if (!existsSync(STAMP_FILE) || readFileSync(STAMP_FILE, 'utf8') !== stamp) return false;
  return entries.every(
    (entry) =>
      existsSync(join(PUBLIC_DIR, entry.path)) &&
      (entry.dataPath === undefined || existsSync(join(PUBLIC_DIR, entry.dataPath))),
  );
}

function hashInputs(): string {
  const hash = createHash('sha256');
  for (const file of INPUTS.flatMap((input) => listFiles(join(ROOT, input))).sort()) {
    if (file.endsWith('.spec.ts')) continue;
    hash.update(relative(ROOT, file).replaceAll('\\', '/'));
    hash.update(readFileSync(file));
  }
  return hash.digest('hex');
}

function listFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => listFiles(join(path, name)));
}

main();
