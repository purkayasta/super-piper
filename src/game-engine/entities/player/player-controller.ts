import { JumpTier, MovementTuning } from '../../configuration/movement.config';
import { ActionState } from '../../systems/input/actions';

export interface Contacts {
  onGround: boolean;
  hitCeiling: boolean;
  hitWallLeft: boolean;
  hitWallRight: boolean;
}

export type PlayerMode = 'ground' | 'skid' | 'air';

const MS_PER_SECOND = 1000;
const TIMER_EPSILON_MS = 1e-6;

export class PlayerController {
  private tuning: MovementTuning;
  private velocityX = 0;
  private velocityY = 0;
  private midpointX = 0;
  private midpointY = 0;
  private facingDirection: 1 | -1 = 1;
  private currentMode: PlayerMode = 'ground';

  private tierIndex = 0;
  private airMaxSpeed = 0;
  private fallGravityLocked = false;
  private msSinceGrounded = Infinity;
  private msSinceJumpPress = Infinity;
  private jumpHeldLastStep = true;
  private launchedThisStep = false;

  private segmentVelocity = 0;
  private segmentAverage = 0;

  constructor(tuning: MovementTuning) {
    this.tuning = tuning;
    this.airMaxSpeed = tuning.walkMaxSpeed;
  }

  get vx(): number {
    return this.velocityX;
  }

  get vy(): number {
    return this.velocityY;
  }

  get bodyVx(): number {
    return this.midpointX;
  }

  get bodyVy(): number {
    return this.midpointY;
  }

  get facing(): 1 | -1 {
    return this.facingDirection;
  }

  get mode(): PlayerMode {
    return this.currentMode;
  }

  get justLaunched(): boolean {
    return this.launchedThisStep;
  }

  setTuning(tuning: MovementTuning): void {
    this.tuning = tuning;
  }

  reset(): void {
    this.velocityX = 0;
    this.velocityY = 0;
    this.midpointX = 0;
    this.midpointY = 0;
    this.facingDirection = 1;
    this.currentMode = 'ground';
    this.tierIndex = 0;
    this.airMaxSpeed = this.tuning.walkMaxSpeed;
    this.fallGravityLocked = false;
    this.msSinceGrounded = Infinity;
    this.msSinceJumpPress = Infinity;
    this.jumpHeldLastStep = true;
    this.launchedThisStep = false;
  }

  bounce(speed: number): void {
    this.velocityY = -speed;
    this.midpointY = this.velocityY;
    this.fallGravityLocked = false;
    this.msSinceGrounded = Infinity;
    this.currentMode = 'air';
  }

  stopRising(): void {
    this.velocityY = Math.max(this.velocityY, 0);
    this.midpointY = Math.max(this.midpointY, 0);
    this.fallGravityLocked = true;
  }

  step(actions: ActionState, contacts: Contacts, dtSeconds: number): void {
    this.launchedThisStep = false;
    const dt = Math.min(dtSeconds, this.tuning.maxStepSeconds);
    if (!(dt > 0)) return;

    this.registerJumpPress(actions.jump);
    let grounded = this.applyContacts(contacts);
    if (grounded) this.latchTakeoff();
    if (this.canJump(grounded) && this.jumpIsBuffered()) {
      this.launch();
      grounded = false;
    }
    if (!actions.jump) this.fallGravityLocked = true;

    const input = horizontalInput(actions);
    if (grounded) this.stepGroundHorizontal(input, actions.run, dt);
    else this.stepAirHorizontal(input, dt);
    this.stopAtWalls(contacts);
    this.stepVertical(dt);
    if (grounded) this.velocityY = 0;
    this.advanceTimers(grounded, dt);
  }

  private registerJumpPress(jumpHeld: boolean): void {
    if (jumpHeld && !this.jumpHeldLastStep) this.msSinceJumpPress = 0;
    this.jumpHeldLastStep = jumpHeld;
  }

  private applyContacts(contacts: Contacts): boolean {
    if (
      (contacts.hitWallRight && this.velocityX > 0) ||
      (contacts.hitWallLeft && this.velocityX < 0)
    ) {
      this.velocityX = 0;
    }
    if (contacts.hitCeiling) {
      this.velocityY = Math.max(this.velocityY, 0);
      this.fallGravityLocked = true;
    }
    const grounded = contacts.onGround && this.velocityY >= 0;
    if (grounded) this.velocityY = 0;
    return grounded;
  }

  private latchTakeoff(): void {
    const speed = Math.abs(this.velocityX);
    const tiers = this.tuning.jumpTiers;
    let index = 0;
    for (let i = 1; i < tiers.length; i++) {
      if (speed >= tiers[i].minTakeoffSpeed) index = i;
    }
    this.tierIndex = index;
    this.airMaxSpeed = Math.min(this.tuning.runMaxSpeed, Math.max(this.tuning.walkMaxSpeed, speed));
    this.msSinceGrounded = 0;
    this.fallGravityLocked = false;
  }

  private canJump(grounded: boolean): boolean {
    return grounded || this.msSinceGrounded <= this.tuning.coyoteMs + TIMER_EPSILON_MS;
  }

  private jumpIsBuffered(): boolean {
    return this.msSinceJumpPress <= this.tuning.jumpBufferMs + TIMER_EPSILON_MS;
  }

  private launch(): void {
    this.velocityY = -this.currentTier().launchSpeed;
    this.fallGravityLocked = false;
    this.msSinceGrounded = Infinity;
    this.msSinceJumpPress = Infinity;
    this.launchedThisStep = true;
  }

  private stepGroundHorizontal(input: number, run: boolean, dt: number): void {
    const tuning = this.tuning;
    const vx = this.velocityX;
    const reversing = input !== 0 && vx !== 0 && Math.sign(vx) !== input;
    if (input === 0) {
      this.moveToward(vx, 0, tuning.releaseDecel, dt);
    } else if (reversing) {
      this.moveToward(vx, 0, tuning.skidDecel, dt);
    } else {
      const maxSpeed = run ? tuning.runMaxSpeed : tuning.walkMaxSpeed;
      const rate =
        Math.abs(vx) > maxSpeed ? tuning.releaseDecel : run ? tuning.runAccel : tuning.walkAccel;
      this.moveToward(vx, input * maxSpeed, rate, dt);
    }
    this.commitHorizontal();

    const stillOpposing =
      input !== 0 && this.velocityX !== 0 && Math.sign(this.velocityX) !== input;
    this.currentMode = stillOpposing ? 'skid' : 'ground';
    if (input !== 0 && !stillOpposing) this.facingDirection = input > 0 ? 1 : -1;
  }

  private stepAirHorizontal(input: number, dt: number): void {
    this.currentMode = 'air';
    if (input === 0) {
      this.midpointX = this.velocityX;
      return;
    }
    this.moveToward(this.velocityX, input * this.airMaxSpeed, this.tuning.airAccel, dt);
    this.commitHorizontal();
  }

  private commitHorizontal(): void {
    this.velocityX = this.segmentVelocity;
    this.midpointX = this.segmentAverage;
  }

  private stopAtWalls(contacts: Contacts): void {
    if (
      (contacts.hitWallRight && this.velocityX > 0) ||
      (contacts.hitWallLeft && this.velocityX < 0)
    ) {
      this.velocityX = 0;
      this.midpointX = 0;
    }
  }

  private stepVertical(dt: number): void {
    const tier = this.currentTier();
    const vy = this.velocityY;
    if (vy >= 0) this.fallGravityLocked = true;

    if (this.fallGravityLocked) {
      this.fall(vy, tier.fallGravity, dt);
      this.velocityY = this.segmentVelocity;
      this.midpointY = this.segmentAverage;
      return;
    }

    const apexTime = -vy / tier.holdGravity;
    if (apexTime >= dt) {
      this.velocityY = vy + tier.holdGravity * dt;
      this.midpointY = (vy + this.velocityY) / 2;
      return;
    }
    this.stepAcrossApex(vy, apexTime, tier, dt);
  }

  private stepAcrossApex(vy: number, apexTime: number, tier: JumpTier, dt: number): void {
    const risingDisplacement = (vy / 2) * apexTime;
    this.fallGravityLocked = true;
    this.fall(0, tier.fallGravity, dt - apexTime);
    this.velocityY = this.segmentVelocity;
    this.midpointY = (risingDisplacement + this.segmentAverage * (dt - apexTime)) / dt;
  }

  private fall(vy: number, gravity: number, duration: number): void {
    const maxFall = this.tuning.maxFallSpeed;
    if (vy >= maxFall || duration <= 0) {
      this.segmentVelocity = Math.min(vy, maxFall);
      this.segmentAverage = this.segmentVelocity;
      return;
    }
    const reachTime = (maxFall - vy) / gravity;
    if (reachTime >= duration) {
      this.segmentVelocity = vy + gravity * duration;
      this.segmentAverage = (vy + this.segmentVelocity) / 2;
      return;
    }
    this.segmentVelocity = maxFall;
    this.segmentAverage =
      (((vy + maxFall) / 2) * reachTime + maxFall * (duration - reachTime)) / duration;
  }

  private moveToward(velocity: number, target: number, rate: number, dt: number): void {
    const gap = target - velocity;
    const distance = Math.abs(gap);
    const maxChange = rate * dt;
    if (distance > maxChange) {
      this.segmentVelocity = velocity + Math.sign(gap) * maxChange;
      this.segmentAverage = (velocity + this.segmentVelocity) / 2;
      return;
    }
    const reachTime = rate > 0 ? distance / rate : 0;
    this.segmentVelocity = target;
    this.segmentAverage = (((velocity + target) / 2) * reachTime + target * (dt - reachTime)) / dt;
  }

  private advanceTimers(grounded: boolean, dt: number): void {
    const elapsedMs = dt * MS_PER_SECOND;
    this.msSinceJumpPress += elapsedMs;
    if (!grounded) this.msSinceGrounded += elapsedMs;
  }

  private currentTier(): JumpTier {
    return this.tuning.jumpTiers[this.tierIndex];
  }
}

function horizontalInput(actions: ActionState): number {
  return (actions.right ? 1 : 0) - (actions.left ? 1 : 0);
}
