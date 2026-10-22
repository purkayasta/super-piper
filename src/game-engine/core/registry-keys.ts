import type { GameBridge } from './game-bridge';
import type { GameOptions } from './game-factory';

export interface RegistryLike {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
}

export interface RegistryValues {
  bridge: GameBridge;
  options: GameOptions;
  zoom: number;
  refreshHz: number;
}

export type RegistryKey = keyof RegistryValues;

export function registryChangeEvent(key: RegistryKey): string {
  return `changedata-${key}`;
}

export function readRegistry<K extends RegistryKey>(
  registry: RegistryLike,
  key: K,
): RegistryValues[K] | undefined {
  return registry.get(key) as RegistryValues[K] | undefined;
}

export function writeRegistry<K extends RegistryKey>(
  registry: RegistryLike,
  key: K,
  value: RegistryValues[K],
): void {
  registry.set(key, value);
}

export const readBridge = (registry: RegistryLike) => readRegistry(registry, 'bridge');
export const readOptions = (registry: RegistryLike) => readRegistry(registry, 'options');
export const readZoom = (registry: RegistryLike) => readRegistry(registry, 'zoom');
export const readRefreshHz = (registry: RegistryLike) => readRegistry(registry, 'refreshHz');
