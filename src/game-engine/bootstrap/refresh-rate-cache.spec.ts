import { beforeEach, describe, expect, it } from 'vitest';
import { cacheRefreshHz, clearCachedRefreshHz, getCachedRefreshHz } from './refresh-rate-cache';

describe('refresh rate cache', () => {
  beforeEach(clearCachedRefreshHz);

  it('is empty until a rate is cached', () => {
    expect(getCachedRefreshHz()).toBeNull();
  });

  it('returns the stored value on later lookups', () => {
    cacheRefreshHz(144);
    expect(getCachedRefreshHz()).toBe(144);
    expect(getCachedRefreshHz()).toBe(144);
  });
});
