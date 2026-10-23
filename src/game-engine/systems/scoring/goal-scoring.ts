import type { GoalHeightBand } from '../../configuration/scoring.config';

export interface TallyRules {
  readonly unitsPerTick: number;
  readonly tickMs: number;
}

export function grabHeightFraction(feetY: number, poleTopY: number, baseTopY: number): number {
  const fraction = (baseTopY - feetY) / (baseTopY - poleTopY);
  return Math.min(1, Math.max(0, fraction));
}

export function goalHeightPoints(fraction: number, bands: readonly GoalHeightBand[]): number {
  for (const band of bands) if (fraction >= band.minFraction) return band.points;
  return 0;
}

export class TimeTally {
  private remaining = 0;
  private elapsedMs = 0;
  private started = false;

  constructor(private readonly rules: TallyRules) {}

  get active(): boolean {
    return this.started && this.remaining > 0;
  }

  get done(): boolean {
    return this.started && this.remaining === 0;
  }

  start(units: number): void {
    this.started = true;
    this.remaining = Math.max(0, Math.floor(units));
    this.elapsedMs = 0;
  }

  step(elapsedMs: number): number {
    if (!this.active) return 0;
    this.elapsedMs += elapsedMs;
    let units = 0;
    while (this.elapsedMs >= this.rules.tickMs && this.remaining > 0) {
      this.elapsedMs -= this.rules.tickMs;
      const chunk = Math.min(this.rules.unitsPerTick, this.remaining);
      this.remaining -= chunk;
      units += chunk;
    }
    return units;
  }
}
