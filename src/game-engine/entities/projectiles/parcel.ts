import type { ParcelTuning } from '../../configuration/actors.config';
import {
  applyGravity,
  createBody,
  moveThroughTiles,
  placeBody,
  type ActorBody,
  type SolidQuery,
} from '../actors/actor-body';

export type ParcelOutcome = 'flying' | 'burst' | 'gone';

export interface ParcelWorld {
  readonly isSolid: SolidQuery;
  readonly tileSize: number;
  readonly levelHeightPx: number;
}

const MS_PER_SECOND = 1000;

export class Parcel {
  readonly body: ActorBody;
  active = false;
  facing: 1 | -1 = 1;
  animMs = 0;

  constructor(private readonly tuning: ParcelTuning) {
    this.body = createBody(tuning.bodySize, tuning.bodySize);
  }

  launch(centerX: number, centerY: number, facing: 1 | -1): void {
    this.active = true;
    this.facing = facing;
    this.animMs = 0;
    placeBody(this.body, centerX, centerY + this.body.height / 2);
    this.body.vy = this.tuning.launchFallSpeed;
  }

  free(): void {
    this.active = false;
  }

  step(dt: number, world: ParcelWorld): ParcelOutcome {
    if (!this.active) return 'gone';
    this.animMs += dt * MS_PER_SECOND;
    const tuning = this.tuning;
    const body = this.body;
    body.vx = this.facing * tuning.speed;
    const dy = applyGravity(body, tuning.gravity, tuning.maxFallSpeed, dt);
    moveThroughTiles(body, body.vx * dt, dy, world.tileSize, world.isSolid);
    if (body.hitLeft || body.hitRight) return 'burst';
    if (body.onGround) body.vy = -tuning.bounceSpeed;
    if (body.y > world.levelHeightPx) return 'gone';
    return 'flying';
  }
}
