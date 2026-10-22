import {
  FRAME_STATS_WINDOW_SECONDS,
  IGNORED_GAP_MS,
  LONG_FRAME_MS,
} from '../configuration/performance.config';

export function rollingWindowCapacity(refreshHz: number): number {
  return Math.ceil(FRAME_STATS_WINDOW_SECONDS * refreshHz);
}

export class FrameStats {
  private readonly samples: Float64Array;
  private readonly scratch: Float64Array;
  private writeIndex = 0;
  private count = 0;
  private sessionLongFrames = 0;

  constructor(private readonly capacity: number) {
    this.samples = new Float64Array(capacity);
    this.scratch = new Float64Array(capacity);
  }

  push(frameMs: number): void {
    if (frameMs > IGNORED_GAP_MS) return;
    if (frameMs > LONG_FRAME_MS) this.sessionLongFrames++;
    this.samples[this.writeIndex] = frameMs;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  get average(): number {
    if (this.count === 0) return 0;
    let total = 0;
    for (let i = 0; i < this.count; i++) total += this.samples[i];
    return total / this.count;
  }

  get p95(): number {
    if (this.count === 0) return 0;
    const window = this.scratch.subarray(0, this.count);
    window.set(this.samples.subarray(0, this.count));
    window.sort();
    return window[Math.ceil(0.95 * this.count) - 1];
  }

  get longFrames(): number {
    let longFrames = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.samples[i] > LONG_FRAME_MS) longFrames++;
    }
    return longFrames;
  }

  get totalLongFrames(): number {
    return this.sessionLongFrames;
  }

  get fps(): number {
    const average = this.average;
    return average === 0 ? 0 : 1000 / average;
  }
}
