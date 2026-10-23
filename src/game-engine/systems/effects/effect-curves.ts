export function effectProgress(elapsedMs: number, durationMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / durationMs));
}

export function bumpOffset(elapsedMs: number, durationMs: number, heightPx: number): number {
  const t = effectProgress(elapsedMs, durationMs);
  return t >= 1 ? 0 : -heightPx * Math.sin(Math.PI * t);
}

export function coinPopOffset(elapsedMs: number, durationMs: number, risePx: number): number {
  const t = effectProgress(elapsedMs, durationMs);
  return -risePx * 4 * t * (1 - t);
}

export function frameAt(elapsedMs: number, frameMs: number, frameCount: number): number {
  return Math.floor(elapsedMs / frameMs) % frameCount;
}
