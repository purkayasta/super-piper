export const SCENERY_RESOLUTIONS = { '720p': 3, '1440p': 6 } as const;

export type SceneryResolution = keyof typeof SCENERY_RESOLUTIONS;

export const SCENERY_THEMES = ['overworld', 'underground', 'sky', 'castle'] as const;

export type SceneryTheme = (typeof SCENERY_THEMES)[number];

export type SceneryLayerId = string;

export const SCENERY_GENERATORS = [
  'sky',
  'clouds',
  'mountains',
  'hills',
  'bushes',
  'cavern',
  'rock-columns',
  'crystals',
  'motes',
  'sunset',
  'high-clouds',
  'cloud-sea',
  'puffs',
  'keep-backdrop',
  'towers',
  'arches',
  'embers',
] as const;

export type SceneryGeneratorId = (typeof SCENERY_GENERATORS)[number];

export interface SceneryLayerSpec {
  readonly id: SceneryLayerId;
  readonly generator: SceneryGeneratorId;
  readonly top: number;
  readonly height: number;
  readonly stripWidth: number;
  readonly scrollFactor: number;
  readonly driftSpeed: number;
  readonly seed: number;
  readonly detail: boolean;
}

const STRIP = 576;
const VIEW_WIDTH = 432;
const VIEW_HEIGHT = 240;

function backdrop(generator: SceneryGeneratorId, seed: number): SceneryLayerSpec {
  return {
    id: 'backdrop',
    generator,
    top: 0,
    height: VIEW_HEIGHT,
    stripWidth: VIEW_WIDTH,
    scrollFactor: 0,
    driftSpeed: 0,
    seed,
    detail: false,
  };
}

export const OVERWORLD_SCENERY: readonly SceneryLayerSpec[] = [
  { ...backdrop('sky', 11), id: 'sky' },
  {
    id: 'clouds',
    generator: 'clouds',
    top: 4,
    height: 104,
    stripWidth: STRIP,
    scrollFactor: 0.12,
    driftSpeed: -3,
    seed: 23,
    detail: false,
  },
  {
    id: 'mountains',
    generator: 'mountains',
    top: 64,
    height: 156,
    stripWidth: STRIP,
    scrollFactor: 0.22,
    driftSpeed: 0,
    seed: 37,
    detail: false,
  },
  {
    id: 'hills',
    generator: 'hills',
    top: 124,
    height: 116,
    stripWidth: STRIP,
    scrollFactor: 0.45,
    driftSpeed: 0,
    seed: 41,
    detail: false,
  },
  {
    id: 'bushes',
    generator: 'bushes',
    top: 168,
    height: 72,
    stripWidth: STRIP,
    scrollFactor: 0.7,
    driftSpeed: 0,
    seed: 53,
    detail: true,
  },
];

export const UNDERGROUND_SCENERY: readonly SceneryLayerSpec[] = [
  backdrop('cavern', 61),
  {
    id: 'far-rocks',
    generator: 'rock-columns',
    top: 0,
    height: VIEW_HEIGHT,
    stripWidth: STRIP,
    scrollFactor: 0.15,
    driftSpeed: 0,
    seed: 67,
    detail: false,
  },
  {
    id: 'crystals',
    generator: 'crystals',
    top: 96,
    height: 144,
    stripWidth: STRIP,
    scrollFactor: 0.4,
    driftSpeed: 0,
    seed: 71,
    detail: false,
  },
  {
    id: 'motes',
    generator: 'motes',
    top: 0,
    height: VIEW_HEIGHT,
    stripWidth: STRIP,
    scrollFactor: 0.6,
    driftSpeed: -4,
    seed: 73,
    detail: true,
  },
];

export const SKY_SCENERY: readonly SceneryLayerSpec[] = [
  backdrop('sunset', 79),
  {
    id: 'high-clouds',
    generator: 'high-clouds',
    top: 8,
    height: 90,
    stripWidth: STRIP,
    scrollFactor: 0.08,
    driftSpeed: -2,
    seed: 83,
    detail: false,
  },
  {
    id: 'cloud-sea',
    generator: 'cloud-sea',
    top: 150,
    height: 90,
    stripWidth: STRIP,
    scrollFactor: 0.25,
    driftSpeed: 0,
    seed: 89,
    detail: false,
  },
  {
    id: 'puffs',
    generator: 'puffs',
    top: 110,
    height: 130,
    stripWidth: STRIP,
    scrollFactor: 0.55,
    driftSpeed: -6,
    seed: 97,
    detail: true,
  },
];

export const CASTLE_SCENERY: readonly SceneryLayerSpec[] = [
  backdrop('keep-backdrop', 99),
  {
    id: 'far-towers',
    generator: 'towers',
    top: 40,
    height: 200,
    stripWidth: STRIP,
    scrollFactor: 0.15,
    driftSpeed: 0,
    seed: 101,
    detail: false,
  },
  {
    id: 'arches',
    generator: 'arches',
    top: 0,
    height: VIEW_HEIGHT,
    stripWidth: STRIP,
    scrollFactor: 0.4,
    driftSpeed: 0,
    seed: 103,
    detail: false,
  },
  {
    id: 'embers',
    generator: 'embers',
    top: 0,
    height: VIEW_HEIGHT,
    stripWidth: STRIP,
    scrollFactor: 0.65,
    driftSpeed: 5,
    seed: 107,
    detail: true,
  },
];

export const SCENERY_BY_THEME: Readonly<Record<SceneryTheme, readonly SceneryLayerSpec[]>> = {
  overworld: OVERWORLD_SCENERY,
  underground: UNDERGROUND_SCENERY,
  sky: SKY_SCENERY,
  castle: CASTLE_SCENERY,
};

export function sceneryLayersFor(
  theme: SceneryTheme,
  includeDetail: boolean,
): readonly SceneryLayerSpec[] {
  return SCENERY_BY_THEME[theme].filter((layer) => includeDetail || !layer.detail);
}
