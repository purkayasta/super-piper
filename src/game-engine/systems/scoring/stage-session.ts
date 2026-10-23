import type { ScoringRules } from '../../configuration/scoring.config';
import type { HudState, PowerForm } from '../../core/game-events';

export interface RunTotals {
  readonly score: number;
  readonly coins: number;
  readonly lives: number;
}

export class StageSession {
  private readonly state: HudState;
  private postmarkCount = 0;
  private clockRunning = true;
  private unitElapsedMs = 0;
  private dirty = true;

  constructor(
    timeLimit: number,
    totals: RunTotals,
    private readonly rules: ScoringRules,
    postmarks = 0,
  ) {
    this.state = {
      score: totals.score,
      coins: totals.coins,
      timeLeft: timeLimit,
      lives: totals.lives,
      power: 'small',
    };
    this.postmarkCount = postmarks;
  }

  get hud(): Readonly<HudState> {
    return this.state;
  }

  get postmarks(): number {
    return this.postmarkCount;
  }

  get timeUp(): boolean {
    return this.state.timeLeft === 0;
  }

  addCoin(): void {
    this.state.coins++;
    this.state.score += this.rules.coinPoints;
    if (this.state.coins >= this.rules.coinsPerExtraLife) {
      this.state.coins -= this.rules.coinsPerExtraLife;
      this.state.lives++;
    }
    this.dirty = true;
  }

  collectPostmark(): void {
    this.postmarkCount++;
    this.state.score += this.rules.postmarkPoints;
    this.dirty = true;
  }

  addScore(points: number): void {
    if (points === 0) return;
    this.state.score += points;
    this.dirty = true;
  }

  addLife(): void {
    this.state.lives++;
    this.dirty = true;
  }

  loseLife(): number {
    this.state.lives = Math.max(0, this.state.lives - 1);
    this.dirty = true;
    return this.state.lives;
  }

  setPower(power: PowerForm): void {
    if (this.state.power === power) return;
    this.state.power = power;
    this.dirty = true;
  }

  tick(elapsedMs: number): void {
    if (!this.clockRunning || this.state.timeLeft === 0) return;
    this.unitElapsedMs += elapsedMs;
    while (this.unitElapsedMs >= this.rules.timeUnitMs && this.state.timeLeft > 0) {
      this.unitElapsedMs -= this.rules.timeUnitMs;
      this.state.timeLeft--;
      this.dirty = true;
    }
  }

  convertTime(units: number): number {
    const converted = Math.min(units, this.state.timeLeft);
    if (converted <= 0) return 0;
    this.state.timeLeft -= converted;
    this.state.score += converted * this.rules.timeBonusPerUnit;
    this.dirty = true;
    return converted;
  }

  stopClock(): void {
    this.clockRunning = false;
  }

  totals(): RunTotals {
    return { score: this.state.score, coins: this.state.coins, lives: this.state.lives };
  }

  consumeChange(): boolean {
    const changed = this.dirty;
    this.dirty = false;
    return changed;
  }

  snapshot(): HudState {
    return { ...this.state };
  }
}
