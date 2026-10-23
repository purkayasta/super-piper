import type { DeathRules } from '../../configuration/rules.config';

export type DeathCause = 'hit' | 'pit' | 'time-up';

export type DeathPhase = 'inactive' | 'freeze' | 'fall' | 'done';

const MS_PER_SECOND = 1000;

export class DeathSequence {
  private currentPhase: DeathPhase = 'inactive';
  private positionY = 0;
  private velocityY = 0;
  private elapsedMs = 0;
  private hops = true;

  constructor(private readonly rules: DeathRules) {}

  get phase(): DeathPhase {
    return this.currentPhase;
  }

  get active(): boolean {
    return this.currentPhase === 'freeze' || this.currentPhase === 'fall';
  }

  get done(): boolean {
    return this.currentPhase === 'done';
  }

  get y(): number {
    return this.positionY;
  }

  start(y: number, cause: DeathCause): void {
    this.currentPhase = 'freeze';
    this.positionY = y;
    this.velocityY = 0;
    this.elapsedMs = 0;
    this.hops = cause !== 'pit';
  }

  step(elapsedMs: number): void {
    if (!this.active) return;
    this.elapsedMs += elapsedMs;
    const rules = this.rules;
    if (!this.hops) {
      if (this.elapsedMs >= rules.pitDurationMs) this.currentPhase = 'done';
      return;
    }
    if (this.currentPhase === 'freeze') {
      if (this.elapsedMs < rules.freezeMs) return;
      this.currentPhase = 'fall';
      this.velocityY = -rules.launchSpeed;
      return;
    }
    const dt = elapsedMs / MS_PER_SECOND;
    const startVelocity = this.velocityY;
    this.velocityY += rules.gravity * dt;
    this.positionY += ((startVelocity + this.velocityY) / 2) * dt;
    if (this.elapsedMs >= rules.durationMs) this.currentPhase = 'done';
  }
}
