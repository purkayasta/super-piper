export const COMBAT = { stompTolerancePx: 8, stompBounceSpeed: 210, bumpReachPx: 3 } as const;

export const POWER_RULES = {
  transitionMs: 900,
  transitionFrameMs: 90,
  invulnerableMs: 2000,
  starMs: 10000,
  starEndingMs: 2000,
  flickerFrameMs: 50,
  starTintFrameMs: 60,
  starTintEndingFrameMs: 140,
  throwPoseMs: 150,
} as const;

export type PowerRules = { readonly [K in keyof typeof POWER_RULES]: number };

export const STAR_TINTS: readonly number[] = [0xffe066, 0xff9a4a, 0x9ef0ff, 0xffffff];

export const DEATH_RULES = {
  freezeMs: 500,
  launchSpeed: 330,
  gravity: 900,
  durationMs: 2800,
  pitDurationMs: 2800,
} as const;

export type DeathRules = { readonly [K in keyof typeof DEATH_RULES]: number };

export const MULTI_COIN = { windowMs: 4000, maxCoins: 10 } as const;

export const CROUCH_HEADROOM_PX = 12;

export const MILESTONE_RULES = { stompChain: 8, shellChain: 5 } as const;

export type MilestoneRules = { readonly [K in keyof typeof MILESTONE_RULES]: number };
