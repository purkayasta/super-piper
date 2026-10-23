export class CheckpointTracker {
  private reachedFlag: boolean;

  constructor(
    private readonly triggerX: number | null,
    reached: boolean,
  ) {
    this.reachedFlag = triggerX !== null && reached;
  }

  get exists(): boolean {
    return this.triggerX !== null;
  }

  get reached(): boolean {
    return this.reachedFlag;
  }

  update(pipCenterX: number): boolean {
    if (this.reachedFlag || this.triggerX === null || pipCenterX < this.triggerX) return false;
    this.reachedFlag = true;
    return true;
  }
}
