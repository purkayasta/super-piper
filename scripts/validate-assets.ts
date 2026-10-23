import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_MANIFEST } from '../src/content/manifests/asset-manifest';
import { STAGES } from '../src/content/manifests/level-manifest';

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));

const problems: string[] = [];
for (const entry of Object.values(ASSET_MANIFEST)) {
  for (const path of [entry.path, entry.dataPath]) {
    if (path !== undefined && !existsSync(join(PUBLIC_DIR, path))) {
      problems.push(`${entry.id}: missing file public/${path}`);
    }
  }
}
for (const [stageId, stage] of Object.entries(STAGES)) {
  for (const assetId of stage.assets) {
    if (!Object.hasOwn(ASSET_MANIFEST, assetId)) {
      problems.push(`stage ${stageId}: unknown asset id "${assetId}"`);
    }
  }
}

if (problems.length > 0) {
  console.error(`validate-assets: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`validate-assets: ${Object.keys(ASSET_MANIFEST).length} assets ok`);
