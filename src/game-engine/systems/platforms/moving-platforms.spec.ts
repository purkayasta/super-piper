import { describe, expect, it } from 'vitest';
import { DEFAULT_MOVEMENT } from '../../configuration/movement.config';
import { PLATFORM_RULES } from '../../configuration/stage-objects.config';
import type { Box } from '../../entities/actors/actor-body';
import { PlayerController } from '../../entities/player/player-controller';
import { actions, contacts } from '../../entities/player/player-sim.test-helpers';
import type { ActionState } from '../input/actions';
import type { CompiledPlatform } from '../../world/level-format';
import { MovingPlatforms, PlatformRider, platformTravelFraction } from './moving-platforms';

const RATES = [60, 120, 144];
const BODY = { width: 12, height: 14 };
const NO_TILES = (): boolean => false;

const SHUTTLE: CompiledPlatform = {
  x: 96,
  y: 160,
  width: 48,
  travelX: 64,
  travelY: 0,
  periodSeconds: 3,
  phase: 0,
};

const LIFT: CompiledPlatform = { ...SHUTTLE, travelX: 0, travelY: -80, periodSeconds: 2.5 };

const STILL: CompiledPlatform = { ...SHUTTLE, travelX: 0, periodSeconds: 1 };

interface RideSample {
  readonly t: number;
  readonly box: Box;
  readonly riding: number;
  readonly platformX: number;
  readonly platformY: number;
}

interface RideOptions {
  readonly hz: number;
  readonly seconds: number;
  readonly spec: CompiledPlatform;
  readonly startX: number;
  readonly startBottom: number;
  readonly groundY?: number;
  readonly actionsAt?: (t: number) => ActionState;
}

function ride(options: RideOptions): RideSample[] {
  const { hz, seconds, spec, startX, startBottom } = options;
  const groundY = options.groundY ?? Infinity;
  const platforms = new MovingPlatforms([spec], PLATFORM_RULES.thicknessPx);
  const rider = new PlatformRider(platforms, NO_TILES, 16, PLATFORM_RULES.landingSlackPx);
  const controller = new PlayerController(DEFAULT_MOVEMENT);
  const box: Box = { x: startX, y: startBottom - BODY.height, ...BODY };
  const dt = 1 / hz;
  const samples: RideSample[] = [];
  const steps = Math.round(seconds * hz);
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / hz;
    const prevBottom = box.y + box.height;
    box.x += controller.bodyVx * dt;
    box.y += controller.bodyVy * dt;
    let onTile = false;
    if (box.y + box.height >= groundY) {
      box.y = groundY - box.height;
      onTile = true;
    }
    platforms.step(dt);
    const onPlatform = rider.resolve(box, prevBottom, controller.vy);
    const input = options.actionsAt?.(t) ?? actions();
    controller.step(input, contacts({ onGround: onTile || onPlatform }), dt);
    samples.push({
      t,
      box: { ...box },
      riding: rider.ridingIndex,
      platformX: platforms.x[0],
      platformY: platforms.y[0],
    });
  }
  return samples;
}

describe('MovingPlatforms', () => {
  it('eases back and forth along its path, starting at the phase', () => {
    expect(platformTravelFraction(0, 4, 0)).toBeCloseTo(0, 9);
    expect(platformTravelFraction(2, 4, 0)).toBeCloseTo(1, 9);
    expect(platformTravelFraction(1, 4, 0)).toBeCloseTo(0.5, 9);
    expect(platformTravelFraction(0, 4, 0.5)).toBeCloseTo(1, 9);
  });

  it('is a function of step time, so every rate puts it in the same place', () => {
    const positions = RATES.map((hz) => {
      const platforms = new MovingPlatforms([SHUTTLE], 8);
      for (let i = 0; i < 1.75 * hz; i++) platforms.step(1 / hz);
      return platforms.x[0];
    });
    for (const x of positions) expect(x).toBeCloseTo(positions[0], 9);
  });

  it('remembers where each platform was before the step', () => {
    const platforms = new MovingPlatforms([SHUTTLE], 8);
    platforms.step(0.5);
    const before = platforms.x[0];
    platforms.step(0.1);
    expect(platforms.prevX[0]).toBe(before);
    expect(platforms.x[0]).toBeGreaterThan(before);
  });
});

describe('PlatformRider', () => {
  it('carries a standing Pip with the platform at 60, 120 and 144Hz', () => {
    const finals = RATES.map((hz) => {
      const samples = ride({ hz, seconds: 3, spec: SHUTTLE, startX: 110, startBottom: 160 });
      for (const sample of samples) {
        expect(sample.riding).toBe(0);
        expect(sample.box.y + sample.box.height).toBeCloseTo(sample.platformY, 9);
        expect(sample.box.x - sample.platformX).toBeCloseTo(14, 9);
      }
      return samples.at(-1)!.box.x;
    });
    for (const x of finals) expect(Math.abs(x - finals[0])).toBeLessThanOrEqual(1);
  });

  it('keeps Pip on a lift going up and down', () => {
    for (const hz of RATES) {
      const samples = ride({ hz, seconds: 5, spec: LIFT, startX: 110, startBottom: 160 });
      for (const sample of samples) {
        expect(sample.riding).toBe(0);
        expect(sample.box.y + sample.box.height).toBeCloseTo(sample.platformY, 9);
      }
    }
  });

  it('lands a jump from a moving platform in the same place at every rate', () => {
    const jumpAt = (t: number) => actions({ jump: t >= 1 && t < 1.3 });
    const landings = RATES.map((hz) => {
      const samples = ride({
        hz,
        seconds: 2.4,
        spec: SHUTTLE,
        startX: 110,
        startBottom: 160,
        actionsAt: jumpAt,
      });
      expect(samples.some((sample) => sample.riding === -1)).toBe(true);
      const last = samples.at(-1)!;
      expect(last.riding).toBe(0);
      return last.box.x - last.platformX;
    });
    for (const offset of landings) expect(Math.abs(offset - landings[0])).toBeLessThanOrEqual(1);
    expect(Math.abs(landings[0] - 14)).toBeGreaterThan(4);
  });

  it('lands Pip on a rising platform without letting him fall through', () => {
    for (const hz of [60, 144]) {
      const samples = ride({
        hz,
        seconds: 2,
        spec: { ...LIFT, y: 200, phase: 0 },
        startX: 110,
        startBottom: 120,
      });
      const last = samples.at(-1)!;
      expect(last.riding).toBe(0);
      expect(last.box.y + last.box.height).toBeCloseTo(last.platformY, 9);
    }
  });

  it('lets Pip jump up through a platform and land on top of it', () => {
    for (const hz of RATES) {
      const samples = ride({
        hz,
        seconds: 1.6,
        spec: { ...STILL, y: 176 },
        startX: 110,
        startBottom: 224,
        groundY: 224,
        actionsAt: (t) => actions({ jump: t >= 0.1 && t < 0.5 }),
      });
      const inside = samples.find(
        (sample) => sample.box.y + sample.box.height > 176 && sample.box.y < 184,
      );
      expect(inside?.riding).toBe(-1);
      const last = samples.at(-1)!;
      expect(last.riding).toBe(0);
      expect(last.box.y + last.box.height).toBeCloseTo(176, 9);
    }
  });

  it('drops Pip when he walks off the end', () => {
    const samples = ride({
      hz: 60,
      seconds: 2,
      spec: STILL,
      startX: 110,
      startBottom: 160,
      actionsAt: () => actions({ right: true }),
    });
    expect(samples.at(-1)!.riding).toBe(-1);
    expect(samples.at(-1)!.box.y).toBeGreaterThan(160);
  });

  it('snaps Pip to a whole-pixel offset when he lands, so he never shimmers on it', () => {
    const samples = ride({
      hz: 144,
      seconds: 1.5,
      spec: { ...SHUTTLE, periodSeconds: 2.3 },
      startX: 110.37,
      startBottom: 120,
    });
    const landed = samples.find((sample) => sample.riding === 0)!;
    const offset = landed.box.x - landed.platformX;
    expect(Math.abs(offset - Math.round(offset))).toBeLessThan(1e-9);
  });

  it('does not carry Pip into a wall', () => {
    const platforms = new MovingPlatforms([SHUTTLE], 8);
    const wallAt = (column: number): boolean => column === 8;
    const rider = new PlatformRider(platforms, wallAt, 16, 2);
    const box: Box = { x: 116, y: 146, ...BODY };
    expect(rider.resolve(box, 160, 0)).toBe(true);
    platforms.step(0.05);
    rider.resolve(box, 160, 0);
    expect(box.x).toBe(116);
    expect(platforms.x[0]).toBeGreaterThan(platforms.prevX[0]);
  });
});
