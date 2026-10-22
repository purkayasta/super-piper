import type Phaser from 'phaser';
import { readRefreshHz } from '../core/registry-keys';
import type { StepStats } from '../core/step-stats';

const DEFAULT_PHYSICS_HZ = 60;

export function applyDetectedPhysicsRate(scene: Phaser.Scene): number {
  const physicsHz = readRefreshHz(scene.registry) ?? DEFAULT_PHYSICS_HZ;
  scene.physics.world.setFPS(physicsHz);
  return physicsHz;
}

export function recordPhysicsStepFrame(
  scene: Phaser.Scene,
  stepStats: StepStats,
  frameMs: number,
): void {
  const world = scene.physics.world;
  if (world.isPaused || world.bodies.size === 0) return;
  stepStats.recordFrame(world.stepsLastFrame, frameMs);
}
