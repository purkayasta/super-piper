export const SCENERY_LAYER_IDS = ['sky', 'clouds', 'mountains', 'hills', 'bushes'] as const;

export type SceneryLayerId = (typeof SCENERY_LAYER_IDS)[number];

export const SCENERY_RESOLUTIONS = { '720p': 3, '1440p': 6 } as const;

export type SceneryResolution = keyof typeof SCENERY_RESOLUTIONS;

export type SceneryTheme = 'overworld';

export interface SceneryLayerSpec {
  readonly id: SceneryLayerId;
  readonly top: number;
  readonly height: number;
  readonly stripWidth: number;
  readonly scrollFactor: number;
  readonly driftSpeed: number;
  readonly seed: number;
}

export const OVERWORLD_SCENERY: readonly SceneryLayerSpec[] = [
  { id: 'sky', top: 0, height: 240, stripWidth: 432, scrollFactor: 0, driftSpeed: 0, seed: 11 },
  {
    id: 'clouds',
    top: 4,
    height: 104,
    stripWidth: 576,
    scrollFactor: 0.12,
    driftSpeed: -3,
    seed: 23,
  },
  {
    id: 'mountains',
    top: 64,
    height: 156,
    stripWidth: 576,
    scrollFactor: 0.22,
    driftSpeed: 0,
    seed: 37,
  },
  {
    id: 'hills',
    top: 124,
    height: 116,
    stripWidth: 576,
    scrollFactor: 0.45,
    driftSpeed: 0,
    seed: 41,
  },
  {
    id: 'bushes',
    top: 168,
    height: 72,
    stripWidth: 576,
    scrollFactor: 0.7,
    driftSpeed: 0,
    seed: 53,
  },
];

export const SCENERY_BY_THEME: Readonly<Record<SceneryTheme, readonly SceneryLayerSpec[]>> = {
  overworld: OVERWORLD_SCENERY,
};
