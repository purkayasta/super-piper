let cachedRefreshHz: number | null = null;

export function getCachedRefreshHz(): number | null {
  return cachedRefreshHz;
}

export function cacheRefreshHz(refreshHz: number): void {
  cachedRefreshHz = refreshHz;
}

export function clearCachedRefreshHz(): void {
  cachedRefreshHz = null;
}
