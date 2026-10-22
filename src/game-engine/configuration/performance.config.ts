import type { QualityLevel } from '../core/game-events';

export const LOGICAL_WIDTH = 432;
export const LOGICAL_HEIGHT = 240;
export const ZOOM_CAP: Record<QualityLevel, number> = { low: 3, medium: 4, high: 6 };
export const SUPPORTED_REFRESH_RATES = [60, 75, 90, 100, 120, 144, 165, 240] as const;
export const LONG_FRAME_MS = 50;
export const IGNORED_GAP_MS = 250;
export const FRAME_STATS_WINDOW_SECONDS = 2;
export const PERF_SAMPLE_INTERVAL_MS = 250;
