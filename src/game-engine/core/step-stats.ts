import { IGNORED_GAP_MS } from '../configuration/performance.config';

export class StepStats {
  private sessionOffStepFrames = 0;

  recordFrame(stepsThisFrame: number, frameMs: number): void {
    if (frameMs > IGNORED_GAP_MS) return;
    if (stepsThisFrame !== 1) this.sessionOffStepFrames++;
  }

  get offStepFrames(): number {
    return this.sessionOffStepFrames;
  }
}
