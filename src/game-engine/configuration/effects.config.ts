export const BLOCK_BUMP = { durationMs: 140, heightPx: 5 } as const;

export const COIN_POP = { durationMs: 520, risePx: 44, spinFps: 20 } as const;

export const SPARKLE = { durationMs: 240 } as const;

export const COIN_SPIN_FPS = 8;

export const STAR_BLOCK_FRAME_MS = 150;

export const EFFECT_POOL_SIZE = 4;

export const PICKUP_INSET = { x: 3, top: 1, bottom: 2 } as const;

export const GOAL_SEQUENCE = {
  slideSpeed: 150,
  hopDurationMs: 260,
  hopArcPx: 10,
  landingOffsetPx: 12,
  walkSpeed: 70,
  poleGrabOffsetPx: 6,
} as const;

export const SCORE_POPUP = { durationMs: 700, risePx: 24, poolSize: 8 } as const;

export const BRICK_DEBRIS = {
  durationMs: 1200,
  gravity: 1200,
  pieces: [
    { offsetX: -4, offsetY: -4, vx: -60, vy: -320 },
    { offsetX: 4, offsetY: -4, vx: 60, vy: -320 },
    { offsetX: -4, offsetY: 4, vx: -60, vy: -220 },
    { offsetX: 4, offsetY: 4, vx: 60, vy: -220 },
  ],
  poolSize: 8,
} as const;
