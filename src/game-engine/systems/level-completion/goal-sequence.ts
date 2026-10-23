export type GoalPhase = 'inactive' | 'slide' | 'hop' | 'walk' | 'done';

export interface GoalLayout {
  readonly poleX: number;
  readonly slideBottomY: number;
  readonly groundY: number;
  readonly doorX: number;
  readonly flagTopY: number;
  readonly flagBottomY: number;
}

export interface GoalTiming {
  readonly slideSpeed: number;
  readonly hopDurationMs: number;
  readonly hopArcPx: number;
  readonly landingOffsetPx: number;
  readonly walkSpeed: number;
  readonly poleGrabOffsetPx: number;
}

const MS_PER_SECOND = 1000;

export class GoalSequence {
  private currentPhase: GoalPhase = 'inactive';
  private positionX = 0;
  private positionY = 0;
  private flagPositionY = 0;
  private grabHeightY = 0;
  private hopElapsedMs = 0;
  private hopFromX = 0;
  private layout: GoalLayout | null = null;

  constructor(private readonly timing: GoalTiming) {}

  get phase(): GoalPhase {
    return this.currentPhase;
  }

  get x(): number {
    return this.positionX;
  }

  get y(): number {
    return this.positionY;
  }

  get flagY(): number {
    return this.flagPositionY;
  }

  get grabY(): number {
    return this.grabHeightY;
  }

  get active(): boolean {
    return this.currentPhase !== 'inactive' && this.currentPhase !== 'done';
  }

  start(pipY: number, layout: GoalLayout): void {
    this.layout = layout;
    this.currentPhase = 'slide';
    this.positionX = layout.poleX - this.timing.poleGrabOffsetPx;
    this.positionY = Math.min(pipY, layout.slideBottomY);
    this.grabHeightY = this.positionY;
    this.flagPositionY = layout.flagTopY;
  }

  step(dtSeconds: number): void {
    const layout = this.layout;
    if (layout === null) return;
    switch (this.currentPhase) {
      case 'slide':
        this.slide(layout, dtSeconds);
        break;
      case 'hop':
        this.hop(layout, dtSeconds);
        break;
      case 'walk':
        this.positionX = Math.min(layout.doorX, this.positionX + this.timing.walkSpeed * dtSeconds);
        if (this.positionX >= layout.doorX) this.currentPhase = 'done';
        break;
    }
  }

  private slide(layout: GoalLayout, dtSeconds: number): void {
    const distance = this.timing.slideSpeed * dtSeconds;
    this.positionY = Math.min(layout.slideBottomY, this.positionY + distance);
    this.flagPositionY = Math.min(layout.flagBottomY, this.flagPositionY + distance);
    if (this.positionY < layout.slideBottomY || this.flagPositionY < layout.flagBottomY) return;
    this.currentPhase = 'hop';
    this.hopElapsedMs = 0;
    this.hopFromX = this.positionX;
  }

  private hop(layout: GoalLayout, dtSeconds: number): void {
    this.hopElapsedMs += dtSeconds * MS_PER_SECOND;
    const t = Math.min(1, this.hopElapsedMs / this.timing.hopDurationMs);
    const landingX = layout.poleX + this.timing.landingOffsetPx;
    this.positionX = this.hopFromX + (landingX - this.hopFromX) * t;
    this.positionY =
      layout.slideBottomY +
      (layout.groundY - layout.slideBottomY) * t -
      this.timing.hopArcPx * 4 * t * (1 - t);
    if (t < 1) return;
    this.currentPhase = landingX >= layout.doorX ? 'done' : 'walk';
  }
}
