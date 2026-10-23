export const ROOK_KING = {
  bodyWidth: 24,
  bodyHeight: 30,
  health: 6,
  stompDamage: 2,
  parcelDamage: 1,
  introMs: 900,
  walkSpeed: 28,
  paceRangePx: 28,
  paceMs: 1100,
  paceMsAngry: 800,
  hopCrouchMs: 500,
  hopCrouchMsAngry: 350,
  hopLaunchSpeed: 300,
  hopSpeedX: 70,
  gravity: 900,
  maxFallSpeed: 360,
  throwWindupMs: 650,
  throwWindupMsAngry: 450,
  secondThrowDelayMs: 280,
  throwRecoverMs: 420,
  hurtMs: 1000,
  retreatLaunchSpeed: 240,
  retreatSpeedX: 90,
  defeatFlashMs: 1000,
  defeatLaunchSpeed: 220,
  defeatGravity: 700,
  arenaMarginPx: 4,
  handReachPx: 10,
  handHeightPx: 8,
} as const;

export type RookKingTuning = { readonly [K in keyof typeof ROOK_KING]: number };

export const ROOK_STONE = {
  size: 8,
  flightSeconds: 0.9,
  gravity: 900,
  maxSpeedX: 160,
  slots: 3,
} as const;

export type RookStoneTuning = { readonly [K in keyof typeof ROOK_STONE]: number };

export const BOSS_FIGHT = {
  stompTolerancePx: 10,
  stompBounceSpeed: 260,
  landShakePx: 2,
  landShakeMs: 250,
  defeatShakePx: 3,
  defeatShakeMs: 500,
  shakeFrameMs: 40,
  flashFrameMs: 70,
} as const;

export type BossFightRules = { readonly [K in keyof typeof BOSS_FIGHT]: number };
