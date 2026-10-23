import { describe, expect, it } from 'vitest';
import { GOAL_SEQUENCE } from '../../configuration/effects.config';
import { GoalSequence, type GoalLayout } from './goal-sequence';

const LAYOUT: GoalLayout = {
  poleX: 3096,
  slideBottomY: 184,
  groundY: 200,
  doorX: 3224,
  flagTopY: 60,
  flagBottomY: 176,
};
const DT = 1 / 60;

function runUntil(sequence: GoalSequence, phase: string, limit = 2000): number {
  let steps = 0;
  while (sequence.phase !== phase && steps < limit) {
    sequence.step(DT);
    steps++;
  }
  return steps;
}

describe('GoalSequence', () => {
  it('is inactive until started', () => {
    const sequence = new GoalSequence(GOAL_SEQUENCE);
    sequence.step(DT);
    expect(sequence.phase).toBe('inactive');
    expect(sequence.active).toBe(false);
  });

  it('grabs the pole beside it and slides from the grab height', () => {
    const sequence = new GoalSequence(GOAL_SEQUENCE);
    sequence.start(90, LAYOUT);
    expect(sequence.phase).toBe('slide');
    expect(sequence.x).toBe(LAYOUT.poleX - GOAL_SEQUENCE.poleGrabOffsetPx);
    expect(sequence.y).toBe(90);
    expect(sequence.grabY).toBe(90);
    sequence.step(0.1);
    expect(sequence.y).toBeCloseTo(105);
  });

  it('never starts below the base of the pole', () => {
    const sequence = new GoalSequence(GOAL_SEQUENCE);
    sequence.start(400, LAYOUT);
    expect(sequence.y).toBe(LAYOUT.slideBottomY);
  });

  it('waits for the flag to reach the bottom before hopping off', () => {
    const sequence = new GoalSequence(GOAL_SEQUENCE);
    sequence.start(LAYOUT.slideBottomY, LAYOUT);
    sequence.step(DT);
    expect(sequence.phase).toBe('slide');
    runUntil(sequence, 'hop');
    expect(sequence.flagY).toBe(LAYOUT.flagBottomY);
  });

  it('hops down to the ground beyond the pole, then walks to the door', () => {
    const sequence = new GoalSequence(GOAL_SEQUENCE);
    sequence.start(100, LAYOUT);
    runUntil(sequence, 'walk');
    expect(sequence.y).toBeCloseTo(LAYOUT.groundY);
    expect(sequence.x).toBeCloseTo(LAYOUT.poleX + GOAL_SEQUENCE.landingOffsetPx);
    runUntil(sequence, 'done');
    expect(sequence.x).toBe(LAYOUT.doorX);
    expect(sequence.active).toBe(false);
  });

  it('finishes after the hop when the door is right beside the pole', () => {
    const sequence = new GoalSequence(GOAL_SEQUENCE);
    sequence.start(100, { ...LAYOUT, doorX: LAYOUT.poleX });
    runUntil(sequence, 'done');
    expect(sequence.phase).toBe('done');
  });
});
