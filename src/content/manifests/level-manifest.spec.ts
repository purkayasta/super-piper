import { describe, expect, it } from 'vitest';
import { sceneKeyForStage } from './level-manifest';

describe('sceneKeyForStage', () => {
  it('maps known stages to their scene keys', () => {
    expect(sceneKeyForStage('sandbox')).toBe('SandboxScene');
    expect(sceneKeyForStage('test-room')).toBe('TestRoomScene');
  });

  it('returns null for unknown or inherited keys', () => {
    expect(sceneKeyForStage('world-9')).toBeNull();
    expect(sceneKeyForStage('toString')).toBeNull();
  });
});
