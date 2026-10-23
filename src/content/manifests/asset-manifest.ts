import type { QualityLevel } from '../../game-engine/core/game-events';
import { MUSIC_IDS, SFX_IDS, soundFileName, type SoundId } from '../audio/sound-ids';
import {
  SCENERY_BY_THEME,
  SCENERY_RESOLUTIONS,
  SCENERY_THEMES,
  type SceneryLayerId,
  type SceneryResolution,
  type SceneryTheme,
} from '../art/scenery-layers';

export type AssetId = string;

export type AssetKind = 'atlas' | 'tileset' | 'scenery' | 'sound';

export interface AssetEntry {
  readonly id: AssetId;
  readonly kind: AssetKind;
  readonly path: string;
  readonly dataPath?: string;
  readonly theme?: SceneryTheme;
  readonly layer?: SceneryLayerId;
  readonly resolution?: SceneryResolution;
  readonly sound?: SoundId;
}

export const GENERATED_ASSET_ROOT = 'assets/generated';

export const GAMEPLAY_ATLAS_ID: AssetId = 'atlas.gameplay';

export function tilesetAssetId(theme: SceneryTheme): AssetId {
  return `tileset.${theme}`;
}

export function sceneryAssetId(
  theme: SceneryTheme,
  layer: SceneryLayerId,
  resolution: SceneryResolution,
): AssetId {
  return `scenery.${theme}.${layer}.${resolution}`;
}

export function sceneryResolutionForQuality(quality: QualityLevel): SceneryResolution {
  return quality === 'high' ? '1440p' : '720p';
}

function buildManifest(): Record<AssetId, AssetEntry> {
  const entries: AssetEntry[] = [
    {
      id: GAMEPLAY_ATLAS_ID,
      kind: 'atlas',
      path: `${GENERATED_ASSET_ROOT}/sprites/gameplay.png`,
      dataPath: `${GENERATED_ASSET_ROOT}/sprites/gameplay.json`,
    },
  ];
  for (const theme of SCENERY_THEMES) {
    entries.push({
      id: tilesetAssetId(theme),
      kind: 'tileset',
      path: `${GENERATED_ASSET_ROOT}/tiles/${theme}.png`,
      theme,
    });
    for (const resolution of Object.keys(SCENERY_RESOLUTIONS) as SceneryResolution[]) {
      for (const { id: layer } of SCENERY_BY_THEME[theme]) {
        entries.push({
          id: sceneryAssetId(theme, layer, resolution),
          kind: 'scenery',
          path: `${GENERATED_ASSET_ROOT}/scenery/${theme}/${resolution}/${layer}.webp`,
          theme,
          layer,
          resolution,
        });
      }
    }
  }
  for (const sound of [...SFX_IDS, ...MUSIC_IDS]) {
    entries.push({
      id: sound,
      kind: 'sound',
      path: `${GENERATED_ASSET_ROOT}/audio/${soundFileName(sound)}`,
      sound,
    });
  }
  return Object.fromEntries(entries.map((entry) => [entry.id, entry]));
}

export const ASSET_MANIFEST: Readonly<Record<AssetId, AssetEntry>> = buildManifest();

export function assetEntry(id: AssetId): AssetEntry {
  if (!Object.hasOwn(ASSET_MANIFEST, id)) throw new Error(`Unknown asset "${id}"`);
  return ASSET_MANIFEST[id];
}
