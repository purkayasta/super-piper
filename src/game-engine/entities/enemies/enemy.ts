import type { EnemyTuning } from '../../configuration/actors.config';
import type { EnemyKind } from '../../world/level-format';
import {
  applyGravity,
  boxCenterX,
  createBody,
  moveThroughTiles,
  placeBody,
  type ActorBody,
  type SolidQuery,
} from '../actors/actor-body';

export type EnemyMode =
  'inactive' | 'walk' | 'fly' | 'shell' | 'shell-moving' | 'squashed' | 'knocked' | 'plant';

export type PlantPhase = 'hidden' | 'rising' | 'out' | 'sinking';

export type StompResult = 'squashed' | 'shelled' | 'clipped' | 'stopped';

export interface EnemyWorld {
  readonly isSolid: SolidQuery;
  readonly tileSize: number;
  readonly levelHeightPx: number;
}

const MS_PER_SECOND = 1000;
const TWO_PI = Math.PI * 2;

export class Enemy {
  readonly body: ActorBody;
  kind: EnemyKind = 'thornbug';
  mode: EnemyMode = 'inactive';
  facing: 1 | -1 = -1;
  modeMs = 0;
  animMs = 0;
  chainIndex = 0;
  pipGraceMs = 0;
  plantPhase: PlantPhase = 'hidden';
  plantRise = 0;
  private anchorY = 0;
  private bobMs = 0;
  private plantBaseY = 0;

  constructor(private readonly tuning: EnemyTuning) {
    this.body = createBody(tuning.bodyWidth, tuning.bodyHeight);
  }

  get active(): boolean {
    return this.mode !== 'inactive';
  }

  get alive(): boolean {
    return (
      this.mode === 'walk' ||
      this.mode === 'fly' ||
      this.mode === 'shell' ||
      this.mode === 'shell-moving' ||
      this.mode === 'plant'
    );
  }

  get exposed(): boolean {
    return this.mode !== 'plant' || this.plantRise > this.tuning.plantHarmfulRisePx;
  }

  get centerX(): number {
    return boxCenterX(this.body);
  }

  spawn(kind: EnemyKind, column: number, row: number, tileSize: number): void {
    const tuning = this.tuning;
    this.kind = kind;
    this.facing = -1;
    this.modeMs = 0;
    this.animMs = 0;
    this.chainIndex = 0;
    this.pipGraceMs = 0;
    this.bobMs = 0;
    const body = this.body;
    if (kind === 'snapvine') {
      body.width = tuning.plantBodyWidth;
      body.height = 0;
      this.plantBaseY = row * tileSize;
      placeBody(body, (column + 1) * tileSize, this.plantBaseY);
      this.plantPhase = 'hidden';
      this.plantRise = 0;
      this.mode = 'plant';
      return;
    }
    body.width = tuning.bodyWidth;
    body.height = tuning.bodyHeight;
    placeBody(body, (column + 0.5) * tileSize, (row + 1) * tileSize);
    this.anchorY = body.y;
    this.mode = kind === 'flapjack' ? 'fly' : 'walk';
  }

  free(): void {
    this.mode = 'inactive';
  }

  step(dt: number, world: EnemyWorld, pipCenterX: number): void {
    const elapsedMs = dt * MS_PER_SECOND;
    this.modeMs += elapsedMs;
    this.animMs += elapsedMs;
    this.pipGraceMs = Math.max(0, this.pipGraceMs - elapsedMs);
    switch (this.mode) {
      case 'walk':
        this.travel(this.tuning.walkSpeed, dt, world);
        break;
      case 'shell-moving':
        this.travel(this.tuning.shellSpeed, dt, world);
        break;
      case 'shell':
        this.travel(0, dt, world);
        if (this.modeMs >= this.tuning.shellReviveMs) this.revive(pipCenterX);
        break;
      case 'fly':
        this.fly(dt, world);
        break;
      case 'squashed':
        if (this.modeMs >= this.tuning.squashedMs) this.free();
        break;
      case 'knocked':
        this.tumble(dt, world);
        break;
      case 'plant':
        this.stepPlant(elapsedMs, pipCenterX);
        break;
      case 'inactive':
        break;
    }
  }

  stomp(): StompResult {
    if (this.mode === 'fly') {
      this.enterMode('walk');
      this.body.vy = 0;
      return 'clipped';
    }
    if (this.mode === 'shell-moving') {
      this.enterMode('shell');
      this.pipGraceMs = this.tuning.pipGraceMs;
      return 'stopped';
    }
    if (this.kind === 'shellback') {
      this.enterMode('shell');
      this.pipGraceMs = this.tuning.pipGraceMs;
      return 'shelled';
    }
    this.enterMode('squashed');
    return 'squashed';
  }

  kick(direction: 1 | -1, chainStart: number): void {
    this.enterMode('shell-moving');
    this.facing = direction;
    this.chainIndex = chainStart;
    this.pipGraceMs = this.tuning.pipGraceMs;
  }

  knockOut(direction: 1 | -1): void {
    this.enterMode('knocked');
    this.facing = direction;
    this.body.vx = direction * this.tuning.knockSpeedX;
    this.body.vy = -this.tuning.knockLaunchSpeed;
  }

  turnToward(direction: 1 | -1): void {
    if (this.mode === 'walk' || this.mode === 'fly') this.facing = direction;
  }

  private enterMode(mode: EnemyMode): void {
    this.mode = mode;
    this.modeMs = 0;
  }

  private travel(speed: number, dt: number, world: EnemyWorld): void {
    const body = this.body;
    body.vx = this.facing * speed;
    const dy = applyGravity(body, this.tuning.gravity, this.tuning.maxFallSpeed, dt);
    moveThroughTiles(body, body.vx * dt, dy, world.tileSize, world.isSolid);
    if (body.hitLeft) this.facing = 1;
    else if (body.hitRight) this.facing = -1;
    if (body.y > world.levelHeightPx) this.free();
  }

  private fly(dt: number, world: EnemyWorld): void {
    const tuning = this.tuning;
    const body = this.body;
    this.bobMs += dt * MS_PER_SECOND;
    const targetY =
      this.anchorY +
      tuning.flyBobAmplitudePx * Math.sin((TWO_PI * this.bobMs) / tuning.flyBobPeriodMs);
    body.vx = this.facing * tuning.flySpeed;
    body.vy = (targetY - body.y) / dt;
    moveThroughTiles(body, body.vx * dt, targetY - body.y, world.tileSize, world.isSolid);
    if (body.hitLeft) this.facing = 1;
    else if (body.hitRight) this.facing = -1;
  }

  private tumble(dt: number, world: EnemyWorld): void {
    const body = this.body;
    const dy = applyGravity(body, this.tuning.knockGravity, Infinity, dt);
    body.x += body.vx * dt;
    body.y += dy;
    if (body.y > world.levelHeightPx) this.free();
  }

  private revive(pipCenterX: number): void {
    this.enterMode('walk');
    this.facing = pipCenterX < this.centerX ? -1 : 1;
  }

  private stepPlant(elapsedMs: number, pipCenterX: number): void {
    const tuning = this.tuning;
    switch (this.plantPhase) {
      case 'hidden': {
        const pipTooClose = Math.abs(pipCenterX - this.centerX) <= tuning.plantShyDistancePx;
        if (this.modeMs >= tuning.plantHiddenMs && !pipTooClose) this.enterPlantPhase('rising');
        break;
      }
      case 'rising':
        this.plantRise = tuning.plantRisePx * Math.min(1, this.modeMs / tuning.plantMoveMs);
        if (this.modeMs >= tuning.plantMoveMs) this.enterPlantPhase('out');
        break;
      case 'out':
        if (this.modeMs >= tuning.plantOutMs) this.enterPlantPhase('sinking');
        break;
      case 'sinking':
        this.plantRise = tuning.plantRisePx * Math.max(0, 1 - this.modeMs / tuning.plantMoveMs);
        if (this.modeMs >= tuning.plantMoveMs) this.enterPlantPhase('hidden');
        break;
    }
    const body = this.body;
    body.height = this.plantRise;
    body.y = this.plantBaseY - this.plantRise;
  }

  private enterPlantPhase(phase: PlantPhase): void {
    this.plantPhase = phase;
    this.modeMs = 0;
    if (phase === 'out') this.plantRise = this.tuning.plantRisePx;
    if (phase === 'hidden') this.plantRise = 0;
  }
}
