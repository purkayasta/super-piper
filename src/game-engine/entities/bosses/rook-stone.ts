import type { RookStoneTuning } from '../../configuration/boss.config';
import {
  applyGravity,
  createBody,
  moveThroughTiles,
  placeBody,
  type ActorBody,
} from '../actors/actor-body';
import type { RookWorld } from './rook-king';

export type StoneOutcome = 'flying' | 'burst' | 'gone';

const MS_PER_SECOND = 1000;
const UNCAPPED_FALL = 1e6;

export function stoneLaunch(
  fromX: number,
  targetX: number,
  tuning: RookStoneTuning,
): { readonly vx: number; readonly vy: number } {
  const flight = tuning.flightSeconds;
  const vx = Math.max(-tuning.maxSpeedX, Math.min(tuning.maxSpeedX, (targetX - fromX) / flight));
  return { vx, vy: (-tuning.gravity * flight) / 2 };
}

export class RookStone {
  readonly body: ActorBody;
  active = false;
  animMs = 0;

  constructor(private readonly tuning: RookStoneTuning) {
    this.body = createBody(tuning.size, tuning.size);
  }

  launch(centerX: number, centerY: number, targetX: number): void {
    const { vx, vy } = stoneLaunch(centerX, targetX, this.tuning);
    placeBody(this.body, centerX, centerY + this.body.height / 2);
    this.body.vx = vx;
    this.body.vy = vy;
    this.animMs = 0;
    this.active = true;
  }

  free(): void {
    this.active = false;
  }

  step(dt: number, world: RookWorld): StoneOutcome {
    if (!this.active) return 'gone';
    this.animMs += dt * MS_PER_SECOND;
    const body = this.body;
    const dy = applyGravity(body, this.tuning.gravity, UNCAPPED_FALL, dt);
    moveThroughTiles(body, body.vx * dt, dy, world.tileSize, world.isSolid);
    if (body.onGround || body.hitLeft || body.hitRight || body.hitCeiling) return 'burst';
    if (body.y > world.levelHeightPx) return 'gone';
    return 'flying';
  }
}
