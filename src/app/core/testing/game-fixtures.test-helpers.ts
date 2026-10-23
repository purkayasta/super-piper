import type { StageResult } from '../../../game-engine/core/game-events';
import { DEFAULT_BINDINGS } from '../../../game-engine/systems/input/actions';
import type { GameOptions } from '../game-factory.token';

export function stageResult(overrides: Partial<StageResult> = {}): StageResult {
  return {
    stageId: '1-1',
    score: 5200,
    coins: 9,
    timeLeft: 0,
    timeUsed: 120,
    coinsCollected: 9,
    postmarks: 1,
    postmarksCollected: [1],
    postmarkTotal: 3,
    ...overrides,
  };
}

export function gameOptions(overrides: Partial<GameOptions> = {}): GameOptions {
  return {
    devTools: true,
    initialStageId: 'test-room',
    settings: { quality: 'high', reducedMotion: false, screenShake: true },
    bindings: DEFAULT_BINDINGS,
    ...overrides,
  };
}

export class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    this.items.set(key, value);
  }
}
