import { describe, expect, it } from 'vitest';
import { TUBE_RULES } from '../../configuration/stage-objects.config';
import type { Box } from '../../entities/actors/actor-body';
import {
  TubeTransition,
  findEnterableTube,
  tubeCentreX,
  type TubeOpening,
} from './tube-travel';

const TUBES: TubeOpening[] = [
  { column: 4, topRow: 10, destination: null },
  { column: 10, topRow: 11, destination: { area: 'bonus', tube: 'entry' } },
];

const ON_TOP = { grounded: true, down: true };

function standingAt(centreX: number, bottom: number): Box {
  return { x: centreX - 6, y: bottom - 14, width: 12, height: 14 };
}

describe('findEnterableTube', () => {
  it('enters a tube that leads somewhere when Pip presses down on top of it', () => {
    expect(findEnterableTube(TUBES, standingAt(176, 176), ON_TOP, 16, TUBE_RULES)).toBe(1);
  });

  it('never enters a tube that leads nowhere', () => {
    expect(findEnterableTube(TUBES, standingAt(80, 160), ON_TOP, 16, TUBE_RULES)).toBe(-1);
  });

  it('needs Pip centred over the inner part of the opening', () => {
    expect(findEnterableTube(TUBES, standingAt(164, 176), ON_TOP, 16, TUBE_RULES)).toBe(1);
    expect(findEnterableTube(TUBES, standingAt(163, 176), ON_TOP, 16, TUBE_RULES)).toBe(-1);
    expect(findEnterableTube(TUBES, standingAt(188, 176), ON_TOP, 16, TUBE_RULES)).toBe(1);
    expect(findEnterableTube(TUBES, standingAt(189, 176), ON_TOP, 16, TUBE_RULES)).toBe(-1);
  });

  it('needs Pip on the ground, on the rim, and pressing down', () => {
    const body = standingAt(176, 176);
    expect(findEnterableTube(TUBES, body, { grounded: false, down: true }, 16, TUBE_RULES)).toBe(
      -1,
    );
    expect(findEnterableTube(TUBES, body, { grounded: true, down: false }, 16, TUBE_RULES)).toBe(
      -1,
    );
    expect(findEnterableTube(TUBES, standingAt(176, 208), ON_TOP, 16, TUBE_RULES)).toBe(-1);
  });

  it('finds the middle of a tube', () => {
    expect(tubeCentreX(TUBES[1], 16)).toBe(176);
  });
});

describe('TubeTransition', () => {
  it('sinks into the tube, then waits to travel', () => {
    const transition = new TubeTransition(TUBE_RULES);
    transition.enter();
    expect(transition.depth).toBe(0);
    transition.step(TUBE_RULES.travelMs / 2);
    expect(transition.depth).toBeCloseTo(TUBE_RULES.depthPx / 2, 9);
    transition.step(TUBE_RULES.travelMs / 2);
    expect(transition.phase).toBe('travel');
    expect(transition.depth).toBe(TUBE_RULES.depthPx);
    transition.step(1000);
    expect(transition.phase).toBe('travel');
  });

  it('rises out of the destination tube and hands control back', () => {
    const transition = new TubeTransition(TUBE_RULES);
    transition.exit();
    expect(transition.depth).toBe(TUBE_RULES.depthPx);
    transition.step(TUBE_RULES.travelMs - 1);
    expect(transition.active).toBe(true);
    transition.step(1);
    expect(transition.phase).toBe('idle');
    expect(transition.depth).toBe(0);
  });
});
