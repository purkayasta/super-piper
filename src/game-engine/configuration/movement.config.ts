export interface JumpTier {
  minTakeoffSpeed: number;
  launchSpeed: number;
  holdGravity: number;
  fallGravity: number;
}

export interface MovementTuning {
  walkMaxSpeed: number;
  runMaxSpeed: number;
  walkAccel: number;
  runAccel: number;
  airAccel: number;
  releaseDecel: number;
  skidDecel: number;
  maxFallSpeed: number;
  jumpTiers: readonly [JumpTier, JumpTier, JumpTier];
  coyoteMs: number;
  jumpBufferMs: number;
  cornerNudgePx: number;
  maxStepSeconds: number;
  cameraLeadFraction: number;
}

export interface MovementSensitivity {
  readonly jump: number;
  readonly left: number;
  readonly right: number;
}

export const DEFAULT_MOVEMENT_SENSITIVITY: MovementSensitivity = {
  jump: 1,
  left: 1,
  right: 1,
};

export const DEFAULT_MOVEMENT: MovementTuning = {
  walkMaxSpeed: 93.75,
  runMaxSpeed: 153.75,
  walkAccel: 133.59375,
  runAccel: 200.390625,
  airAccel: 133.59375,
  releaseDecel: 182.8125,
  skidDecel: 365.625,
  maxFallSpeed: 270,
  jumpTiers: [
    { minTakeoffSpeed: 0, launchSpeed: 240, holdGravity: 450, fallGravity: 1575 },
    { minTakeoffSpeed: 60, launchSpeed: 240, holdGravity: 421.875, fallGravity: 1350 },
    { minTakeoffSpeed: 138.75, launchSpeed: 300, holdGravity: 562.5, fallGravity: 2025 },
  ],
  coyoteMs: 100,
  jumpBufferMs: 100,
  cornerNudgePx: 4,
  maxStepSeconds: 1 / 30,
  cameraLeadFraction: 0.42,
};
