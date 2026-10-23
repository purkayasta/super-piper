import type { Box } from '../../entities/actors/actor-body';
import type { CompiledFirebar } from '../../world/level-format';

const FULL_TURN = 2 * Math.PI;

export class Firebars {
  readonly barCount: number;
  readonly segmentCount: number;
  readonly segmentX: Float64Array;
  readonly segmentY: Float64Array;
  private readonly firstSegment: Int32Array;
  private elapsed = 0;

  constructor(
    private readonly specs: readonly CompiledFirebar[],
    private readonly spacingPx: number,
  ) {
    this.barCount = specs.length;
    this.firstSegment = new Int32Array(this.barCount + 1);
    let total = 0;
    for (let bar = 0; bar < this.barCount; bar++) {
      this.firstSegment[bar] = total;
      total += specs[bar].segments;
    }
    this.firstSegment[this.barCount] = total;
    this.segmentCount = total;
    this.segmentX = new Float64Array(total);
    this.segmentY = new Float64Array(total);
    this.place();
  }

  get elapsedSeconds(): number {
    return this.elapsed;
  }

  angle(bar: number): number {
    const spec = this.specs[bar];
    return spec.startRadians + spec.turnsPerSecond * FULL_TURN * this.elapsed;
  }

  step(dt: number): void {
    this.elapsed += dt;
    this.place();
  }

  hits(box: Box, radiusPx: number): boolean {
    const radiusSquared = radiusPx * radiusPx;
    for (let bar = 0; bar < this.barCount; bar++) {
      const spec = this.specs[bar];
      const reach = (spec.segments - 1) * this.spacingPx + radiusPx;
      if (distanceSquaredToBox(box, spec.centerX, spec.centerY) > reach * reach) continue;
      for (let i = this.firstSegment[bar]; i < this.firstSegment[bar + 1]; i++) {
        if (distanceSquaredToBox(box, this.segmentX[i], this.segmentY[i]) <= radiusSquared) {
          return true;
        }
      }
    }
    return false;
  }

  private place(): void {
    for (let bar = 0; bar < this.barCount; bar++) {
      const spec = this.specs[bar];
      const angle = this.angle(bar);
      const stepX = Math.cos(angle) * this.spacingPx;
      const stepY = Math.sin(angle) * this.spacingPx;
      const first = this.firstSegment[bar];
      for (let i = 0; i < spec.segments; i++) {
        this.segmentX[first + i] = spec.centerX + stepX * i;
        this.segmentY[first + i] = spec.centerY + stepY * i;
      }
    }
  }
}

export function distanceSquaredToBox(box: Box, x: number, y: number): number {
  const nearestX = Math.max(box.x, Math.min(x, box.x + box.width));
  const nearestY = Math.max(box.y, Math.min(y, box.y + box.height));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy;
}
