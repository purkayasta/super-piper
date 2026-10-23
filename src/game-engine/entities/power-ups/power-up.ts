import type { PowerUpTuning } from '../../configuration/actors.config';
import {
  applyGravity,
  createBody,
  moveThroughTiles,
  placeBody,
  type ActorBody,
  type SolidQuery,
} from '../actors/actor-body';

export type PowerUpKind = 'parcel-box' | 'spark-stamp' | 'rush-star' | 'green-stamp';

export type PowerUpMode = 'inactive' | 'emerging' | 'moving';

export interface PowerUpWorld {
  readonly isSolid: SolidQuery;
  readonly tileSize: number;
  readonly levelHeightPx: number;
}

const MS_PER_SECOND = 1000;

export class PowerUp {
  readonly body: ActorBody;
  kind: PowerUpKind = 'parcel-box';
  mode: PowerUpMode = 'inactive';
  facing: 1 | -1 = 1;
  modeMs = 0;
  animMs = 0;
  private emergeFromY = 0;

  constructor(private readonly tuning: PowerUpTuning) {
    this.body = createBody(tuning.bodySize, tuning.bodySize);
  }

  get active(): boolean {
    return this.mode !== 'inactive';
  }

  get emerging(): boolean {
    return this.mode === 'emerging';
  }

  release(kind: PowerUpKind, column: number, row: number, tileSize: number): void {
    this.kind = kind;
    this.facing = 1;
    this.modeMs = 0;
    this.animMs = 0;
    this.mode = 'emerging';
    placeBody(this.body, (column + 0.5) * tileSize, (row + 1) * tileSize);
    this.emergeFromY = this.body.y;
  }

  free(): void {
    this.mode = 'inactive';
  }

  hop(direction: 1 | -1): void {
    if (this.mode !== 'moving' || this.kind === 'spark-stamp') return;
    this.facing = direction;
    this.body.vy = -this.tuning.bumpHopSpeed;
  }

  step(dt: number, world: PowerUpWorld): void {
    const elapsedMs = dt * MS_PER_SECOND;
    this.modeMs += elapsedMs;
    this.animMs += elapsedMs;
    if (this.mode === 'emerging') this.emerge();
    else if (this.mode === 'moving') this.move(dt, world);
  }

  private emerge(): void {
    const tuning = this.tuning;
    const progress = Math.min(1, this.modeMs / tuning.emergeMs);
    this.body.y = this.emergeFromY - tuning.emergePx * progress;
    if (progress < 1) return;
    this.mode = 'moving';
    this.modeMs = 0;
    this.body.vx = 0;
    this.body.vy = 0;
  }

  private move(dt: number, world: PowerUpWorld): void {
    const tuning = this.tuning;
    const body = this.body;
    const star = this.kind === 'rush-star';
    body.vx = this.facing * this.speed();
    const gravity = star ? tuning.starGravity : tuning.gravity;
    const dy = applyGravity(body, gravity, tuning.maxFallSpeed, dt);
    moveThroughTiles(body, body.vx * dt, dy, world.tileSize, world.isSolid);
    if (body.hitLeft) this.facing = 1;
    else if (body.hitRight) this.facing = -1;
    if (star && body.onGround) body.vy = -tuning.starBounceSpeed;
    if (body.y > world.levelHeightPx) this.free();
  }

  private speed(): number {
    switch (this.kind) {
      case 'spark-stamp':
        return 0;
      case 'rush-star':
        return this.tuning.starSpeed;
      default:
        return this.tuning.slideSpeed;
    }
  }
}
