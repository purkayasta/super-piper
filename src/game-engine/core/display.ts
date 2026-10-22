import {
  LOGICAL_HEIGHT,
  SUPPORTED_REFRESH_RATES,
  ZOOM_CAP,
} from '../configuration/performance.config';
import type { QualityLevel } from './game-events';

const DEFAULT_REFRESH_RATE = 60;

export function computeZoom(
  viewportCssHeight: number,
  devicePixelRatio: number,
  quality: QualityLevel,
): number {
  const fitting = Math.ceil((viewportCssHeight * devicePixelRatio) / LOGICAL_HEIGHT);
  return Math.min(Math.max(fitting, 1), ZOOM_CAP[quality]);
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function detectRefreshRate(frameDeltasMs: readonly number[]): number {
  if (frameDeltasMs.length === 0) return DEFAULT_REFRESH_RATE;
  const measuredHz = 1000 / median(frameDeltasMs);
  let nearest: number = SUPPORTED_REFRESH_RATES[0];
  for (const rate of SUPPORTED_REFRESH_RATES) {
    if (Math.abs(rate - measuredHz) < Math.abs(nearest - measuredHz)) nearest = rate;
  }
  return nearest;
}
