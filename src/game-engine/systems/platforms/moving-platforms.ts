import type { Box, SolidQuery } from '../../entities/actors/actor-body';
import type { CompiledPlatform } from '../../world/level-format';

const FULL_TURN = 2 * Math.PI;
const EDGE_EPSILON = 1e-6;

export function platformTravelFraction(
  elapsedSeconds: number,
  periodSeconds: number,
  phase: number,
): number {
  return (1 - Math.cos(FULL_TURN * (elapsedSeconds / periodSeconds + phase))) / 2;
}

export class MovingPlatforms {
  readonly count: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly prevX: Float64Array;
  readonly prevY: Float64Array;
  readonly width: Float64Array;
  private elapsed = 0;

  constructor(
    private readonly specs: readonly CompiledPlatform[],
    readonly thickness: number,
  ) {
    this.count = specs.length;
    this.x = new Float64Array(this.count);
    this.y = new Float64Array(this.count);
    this.prevX = new Float64Array(this.count);
    this.prevY = new Float64Array(this.count);
    this.width = new Float64Array(this.count);
    for (let i = 0; i < this.count; i++) this.width[i] = specs[i].width;
    this.placeAll();
    this.prevX.set(this.x);
    this.prevY.set(this.y);
  }

  get elapsedSeconds(): number {
    return this.elapsed;
  }

  step(dt: number): void {
    this.prevX.set(this.x);
    this.prevY.set(this.y);
    this.elapsed += dt;
    this.placeAll();
  }

  private placeAll(): void {
    const specs = this.specs;
    for (let i = 0; i < this.count; i++) {
      const spec = specs[i];
      const travel = platformTravelFraction(this.elapsed, spec.periodSeconds, spec.phase);
      this.x[i] = spec.x + spec.travelX * travel;
      this.y[i] = spec.y + spec.travelY * travel;
    }
  }
}

export interface PlayerSupport {
  resolve(box: Box, prevBottom: number, vy: number): boolean;
  reset(): void;
}

export class PlatformRider implements PlayerSupport {
  private riding = -1;

  constructor(
    private readonly platforms: MovingPlatforms,
    private readonly isSolid: SolidQuery,
    private readonly tileSize: number,
    private readonly landingSlackPx: number,
  ) {}

  get ridingIndex(): number {
    return this.riding;
  }

  reset(): void {
    this.riding = -1;
  }

  resolve(box: Box, prevBottom: number, vy: number): boolean {
    if (this.riding >= 0) this.carry(box, this.riding);
    if (vy < 0) {
      this.riding = -1;
      return false;
    }
    const platforms = this.platforms;
    const bottom = box.y + box.height;
    for (let i = 0; i < platforms.count; i++) {
      const left = platforms.x[i];
      if (box.x >= left + platforms.width[i] || box.x + box.width <= left) continue;
      const wasAbove = prevBottom - platforms.prevY[i] <= this.landingSlackPx;
      if (!wasAbove || bottom < platforms.y[i]) continue;
      box.y = platforms.y[i] - box.height;
      if (i !== this.riding) box.x = left + Math.round(box.x - left);
      this.riding = i;
      return true;
    }
    this.riding = -1;
    return false;
  }

  private carry(box: Box, index: number): void {
    const platforms = this.platforms;
    const dx = platforms.x[index] - platforms.prevX[index];
    box.y += platforms.y[index] - platforms.prevY[index];
    if (dx === 0) return;
    box.x += dx;
    if (this.overlapsSolid(box)) box.x -= dx;
  }

  private overlapsSolid(box: Box): boolean {
    const size = this.tileSize;
    const firstColumn = Math.floor(box.x / size);
    const lastColumn = Math.floor((box.x + box.width - EDGE_EPSILON) / size);
    const firstRow = Math.floor(box.y / size);
    const lastRow = Math.floor((box.y + box.height - EDGE_EPSILON) / size);
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        if (this.isSolid(column, row)) return true;
      }
    }
    return false;
  }
}
