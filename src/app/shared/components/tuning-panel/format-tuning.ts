import type {
  JumpTier,
  MovementTuning,
} from '../../../../game-engine/configuration/movement.config';

const INDENT = '  ';

function formatTier(tier: JumpTier): string {
  const fields = Object.entries(tier).map(([key, value]) => `${key}: ${String(value)}`);
  return `${INDENT}${INDENT}{ ${fields.join(', ')} },`;
}

export function formatTuningAsConfig(tuning: MovementTuning): string {
  const lines = Object.entries(tuning).flatMap(([key, value]) =>
    key === 'jumpTiers'
      ? [`${INDENT}jumpTiers: [`, ...(value as readonly JumpTier[]).map(formatTier), `${INDENT}],`]
      : [`${INDENT}${key}: ${String(value)},`],
  );
  return ['export const DEFAULT_MOVEMENT: MovementTuning = {', ...lines, '};', ''].join('\n');
}
