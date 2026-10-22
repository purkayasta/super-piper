import { describe, expect, it } from 'vitest';
import { readRefreshHz, readZoom, registryChangeEvent, writeRegistry } from './registry-keys';

function fakeRegistry() {
  const store = new Map<string, unknown>();
  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => store.set(key, value),
  };
}

describe('registry keys', () => {
  it('round-trips typed values', () => {
    const registry = fakeRegistry();
    writeRegistry(registry, 'zoom', 3);
    writeRegistry(registry, 'refreshHz', 144);
    expect(readZoom(registry)).toBe(3);
    expect(readRefreshHz(registry)).toBe(144);
  });

  it('returns undefined for unset keys', () => {
    expect(readZoom(fakeRegistry())).toBeUndefined();
  });

  it('derives the phaser change event name from the key', () => {
    expect(registryChangeEvent('zoom')).toBe('changedata-zoom');
  });
});
