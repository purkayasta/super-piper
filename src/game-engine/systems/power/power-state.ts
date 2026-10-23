import type { PowerRules } from '../../configuration/rules.config';
import type { PowerForm } from '../../core/game-events';

export type PowerTransition = 'grow' | 'shrink' | 'spark-up';

export type PowerItem = 'parcel-box' | 'spark-stamp';

export type CollectOutcome = 'transform' | 'points';

export type DamageOutcome = 'ignored' | 'shrink' | 'death';

export class PipPower {
  private currentForm: PowerForm;
  private previousForm: PowerForm;
  private transitionKind: PowerTransition | null = null;
  private transitionMs = 0;
  private invulnerableMs = 0;
  private starMs = 0;

  constructor(
    private readonly rules: PowerRules,
    form: PowerForm = 'small',
  ) {
    this.currentForm = form;
    this.previousForm = form;
  }

  get form(): PowerForm {
    return this.currentForm;
  }

  get transition(): PowerTransition | null {
    return this.transitionKind;
  }

  get frozen(): boolean {
    return this.transitionKind !== null;
  }

  get starPower(): boolean {
    return this.starMs > 0;
  }

  get starEnding(): boolean {
    return this.starMs > 0 && this.starMs <= this.rules.starEndingMs;
  }

  get invulnerable(): boolean {
    return this.invulnerableMs > 0;
  }

  get invulnerableElapsedMs(): number {
    return this.rules.invulnerableMs - this.invulnerableMs;
  }

  get vulnerable(): boolean {
    return !this.frozen && this.starMs <= 0 && this.invulnerableMs <= 0;
  }

  get canThrow(): boolean {
    return this.currentForm === 'spark';
  }

  get canBreakBricks(): boolean {
    return this.currentForm !== 'small';
  }

  get displayForm(): PowerForm {
    if (this.transitionKind === null) return this.currentForm;
    const frame = Math.floor(this.transitionMs / this.rules.transitionFrameMs);
    return frame % 2 === 0 ? this.previousForm : this.currentForm;
  }

  collect(item: PowerItem): CollectOutcome {
    if (item === 'parcel-box') {
      if (this.currentForm !== 'small') return 'points';
      this.begin('grow', 'big');
      return 'transform';
    }
    if (this.currentForm === 'spark') return 'points';
    this.begin(this.currentForm === 'small' ? 'grow' : 'spark-up', 'spark');
    return 'transform';
  }

  startStar(): void {
    this.starMs = this.rules.starMs;
  }

  damage(): DamageOutcome {
    if (!this.vulnerable) return 'ignored';
    if (this.currentForm === 'small') return 'death';
    this.begin('shrink', 'small');
    this.invulnerableMs = this.rules.invulnerableMs;
    return 'shrink';
  }

  step(elapsedMs: number): boolean {
    if (this.transitionKind !== null) {
      this.transitionMs += elapsedMs;
      if (this.transitionMs < this.rules.transitionMs) return false;
      this.transitionKind = null;
      this.previousForm = this.currentForm;
      return true;
    }
    this.invulnerableMs = Math.max(0, this.invulnerableMs - elapsedMs);
    this.starMs = Math.max(0, this.starMs - elapsedMs);
    return false;
  }

  private begin(kind: PowerTransition, form: PowerForm): void {
    this.previousForm = this.currentForm;
    this.currentForm = form;
    this.transitionKind = kind;
    this.transitionMs = 0;
  }
}
