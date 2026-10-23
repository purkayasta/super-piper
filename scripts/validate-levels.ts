import { STAGES } from '../src/content/manifests/level-manifest';
import { validateLevel } from '../src/game-engine/world/level-validator';

const knownStages = new Set(Object.keys(STAGES));
let levelCount = 0;
let failed = false;
for (const [stageId, stage] of Object.entries(STAGES)) {
  if (stage.level === undefined) continue;
  levelCount++;
  const errors = validateLevel(stage.level, { knownStages });
  if (stage.level.id !== stageId)
    errors.push(`level id "${stage.level.id}" does not match stage id`);
  if (errors.length === 0) continue;
  failed = true;
  console.error(`validate-levels: ${stageId}\n  ${errors.join('\n  ')}`);
}

if (failed) process.exit(1);
console.log(`validate-levels: ${levelCount} level(s) ok`);
