import { describe, expect, it } from 'vitest';
import {
  ASSET_MANIFEST,
  GAMEPLAY_ATLAS_ID,
  assetEntry,
  sceneryAssetId,
  sceneryResolutionForQuality,
  tilesetAssetId,
} from './asset-manifest';

describe('asset manifest', () => {
  it('keys every entry by its own id and keeps paths unique', () => {
    const entries = Object.entries(ASSET_MANIFEST);
    for (const [id, entry] of entries) expect(entry.id).toBe(id);
    const paths = entries.flatMap(([, entry]) => [entry.path, entry.dataPath ?? []].flat());
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('describes the gameplay atlas as PNG plus Phaser JSON', () => {
    expect(assetEntry(GAMEPLAY_ATLAS_ID)).toMatchObject({
      kind: 'atlas',
      path: 'assets/generated/sprites/gameplay.png',
      dataPath: 'assets/generated/sprites/gameplay.json',
    });
  });

  it('has a tileset and both scenery resolutions for the overworld', () => {
    expect(assetEntry(tilesetAssetId('overworld')).kind).toBe('tileset');
    for (const layer of ['sky', 'clouds', 'mountains', 'hills', 'bushes'] as const) {
      expect(assetEntry(sceneryAssetId('overworld', layer, '720p')).path).toMatch(
        /720p\/.+\.webp$/,
      );
      expect(assetEntry(sceneryAssetId('overworld', layer, '1440p')).path).toMatch(
        /1440p\/.+\.webp$/,
      );
    }
  });

  it('uses relative paths so a sub-folder base href works', () => {
    for (const entry of Object.values(ASSET_MANIFEST))
      expect(entry.path.startsWith('/')).toBe(false);
  });

  it('maps only High quality to the 1440p scenery set', () => {
    expect(sceneryResolutionForQuality('high')).toBe('1440p');
    expect(sceneryResolutionForQuality('medium')).toBe('720p');
    expect(sceneryResolutionForQuality('low')).toBe('720p');
  });

  it('throws for unknown or inherited ids', () => {
    expect(() => assetEntry('nope')).toThrow('Unknown asset "nope"');
    expect(() => assetEntry('toString')).toThrow();
  });
});
