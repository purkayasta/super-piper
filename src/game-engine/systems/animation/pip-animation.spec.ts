import { describe, expect, it } from 'vitest';
import { DEFAULT_MOVEMENT } from '../../configuration/movement.config';
import { poseAnimation, selectPipAnimation, strideFrameRate } from './pip-animation';

describe('selectPipAnimation', () => {
  it('idles when standing still on the ground', () => {
    expect(selectPipAnimation('ground', 0, 0, DEFAULT_MOVEMENT)).toBe('idle');
    expect(selectPipAnimation('ground', 0.5, 0, DEFAULT_MOVEMENT)).toBe('idle');
  });

  it('walks at walking speeds and runs well past walk max', () => {
    expect(selectPipAnimation('ground', -60, 0, DEFAULT_MOVEMENT)).toBe('walk');
    expect(selectPipAnimation('ground', 93.75, 0, DEFAULT_MOVEMENT)).toBe('walk');
    expect(selectPipAnimation('ground', 150, 0, DEFAULT_MOVEMENT)).toBe('run');
  });

  it('skids whenever the controller is skidding', () => {
    expect(selectPipAnimation('skid', 120, 0, DEFAULT_MOVEMENT)).toBe('skid');
  });

  it('jumps while rising and falls while descending', () => {
    expect(selectPipAnimation('air', 80, -200, DEFAULT_MOVEMENT)).toBe('jump');
    expect(selectPipAnimation('air', 80, 10, DEFAULT_MOVEMENT)).toBe('fall');
  });
});

describe('strideFrameRate', () => {
  it('speeds the stride up with ground speed', () => {
    const slow = strideFrameRate(20, DEFAULT_MOVEMENT);
    const walk = strideFrameRate(DEFAULT_MOVEMENT.walkMaxSpeed, DEFAULT_MOVEMENT);
    const run = strideFrameRate(DEFAULT_MOVEMENT.runMaxSpeed, DEFAULT_MOVEMENT);
    expect(slow).toBeLessThan(walk);
    expect(walk).toBeLessThan(run);
    expect(walk).toBe(9);
    expect(run).toBe(15);
  });

  it('caps the rate above run max', () => {
    expect(strideFrameRate(400, DEFAULT_MOVEMENT)).toBe(15);
  });
});

describe('poseAnimation', () => {
  it('keeps small Pip on the base animation', () => {
    expect(poseAnimation('walk', 'small', true, true)).toBe('walk');
  });

  it('crouches before throwing, and throws over the base pose', () => {
    expect(poseAnimation('idle', 'big', true, true)).toBe('crouch');
    expect(poseAnimation('jump', 'spark', false, true)).toBe('throw');
    expect(poseAnimation('run', 'spark', false, false)).toBe('run');
  });
});
