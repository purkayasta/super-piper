export const PIP_OUTFITS = ['courier', 'forest', 'midnight'] as const;

export type PipOutfit = (typeof PIP_OUTFITS)[number];

export const DEFAULT_OUTFIT: PipOutfit = 'courier';

export const SPARK_LOOK = 'spark';

export type PipLook = PipOutfit | typeof SPARK_LOOK;

export const PIP_LOOKS: readonly PipLook[] = [...PIP_OUTFITS, SPARK_LOOK];

export const PIP_SMALL_FRAMES = [
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

export const PIP_BIG_FRAMES = [
  'big-idle',
  'big-walk-0',
  'big-walk-1',
  'big-walk-2',
  'big-run-0',
  'big-run-1',
  'big-run-2',
  'big-skid',
  'big-jump',
  'big-fall',
  'big-crouch',
  'big-goal-grab',
  'big-throw',
] as const;

export type PipSmallFrame = (typeof PIP_SMALL_FRAMES)[number];

export type PipBigFrame = (typeof PIP_BIG_FRAMES)[number];

export type PipFrame = PipSmallFrame | PipBigFrame;

export const PIP_SMALL_ART_SIZE = 16;

export const PIP_FRAME_WIDTH = 16;

export const PIP_FRAME_HEIGHT = 32;

export function pipFrameName(look: PipLook, frame: PipFrame): string {
  return `pip/${look}/${frame}`;
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
  checkpointDown: 'checkpoint/down',
  checkpointUp: 'checkpoint/up',
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

export const EnemyFrame = {
  thornbugWalk0: 'enemy/thornbug-walk-0',
  thornbugWalk1: 'enemy/thornbug-walk-1',
  thornbugSquashed: 'enemy/thornbug-squashed',
  shellbackWalk0: 'enemy/shellback-walk-0',
  shellbackWalk1: 'enemy/shellback-walk-1',
  shellbackShell: 'enemy/shellback-shell',
  shellbackPeek: 'enemy/shellback-peek',
  flapjackFly0: 'enemy/flapjack-fly-0',
  flapjackFly1: 'enemy/flapjack-fly-1',
  flapjackWalk0: 'enemy/flapjack-walk-0',
  flapjackWalk1: 'enemy/flapjack-walk-1',
  flapjackSquashed: 'enemy/flapjack-squashed',
  snapvineOpen: 'enemy/snapvine-open',
  snapvineClosed: 'enemy/snapvine-closed',
} as const;

export const PowerUpFrame = {
  parcelBox: 'power/parcel-box',
  sparkStamp0: 'power/spark-stamp-0',
  sparkStamp1: 'power/spark-stamp-1',
  rushStar0: 'power/rush-star-0',
  rushStar1: 'power/rush-star-1',
  greenStamp: 'power/green-stamp',
  parcel0: 'projectile/parcel-0',
  parcel1: 'projectile/parcel-1',
  parcel2: 'projectile/parcel-2',
  parcel3: 'projectile/parcel-3',
} as const;

export const PARCEL_SPIN_FRAMES: readonly string[] = [
  PowerUpFrame.parcel0,
  PowerUpFrame.parcel1,
  PowerUpFrame.parcel2,
  PowerUpFrame.parcel3,
];

export const ONE_UP_LABEL = '1up';

export const SCORE_LABELS = [
  '50',
  '100',
  '200',
  '400',
  '500',
  '800',
  '1000',
  '2000',
  '4000',
  '5000',
  '8000',
  ONE_UP_LABEL,
] as const;

export type ScoreLabel = (typeof SCORE_LABELS)[number];

export function scoreFrameName(label: ScoreLabel): string {
  return `score/${label}`;
}
