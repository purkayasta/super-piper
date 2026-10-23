export const PIP_OUTFITS = ['courier', 'forest', 'midnight'] as const;

export type PipOutfit = (typeof PIP_OUTFITS)[number];

export const DEFAULT_OUTFIT: PipOutfit = 'courier';

export const PIP_FRAMES = [
  'idle',
  'walk-0',
  'walk-1',
  'walk-2',
  'run-0',
  'run-1',
  'run-2',
  'skid',
  'jump',
  'fall',
  'death',
  'goal-grab',
] as const;

export type PipFrame = (typeof PIP_FRAMES)[number];

export const PIP_FRAME_SIZE = 16;

export function pipFrameName(outfit: PipOutfit, frame: PipFrame): string {
  return `pip/${outfit}/${frame}`;
}

export const ItemFrame = {
  coin0: 'item/coin-0',
  coin1: 'item/coin-1',
  coin2: 'item/coin-2',
  coin3: 'item/coin-3',
  postmark: 'item/postmark',
  flag: 'goal/flag',
  pole: 'goal/pole',
  poleTop: 'goal/pole-top',
  brickDebris: 'effect/brick-debris',
  sparkle0: 'effect/sparkle-0',
  sparkle1: 'effect/sparkle-1',
} as const;

export const COIN_SPIN_FRAMES: readonly string[] = [
  ItemFrame.coin0,
  ItemFrame.coin1,
  ItemFrame.coin2,
  ItemFrame.coin3,
];

export const SPARKLE_FRAMES: readonly string[] = [ItemFrame.sparkle0, ItemFrame.sparkle1];

export const GOAL_POLE_WIDTH = 4;
export const GOAL_POLE_TOP_SIZE = 8;
