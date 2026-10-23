import type Phaser from 'phaser';
import { PERF_SAMPLE_INTERVAL_MS } from '../configuration/performance.config';
import { FrameStats, rollingWindowCapacity } from '../core/frame-stats';
import type { GameBridge } from '../core/game-bridge';
import { StepStats } from '../core/step-stats';
import { recordPhysicsStepFrame } from './physics-rate';

export class PerfSampler {
  private readonly frameStats: FrameStats;
  private readonly stepStats = new StepStats();
  private sinceLastSampleMs = 0;
  private skipNextStepSample = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bridge: GameBridge,
    private readonly refreshHz: number,
    private readonly countActors: () => number = noActors,
  ) {
    this.frameStats = new FrameStats(rollingWindowCapacity(refreshHz));
  }

  recordFrame(): void {
    const delta = this.scene.game.loop.rawDelta;
    this.frameStats.push(delta);
    this.recordSteps(delta);
    this.sinceLastSampleMs += delta;
    if (this.sinceLastSampleMs < PERF_SAMPLE_INTERVAL_MS) return;
    this.sinceLastSampleMs = 0;
    const world = this.scene.physics.world;
    this.bridge.emit({
      type: 'perfSample',
      sample: {
        fps: this.frameStats.fps,
        avgFrameMs: this.frameStats.average,
        p95FrameMs: this.frameStats.p95,
        longFrames: this.frameStats.totalLongFrames,
        offStepFrames: this.stepStats.offStepFrames,
        refreshHz: this.refreshHz,
        physicsHz: world.fps,
        activeBodies: world.bodies.size + this.countActors(),
      },
    });
  }

  private recordSteps(frameMs: number): void {
    if (this.skipNextStepSample) {
      this.skipNextStepSample = false;
      return;
    }
    recordPhysicsStepFrame(this.scene, this.stepStats, frameMs);
  }
}

function noActors(): number {
  return 0;
}
