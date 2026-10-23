import type { TubeRules } from '../../configuration/stage-objects.config';
import type { Box } from '../../entities/actors/actor-body';
import type { TubeLink } from '../../world/level-format';

export interface TubeOpening {
  readonly column: number;
  readonly topRow: number;
  readonly destination: TubeLink | null;
}

export interface TubeEntryInput {
  readonly grounded: boolean;
  readonly down: boolean;
}

const TUBE_WIDTH_TILES = 2;

export function findEnterableTube(
  tubes: readonly TubeOpening[],
  body: Box,
  input: TubeEntryInput,
  tileSize: number,
  rules: TubeRules,
): number {
  if (!input.grounded || !input.down) return -1;
  const centre = body.x + body.width / 2;
  const bottom = body.y + body.height;
  for (let i = 0; i < tubes.length; i++) {
    const tube = tubes[i];
    if (tube.destination === null) continue;
    if (Math.abs(bottom - tube.topRow * tileSize) > rules.footTolerancePx) continue;
    const left = tube.column * tileSize + rules.centreMarginPx;
    const right = (tube.column + TUBE_WIDTH_TILES) * tileSize - rules.centreMarginPx;
    if (centre >= left && centre <= right) return i;
  }
  return -1;
}

export function tubeCentreX(tube: TubeOpening, tileSize: number): number {
  return (tube.column + TUBE_WIDTH_TILES / 2) * tileSize;
}

export type TubePhase = 'idle' | 'enter' | 'travel' | 'exit';

export class TubeTransition {
  private currentPhase: TubePhase = 'idle';
  private elapsedMs = 0;

  constructor(private readonly rules: TubeRules) {}

  get phase(): TubePhase {
    return this.currentPhase;
  }

  get active(): boolean {
    return this.currentPhase !== 'idle';
  }

  get depth(): number {
    const progress = Math.min(1, this.elapsedMs / this.rules.travelMs);
    switch (this.currentPhase) {
      case 'enter':
        return progress * this.rules.depthPx;
      case 'travel':
        return this.rules.depthPx;
      case 'exit':
        return (1 - progress) * this.rules.depthPx;
      case 'idle':
        return 0;
    }
  }

  enter(): void {
    this.currentPhase = 'enter';
    this.elapsedMs = 0;
  }

  exit(): void {
    this.currentPhase = 'exit';
    this.elapsedMs = 0;
  }

  step(deltaMs: number): void {
    if (this.currentPhase !== 'enter' && this.currentPhase !== 'exit') return;
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < this.rules.travelMs) return;
    this.currentPhase = this.currentPhase === 'enter' ? 'travel' : 'idle';
  }
}
