export const PLATFORM_RULES = { thicknessPx: 8, landingSlackPx: 2 } as const;

export const FIREBAR_RULES = { spacingPx: 8, hitRadiusPx: 3, flickerFrameMs: 90 } as const;

export const LAVA_RULES = { surfaceInsetPx: 6, sideInsetPx: 2, frameMs: 160 } as const;

export const TUBE_RULES = { travelMs: 800, depthPx: 32, centreMarginPx: 4, footTolerancePx: 1 } as const;

export type TubeRules = { readonly [K in keyof typeof TUBE_RULES]: number };
