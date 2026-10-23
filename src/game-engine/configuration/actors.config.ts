export const ENEMY_TUNING = {
  gravity: 1350,
  maxFallSpeed: 240,
  walkSpeed: 30,
  shellSpeed: 180,
  shellReviveMs: 5000,
  shellPeekMs: 3800,
  squashedMs: 500,
  knockLaunchSpeed: 210,
  knockSpeedX: 45,
  knockGravity: 1100,
  pipGraceMs: 200,
  flySpeed: 30,
  flyBobAmplitudePx: 20,
  flyBobPeriodMs: 2200,
  plantRisePx: 24,
  plantMoveMs: 800,
  plantOutMs: 1400,
  plantHiddenMs: 1800,
  plantShyDistancePx: 24,
  plantHarmfulRisePx: 4,
  bodyWidth: 14,
  bodyHeight: 14,
  plantBodyWidth: 12,
} as const;

export type EnemyTuning = { readonly [K in keyof typeof ENEMY_TUNING]: number };

export const POWER_UP_TUNING = {
  emergeMs: 600,
  emergePx: 16,
  slideSpeed: 60,
  gravity: 1350,
  maxFallSpeed: 240,
  starSpeed: 60,
  starBounceSpeed: 300,
  starGravity: 900,
  bumpHopSpeed: 220,
  bodySize: 14,
} as const;

export type PowerUpTuning = { readonly [K in keyof typeof POWER_UP_TUNING]: number };

export const PARCEL_TUNING = {
  speed: 240,
  launchFallSpeed: 60,
  gravity: 1800,
  maxFallSpeed: 300,
  bounceSpeed: 200,
  bodySize: 8,
} as const;

export type ParcelTuning = { readonly [K in keyof typeof PARCEL_TUNING]: number };

export const ACTOR_POOLS = { enemies: 12, powerUps: 4, parcels: 2 } as const;

export const SPAWN_WINDOW = { aheadColumns: 1, despawnBehindPx: 64 } as const;

export const ACTOR_ANIMATION = {
  walkFrameMs: 200,
  flapFrameMs: 150,
  plantBiteMs: 220,
  glintFrameMs: 120,
  parcelSpinFrameMs: 60,
} as const;
