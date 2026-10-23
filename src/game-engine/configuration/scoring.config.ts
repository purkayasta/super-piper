export const SCORING = {
  coinPoints: 200,
  postmarkPoints: 1000,
  coinsPerExtraLife: 100,
  startingLives: 3,
  timeUnitMs: 400,
} as const;

export type ScoringRules = { readonly [K in keyof typeof SCORING]: number };
