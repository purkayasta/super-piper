import { describe, expect, it } from 'vitest';
import { DEFAULT_MOVEMENT } from '../../configuration/movement.config';
import { PlayerController } from './player-controller';
import { actions, contacts, simulate, simulateJump } from './player-sim.test-helpers';

const HZ = 60;
const DT = 1 / HZ;
const RATES = [60, 120, 144];
const FULL_HOLD_SECONDS = 1;
const GROUND = contacts({ onGround: true });
const AIR = contacts();

function stepMany(
  controller: PlayerController,
  steps: number,
  input = actions(),
  stepContacts = GROUND,
): void {
  for (let i = 0; i < steps; i++) controller.step(input, stepContacts, DT);
}

function runningAt(maxSpeedInput = actions({ right: true, run: true })): PlayerController {
  const controller = new PlayerController(DEFAULT_MOVEMENT);
  stepMany(controller, 3 * HZ, maxSpeedInput);
  return controller;
}

function walkOffDrop(hz: number, ledgeTime: number, fallSeconds: number): number {
  const controller = new PlayerController(DEFAULT_MOVEMENT);
  const dt = 1 / hz;
  const sampleTime = ledgeTime + fallSeconds;
  const run = actions({ right: true, run: true });
  let y = 0;
  for (let i = 0; ; i++) {
    const t = i / hz;
    const onLedge = t < ledgeTime;
    controller.step(run, contacts({ onGround: onLedge }), dt);
    if (t + dt >= sampleTime) return y + controller.bodyVy * (sampleTime - t);
    y = onLedge ? Math.min(y + controller.bodyVy * dt, 0) : y + controller.bodyVy * dt;
  }
}

describe('PlayerController', () => {
  it('walking accelerates to walk max and no further', () => {
    const controller = simulate(HZ, 3, () => actions({ right: true }));
    expect(controller.vx).toBeCloseTo(93.75, 2);
  });

  it('walk acceleration rate', () => {
    const controller = simulate(HZ, 0.5, () => actions({ right: true }));
    expect(Math.abs(controller.vx - 66.8)).toBeLessThanOrEqual(1);
  });

  it('run reaches run max', () => {
    const controller = simulate(HZ, 3, () => actions({ right: true, run: true }));
    expect(controller.vx).toBeCloseTo(153.75, 2);
  });

  it('release decelerates to rest without reversing', () => {
    const controller = runningAt(actions({ right: true }));
    expect(controller.vx).toBeCloseTo(93.75, 2);
    let restedAfter = Infinity;
    for (let i = 1; i <= HZ; i++) {
      controller.step(actions(), GROUND, DT);
      expect(controller.vx).toBeGreaterThanOrEqual(0);
      if (controller.vx === 0 && restedAfter === Infinity) restedAfter = i * DT;
    }
    expect(restedAfter).toBeLessThanOrEqual(0.53);
  });

  it('reversing on ground skids', () => {
    const controller = runningAt();
    expect(controller.facing).toBe(1);
    let skidSteps = 0;
    for (let i = 0; i < HZ; i++) {
      controller.step(actions({ left: true }), GROUND, DT);
      if (controller.vx > 0) {
        expect(controller.mode).toBe('skid');
        expect(controller.facing).toBe(1);
        skidSteps++;
      }
      if (controller.vx < 0) {
        expect(controller.mode).toBe('ground');
        expect(controller.facing).toBe(-1);
      }
    }
    expect(skidSteps).toBeGreaterThan(0);
    expect(controller.vx).toBeLessThan(0);
  });

  it('both directions held behaves as released', () => {
    const released = runningAt(actions({ right: true }));
    const both = runningAt(actions({ right: true }));
    for (let i = 0; i < 20; i++) {
      released.step(actions(), GROUND, DT);
      both.step(actions({ left: true, right: true }), GROUND, DT);
      expect(both.vx).toBe(released.vx);
      expect(both.mode).toBe(released.mode);
      expect(both.facing).toBe(released.facing);
    }
  });

  it('standing full jump apex is 64px', () => {
    const { apex } = simulateJump(HZ, {
      runUpSeconds: 0,
      run: false,
      holdJumpSeconds: FULL_HOLD_SECONDS,
    });
    expect(Math.abs(apex - 64)).toBeLessThanOrEqual(1);
  });

  it('walking jump apex is 68.3px', () => {
    const { apex } = simulateJump(HZ, {
      runUpSeconds: 3,
      run: false,
      holdJumpSeconds: FULL_HOLD_SECONDS,
    });
    expect(Math.abs(apex - 68.3)).toBeLessThanOrEqual(1);
  });

  it('running jump apex is 80px', () => {
    const { apex } = simulateJump(HZ, {
      runUpSeconds: 3,
      run: true,
      holdJumpSeconds: FULL_HOLD_SECONDS,
    });
    expect(Math.abs(apex - 80)).toBeLessThanOrEqual(1);
  });

  it('tap jump is short', () => {
    const { apex } = simulateJump(HZ, { runUpSeconds: 0, run: false, holdJumpSeconds: DT });
    expect(apex).toBeGreaterThanOrEqual(14);
    expect(apex).toBeLessThanOrEqual(24);
  });

  it('jump apex and distance match across 60, 120 and 144Hz within 1px', () => {
    const jumps = [
      { runUpSeconds: 0, run: false, holdJumpSeconds: FULL_HOLD_SECONDS },
      { runUpSeconds: 3, run: true, holdJumpSeconds: FULL_HOLD_SECONDS },
    ];
    for (const jump of jumps) {
      const results = RATES.map((hz) => simulateJump(hz, jump));
      const apexes = results.map((result) => result.apex);
      const distances = results.map((result) => result.distance);
      expect(Math.max(...apexes) - Math.min(...apexes)).toBeLessThanOrEqual(1);
      expect(Math.max(...distances) - Math.min(...distances)).toBeLessThanOrEqual(1);
    }
  });

  it('walk-off fall matches across 60, 120 and 144Hz within 1px', () => {
    const drops = RATES.map((hz) => walkOffDrop(hz, 3, 0.3));
    expect(Math.min(...drops)).toBeGreaterThan(0);
    expect(Math.max(...drops) - Math.min(...drops)).toBeLessThanOrEqual(1);
  });

  it('grounded steps keep true vy at rest while probing down', () => {
    const controller = runningAt();
    expect(controller.vy).toBe(0);
    expect(controller.bodyVy).toBeGreaterThan(0);
  });

  it('air control uses airAccel', () => {
    const controller = new PlayerController({ ...DEFAULT_MOVEMENT, airAccel: 0 });
    stepMany(controller, HZ, actions({ right: true }), AIR);
    expect(controller.vx).toBe(0);
  });

  it('falls no faster than max fall speed', () => {
    const controller = new PlayerController(DEFAULT_MOVEMENT);
    for (let i = 0; i < 3 * HZ; i++) {
      controller.step(actions(), AIR, DT);
      expect(controller.vy).toBeLessThanOrEqual(270);
      expect(controller.bodyVy).toBeLessThanOrEqual(270);
    }
    expect(controller.vy).toBe(270);
  });

  const launchTolerance = (hz: number) => (2 * DEFAULT_MOVEMENT.jumpTiers[0].holdGravity) / hz;

  it.each(RATES)('coyote time at %iHz', (hz) => {
    const contactEnds = 0.5;
    const pressAfterContactEnds = (pressDelay: number) =>
      simulate(
        hz,
        contactEnds + pressDelay + 2 / hz,
        (t) => actions({ jump: t >= contactEnds + pressDelay }),
        (t) => contacts({ onGround: t < contactEnds }),
      );
    expect(Math.abs(pressAfterContactEnds(0.09).vy + 240)).toBeLessThanOrEqual(launchTolerance(hz));
    expect(pressAfterContactEnds(0.11).vy).toBeGreaterThan(0);
  });

  it.each([120, 144])('jump buffer at %iHz', (hz) => {
    const landing = 1;
    const pressBeforeLanding = (pressLead: number) =>
      simulate(
        hz,
        landing + 1 / hz,
        (t) => actions({ jump: t >= landing - pressLead }),
        (t) => contacts({ onGround: t >= landing }),
      );
    expect(Math.abs(pressBeforeLanding(0.09).vy + 240)).toBeLessThanOrEqual(launchTolerance(hz));
    expect(pressBeforeLanding(0.11).vy).toBeGreaterThanOrEqual(0);
  });

  it('jump buffer at 60Hz uses step-aligned presses', () => {
    const landingStep = 60;
    const buffered = (leadSteps: number) =>
      simulate(
        HZ,
        (landingStep + 1) / HZ,
        (t) => actions({ jump: Math.round(t * HZ) >= landingStep - leadSteps }),
        (t) => contacts({ onGround: Math.round(t * HZ) >= landingStep }),
      );
    expect(buffered(5).vy).toBeLessThan(0);
    expect(buffered(6).vy).toBeLessThan(0);
    expect(buffered(7).vy).toBeGreaterThanOrEqual(0);
  });

  it('holding jump through landing does not re-jump', () => {
    const controller = new PlayerController(DEFAULT_MOVEMENT);
    let y = 0;
    let landed = false;
    for (let i = 0; i < 3 * HZ; i++) {
      controller.step(
        actions({ jump: true }),
        contacts({ onGround: y >= 0 && controller.vy >= 0 }),
        DT,
      );
      y = Math.min(y + controller.bodyVy * DT, 0);
      if (i > 0 && y === 0) landed = true;
      if (landed) expect(controller.vy).toBeGreaterThanOrEqual(0);
    }
    expect(landed).toBe(true);
  });

  it('facing does not flip in the air', () => {
    const controller = runningAt(actions({ right: true }));
    controller.step(actions({ right: true, jump: true }), GROUND, DT);
    for (let i = 0; i < HZ; i++) {
      controller.step(actions({ left: true, jump: true }), AIR, DT);
      expect(controller.mode).toBe('air');
      expect(controller.facing).toBe(1);
    }
    expect(controller.vx).toBeLessThan(0);
  });

  it('air speed is capped by takeoff speed', () => {
    const controller = runningAt(actions({ right: true }));
    controller.step(actions({ right: true, jump: true }), GROUND, DT);
    for (let i = 0; i < HZ; i++) {
      controller.step(actions({ right: true, run: true, jump: true }), AIR, DT);
      expect(Math.abs(controller.vx)).toBeLessThanOrEqual(93.75);
    }
  });

  it('wall contact zeroes horizontal speed', () => {
    const controller = runningAt(actions({ right: true }));
    controller.step(actions({ right: true }), contacts({ onGround: true, hitWallRight: true }), DT);
    expect(controller.vx).toBe(0);
    expect(controller.bodyVx).toBe(0);
  });

  it('clamps oversized dt', () => {
    const controller = new PlayerController(DEFAULT_MOVEMENT);
    controller.step(actions({ right: true }), GROUND, 0.5);
    expect(Math.abs(controller.vx)).toBeLessThanOrEqual(DEFAULT_MOVEMENT.walkAccel / 30 + 1e-9);
  });

  it('setTuning replaces the tuning used by later steps', () => {
    const controller = new PlayerController(DEFAULT_MOVEMENT);
    controller.setTuning({ ...DEFAULT_MOVEMENT, walkMaxSpeed: 50 });
    stepMany(controller, 3 * HZ, actions({ right: true }));
    expect(controller.vx).toBeCloseTo(50, 5);
  });

  it('reset returns to a standing start that matches a fresh controller', () => {
    const used = runningAt();
    used.step(actions({ jump: true, left: true }), GROUND, DT);
    stepMany(used, 10, actions({ jump: true, left: true }), AIR);
    used.reset();
    const fresh = new PlayerController(DEFAULT_MOVEMENT);
    const input = actions({ right: true, jump: true });
    for (let i = 0; i < 30; i++) {
      used.step(input, i === 0 ? GROUND : AIR, DT);
      fresh.step(input, i === 0 ? GROUND : AIR, DT);
      expect(used.bodyVx).toBe(fresh.bodyVx);
      expect(used.bodyVy).toBe(fresh.bodyVy);
    }
    expect(used.facing).toBe(fresh.facing);
  });

  it('reset needs a fresh jump press, so holding jump through a respawn does not jump', () => {
    const controller = new PlayerController(DEFAULT_MOVEMENT);
    controller.reset();
    const holding = actions({ jump: true });
    stepMany(controller, 5, holding);
    expect(controller.vy).toBe(0);
    controller.step(actions(), GROUND, DT);
    controller.step(holding, GROUND, DT);
    expect(controller.vy).toBeLessThan(0);
  });

  it('a fresh controller needs a fresh jump press when jump is already held', () => {
    const controller = new PlayerController(DEFAULT_MOVEMENT);
    stepMany(controller, 5, actions({ jump: true }));
    expect(controller.vy).toBe(0);
  });
});
