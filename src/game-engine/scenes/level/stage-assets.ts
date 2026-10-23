import Phaser from 'phaser';
import type { SceneryResolution, SceneryTheme } from '../../../content/art/scenery-layers';
import { SCENERY_BY_THEME } from '../../../content/art/scenery-layers';
import {
  assetEntry,
  sceneryAssetId,
  type AssetEntry,
  type AssetId,
} from '../../../content/manifests/asset-manifest';
import { TILE_COUNT, TILESET_LAYOUT } from '../../world/tile-ids';

export function sceneryAssetIds(theme: SceneryTheme, resolution: SceneryResolution): AssetId[] {
  return SCENERY_BY_THEME[theme].map((layer) => sceneryAssetId(theme, layer.id, resolution));
}

export function queueAssets(scene: Phaser.Scene, ids: readonly AssetId[]): void {
  for (const id of ids) {
    if (scene.textures.exists(id)) continue;
    queueAsset(scene, assetEntry(id));
  }
}

export function applySceneryFiltering(scene: Phaser.Scene, ids: readonly AssetId[]): void {
  for (const id of ids) {
    if (scene.textures.exists(id))
      scene.textures.get(id).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

export function tileFrameName(tileIndex: number): string {
  return `tile-${tileIndex}`;
}

export function addTileFrames(scene: Phaser.Scene, tilesetKey: AssetId): void {
  if (!scene.textures.exists(tilesetKey)) return;
  const texture = scene.textures.get(tilesetKey);
  const { tileSize, columns, margin, spacing } = TILESET_LAYOUT;
  const pitch = tileSize + spacing;
  for (let index = 0; index < TILE_COUNT; index++) {
    const name = tileFrameName(index);
    if (texture.has(name)) continue;
    const x = (index % columns) * pitch + margin;
    const y = Math.floor(index / columns) * pitch + margin;
    texture.add(name, 0, x, y, tileSize, tileSize);
  }
}

function queueAsset(scene: Phaser.Scene, entry: AssetEntry): void {
  switch (entry.kind) {
    case 'atlas':
      scene.load.atlas(entry.id, entry.path, entry.dataPath);
      break;
    case 'tileset':
    case 'scenery':
      scene.load.image(entry.id, entry.path);
      break;
  }
}
