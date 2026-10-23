import type { RookKingTuning } from '../../configuration/boss.config';
import {
  applyGravity,
  boxCenterX,
  createBody,
  moveThroughTiles,
  placeBody,
  type ActorBody,
  type SolidQuery,
} from '../actors/actor-body';

export type RookMode =
  | 'dormant'
  | 'intro'
  | 'pace'
  | 'crouch'
  | 'hop'
  | 'windup'
  | 'throw'
  | 'hurt'
  | 'defeated'
  | 'falling'
  | 'gone';

export type RookAttack = 'hop' | 'throw';

export type DamageResult = 'ignored' | 'hurt' | 'defeated';

export const ROOK_PATTERN: readonly RookAttack[] = ['hop', 'throw', 'throw', 'hop'];

export interface RookWorld {
  readonly isSolid: SolidQuery;
  readonly tileSize: number;
  readonly levelHeightPx: number;
}

export interface RookKingEvents {
  landed(): void;
  throwStone(): void;
}

const MS_PER_SECOND = 1000;

export class RookKing {
  readonly body: ActorBody;
  mode: RookMode = 'dormant';
  facing: 1 | -1 = -1;
  health: number;
  modeMs = 0;
  private patternIndex = 0;
  private paceDirection: 1 | -1 = -1;
  private homeX = 0;
  private arenaLeft = 0;
  private arenaRight = 0;
  private throwsLeft = 0;

  constructor(private readonly tuning: RookKingTuning) {
    this.body = createBody(tuning.bodyWidth, tuning.bodyHeight);
    this.health = tuning.health;
  }

  get centerX(): number {
    return boxCenterX(this.body);
  }

  get angry(): boolean {
    return this.health <= this.tuning.health / 2;
  }

  get harmful(): boolean {
    switch (this.mode) {
      case 'pace':
      case 'crouch':
      case 'hop':
      case 'windup':
      case 'throw':
        return true;
      default:
        return false;
    }
  }

  get present(): boolean {
    return this.mode !== 'falling' && this.mode !== 'gone' && this.mode !== 'defeated';
  }

  get telegraphing(): boolean {
    return this.mode === 'crouch' || this.mode === 'windup';
  }

  get nextAttack(): RookAttack {
    return ROOK_PATTERN[this.patternIndex];
  }

  place(centerX: number, groundY: number, arenaLeft: number, arenaRight: number): void {
    placeBody(this.body, centerX, groundY);
    this.homeX = centerX;
    this.arenaLeft = arenaLeft + this.tuning.arenaMarginPx;
    this.arenaRight = arenaRight - this.tuning.arenaMarginPx;
    this.health = this.tuning.health;
    this.patternIndex = 0;
    this.facing = -1;
    this.enter('dormant');
  }

  wake(): void {
    if (this.mode === 'dormant') this.enter('intro');
  }

  damage(amount: number, fromX: number): DamageResult {
    if (!this.harmful) return 'ignored';
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.enter('defeated');
      this.body.vx = 0;
      this.body.vy = 0;
      return 'defeated';
    }
    const away: 1 | -1 = fromX < this.centerX ? 1 : -1;
    this.enter('hurt');
    this.body.vy = -this.tuning.retreatLaunchSpeed;
    this.body.vx = away * this.tuning.retreatSpeedX;
    this.facing = away === 1 ? -1 : 1;
    return 'hurt';
  }

  step(dt: number, world: RookWorld, pipCenterX: number, events: RookKingEvents): void {
    this.modeMs += dt * MS_PER_SECOND;
    const tuning = this.tuning;
    switch (this.mode) {
      case 'dormant':
      case 'gone':
        return;
      case 'intro':
        this.faceToward(pipCenterX);
        if (this.modeMs >= tuning.introMs) this.enter('pace');
        return;
      case 'pace':
        this.pace(dt, world, pipCenterX);
        if (this.modeMs >= (this.angry ? tuning.paceMsAngry : tuning.paceMs)) this.beginAttack();
        return;
      case 'crouch':
        this.faceToward(pipCenterX);
        if (this.modeMs < (this.angry ? tuning.hopCrouchMsAngry : tuning.hopCrouchMs)) return;
        this.enter('hop');
        this.body.vy = -tuning.hopLaunchSpeed;
        this.body.vx = this.facing * tuning.hopSpeedX;
        return;
      case 'hop':
        if (this.airborneStep(dt, world)) {
          events.landed();
          this.settle();
        }
        return;
      case 'windup':
        this.faceToward(pipCenterX);
        if (this.modeMs < (this.angry ? tuning.throwWindupMsAngry : tuning.throwWindupMs)) return;
        events.throwStone();
        this.throwsLeft = this.angry ? 1 : 0;
        this.enter('throw');
        return;
      case 'throw':
        this.faceToward(pipCenterX);
        if (this.throwsLeft > 0 && this.modeMs >= tuning.secondThrowDelayMs) {
          this.throwsLeft--;
          events.throwStone();
        }
        if (this.modeMs >= tuning.throwRecoverMs) this.settle();
        return;
      case 'hurt': {
        const landed = this.airborneStep(dt, world);
        if (landed) this.body.vx = 0;
        if (this.modeMs >= tuning.hurtMs && landed) this.settle();
        return;
      }
      case 'defeated':
        if (this.modeMs < tuning.defeatFlashMs) return;
        this.enter('falling');
        this.body.vy = -tuning.defeatLaunchSpeed;
        return;
      case 'falling': {
        const body = this.body;
        const start = body.vy;
        body.vy += tuning.defeatGravity * dt;
        body.y += ((start + body.vy) / 2) * dt;
        if (body.y > world.levelHeightPx) this.enter('gone');
        return;
      }
    }
  }

  private beginAttack(): void {
    const attack = this.nextAttack;
    this.patternIndex = (this.patternIndex + 1) % ROOK_PATTERN.length;
    this.enter(attack === 'hop' ? 'crouch' : 'windup');
  }

  private settle(): void {
    this.homeX = this.clampX(this.centerX);
    this.body.vx = 0;
    this.enter('pace');
  }

  private pace(dt: number, world: RookWorld, pipCenterX: number): void {
    const tuning = this.tuning;
    const body = this.body;
    this.faceToward(pipCenterX);
    const offset = this.centerX - this.homeX;
    if (offset >= tuning.paceRangePx) this.paceDirection = -1;
    else if (offset <= -tuning.paceRangePx) this.paceDirection = 1;
    body.vx = this.paceDirection * tuning.walkSpeed;
    const dy = applyGravity(body, tuning.gravity, tuning.maxFallSpeed, dt);
    moveThroughTiles(body, body.vx * dt, dy, world.tileSize, world.isSolid);
    if (body.hitLeft || body.hitRight || this.clampToArena()) {
      this.paceDirection = this.paceDirection === 1 ? -1 : 1;
    }
  }

  private airborneStep(dt: number, world: RookWorld): boolean {
    const tuning = this.tuning;
    const body = this.body;
    const dy = applyGravity(body, tuning.gravity, tuning.maxFallSpeed, dt);
    moveThroughTiles(body, body.vx * dt, dy, world.tileSize, world.isSolid);
    if (body.hitLeft || body.hitRight || this.clampToArena()) body.vx = 0;
    return body.onGround;
  }

  private clampToArena(): boolean {
    const body = this.body;
    if (body.x < this.arenaLeft) {
      body.x = this.arenaLeft;
      return true;
    }
    if (body.x + body.width > this.arenaRight) {
      body.x = this.arenaRight - body.width;
      return true;
    }
    return false;
  }

  private clampX(centerX: number): number {
    const half = this.body.width / 2 + this.tuning.paceRangePx;
    return Math.min(this.arenaRight - half, Math.max(this.arenaLeft + half, centerX));
  }

  private faceToward(x: number): void {
    this.facing = x < this.centerX ? -1 : 1;
  }

  private enter(mode: RookMode): void {
    this.mode = mode;
    this.modeMs = 0;
  }
}
