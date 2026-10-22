import {
  DEFAULT_MOVEMENT,
  type MovementTuning,
} from '../../../../game-engine/configuration/movement.config';
import { formatTuningAsConfig } from './format-tuning';

function evaluateLiteral(source: string): MovementTuning {
  const start = source.indexOf('= {') + 2;
  const end = source.lastIndexOf('};') + 1;
  return new Function(`return ${source.slice(start, end)}`)() as MovementTuning;
}

describe('formatTuningAsConfig', () => {
  it('writes a paste-ready export with exact numbers', () => {
    const source = formatTuningAsConfig(DEFAULT_MOVEMENT);
    expect(source.startsWith('export const DEFAULT_MOVEMENT: MovementTuning = {')).toBe(true);
    expect(source.trimEnd().endsWith('};')).toBe(true);
    expect(source).toContain('walkMaxSpeed: 93.75,');
    expect(source).toContain('launchSpeed: 300,');
  });

  it('round-trips the default object', () => {
    expect(evaluateLiteral(formatTuningAsConfig(DEFAULT_MOVEMENT))).toEqual(DEFAULT_MOVEMENT);
  });

  it('round-trips awkward fractions without rounding', () => {
    const tuning = { ...DEFAULT_MOVEMENT, walkMaxSpeed: 1 / 3, maxStepSeconds: 0.1 + 0.2 };
    expect(evaluateLiteral(formatTuningAsConfig(tuning))).toEqual(tuning);
  });

  it('keeps the field order of DEFAULT_MOVEMENT', () => {
    const source = formatTuningAsConfig(DEFAULT_MOVEMENT);
    const positions = Object.keys(DEFAULT_MOVEMENT).map((key) => source.indexOf(`${key}:`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
