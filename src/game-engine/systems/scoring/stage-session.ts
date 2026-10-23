import type { ScoringRules } from '../../configuration/scoring.config';
import type { HudState } from '../../core/game-events';

export class StageSession {
  private readonly state: HudState;
  private postmarkCount = 0;
  private clockRunning = true;
  private unitElapsedMs = 0;
  private dirty = true;

  constructor(
    timeLimit: number,
    lives: number,
    private readonly rules: ScoringRules,
  ) {
    this.state = { score: 0, coins: 0, timeLeft: timeLimit, lives };
  }

  get hud(): Readonly<HudState> {
    return this.state;
  }

  get postmarks(): number {
    return this.postmarkCount;
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

  tick(elapsedMs: number): void {
    if (!this.clockRunning || this.state.timeLeft === 0) return;
    this.unitElapsedMs += elapsedMs;
    while (this.unitElapsedMs >= this.rules.timeUnitMs && this.state.timeLeft > 0) {
      this.unitElapsedMs -= this.rules.timeUnitMs;
      this.state.timeLeft--;
      this.dirty = true;
    }
  }

  stopClock(): void {
    this.clockRunning = false;
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
