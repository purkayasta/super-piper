import type { MovementTuning } from '../../configuration/movement.config';
import type { PowerForm } from '../../core/game-events';
import type { PlayerMode } from '../../entities/player/player-controller';

export type PipAnimation =
  'idle' | 'walk' | 'run' | 'skid' | 'jump' | 'fall' | 'goal-grab' | 'crouch' | 'throw' | 'death';

const STILL_SPEED = 1;
const RUN_THRESHOLD = 0.5;
const MIN_STRIDE_FPS = 5;
const WALK_STRIDE_FPS = 9;
const RUN_STRIDE_FPS = 15;

export function selectPipAnimation(
  mode: PlayerMode,
  vx: number,
  vy: number,
  tuning: MovementTuning,
): PipAnimation {
  if (mode === 'skid') return 'skid';
  if (mode === 'air') return vy < 0 ? 'jump' : 'fall';
  const speed = Math.abs(vx);
  if (speed < STILL_SPEED) return 'idle';
  const runFrom = tuning.walkMaxSpeed + (tuning.runMaxSpeed - tuning.walkMaxSpeed) * RUN_THRESHOLD;
  return speed > runFrom ? 'run' : 'walk';
}

export function strideFrameRate(vx: number, tuning: MovementTuning): number {
  const speed = Math.abs(vx);
  if (speed <= tuning.walkMaxSpeed) {
    return MIN_STRIDE_FPS + (WALK_STRIDE_FPS - MIN_STRIDE_FPS) * (speed / tuning.walkMaxSpeed);
  }
  const runProgress = Math.min(
    1,
    (speed - tuning.walkMaxSpeed) / (tuning.runMaxSpeed - tuning.walkMaxSpeed),
  );
  return WALK_STRIDE_FPS + (RUN_STRIDE_FPS - WALK_STRIDE_FPS) * runProgress;
}

export function poseAnimation(
  base: PipAnimation,
  form: PowerForm,
  crouching: boolean,
  throwing: boolean,
): PipAnimation {
  if (form === 'small') return base;
  if (crouching) return 'crouch';
  if (throwing) return 'throw';
  return base;
}
