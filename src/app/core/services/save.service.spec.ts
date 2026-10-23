import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freshSave } from '../models/save-data.model';
import { MemoryStorage } from '../testing/game-fixtures.test-helpers';
import {
  PREFERS_REDUCED_MOTION,
  SAVE_KEYS,
  SAVE_STORAGE,
  SETTINGS_WRITE_DELAY_MS,
  SaveService,
} from './save.service';

describe('SaveService', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function create(store: Storage | null = storage): SaveService {
    TestBed.configureTestingModule({
      providers: [
        { provide: SAVE_STORAGE, useValue: store },
        { provide: PREFERS_REDUCED_MOTION, useValue: false },
      ],
    });
    return TestBed.inject(SaveService);
  }

  function stored(key: string): unknown {
    const text = storage.getItem(key);
    return text === null ? null : JSON.parse(text);
  }

  const withCoins = (coins: number) => ({
    ...freshSave(false),
    progression: { stages: {}, coins, xp: 0 },
  });

  it('starts a new player on a fresh save without writing or a notice', () => {
    const save = create();
    expect(save.data()).toEqual(freshSave(false));
    expect(save.notice()).toBeNull();
    expect(storage.length).toBe(0);
  });

  it('loads a stored save', () => {
    storage.setItem(SAVE_KEYS.primary, JSON.stringify(withCoins(40)));
    expect(create().data().progression.coins).toBe(40);
  });

  it('writes progression straight away and keeps the previous save as the backup', () => {
    const save = create();
    save.updateProgression((progression) => ({ ...progression, coins: 10 }));
    expect(stored(SAVE_KEYS.primary)).toEqual(withCoins(10));
    expect(stored(SAVE_KEYS.backup)).toBeNull();
    save.updateProgression((progression) => ({ ...progression, coins: 25 }));
    expect(stored(SAVE_KEYS.primary)).toEqual(withCoins(25));
    expect(stored(SAVE_KEYS.backup)).toEqual(withCoins(10));
  });

  it('debounces settings writes', () => {
    const save = create();
    const settings = save.data().settings;
    save.updateSettings({ ...settings, quality: 'low' });
    save.updateSettings({ ...settings, quality: 'medium' });
    expect(storage.getItem(SAVE_KEYS.primary)).toBeNull();
    vi.advanceTimersByTime(SETTINGS_WRITE_DELAY_MS);
    expect((stored(SAVE_KEYS.primary) as { settings: { quality: string } }).settings.quality).toBe(
      'medium',
    );
  });

  it('flushes a pending settings write on pagehide', () => {
    const save = create();
    save.updateSettings({ ...save.data().settings, screenShake: false });
    window.dispatchEvent(new Event('pagehide'));
    expect(storage.getItem(SAVE_KEYS.primary)).not.toBeNull();
  });

  it('recovers a corrupt save from the backup and keeps the damaged text', () => {
    storage.setItem(SAVE_KEYS.primary, '{"schemaVersion":1,"progression":{"coins":"lots"}}');
    storage.setItem(SAVE_KEYS.backup, JSON.stringify(withCoins(77)));
    const save = create();
    expect(save.data().progression.coins).toBe(77);
    expect(save.notice()).toBe('restored-backup');
    expect(stored(SAVE_KEYS.primary)).toEqual(withCoins(77));
    expect(storage.getItem(SAVE_KEYS.corrupt)).toContain('lots');
    save.dismissNotice();
    expect(save.notice()).toBeNull();
  });

  it('starts fresh with a notice when nothing can be recovered', () => {
    storage.setItem(SAVE_KEYS.primary, 'not json');
    const save = create();
    expect(save.data()).toEqual(freshSave(false));
    expect(save.notice()).toBe('reset-corrupt');
  });

  it('rewrites a migrated save in the current schema', () => {
    storage.setItem(SAVE_KEYS.primary, JSON.stringify({ progression: { coins: 5 } }));
    create();
    expect((stored(SAVE_KEYS.primary) as { schemaVersion: number }).schemaVersion).toBe(1);
  });

  it('erases progress but keeps settings', () => {
    const save = create();
    save.updateSettings({ ...save.data().settings, quality: 'low' });
    save.updateProgression((progression) => ({ ...progression, xp: 900 }));
    save.eraseProgress();
    expect(save.data().progression.xp).toBe(0);
    expect(save.data().settings.quality).toBe('low');
  });

  it('runs from memory with a notice when storage is unavailable', () => {
    const save = create(null);
    save.updateProgression((progression) => ({ ...progression, coins: 3 }));
    expect(save.data().progression.coins).toBe(3);
    expect(save.notice()).toBe('storage-unavailable');
  });

  it('tells the player when a write fails', () => {
    const save = create();
    storage.failWrites = true;
    save.updateProgression((progression) => ({ ...progression, coins: 3 }));
    expect(save.notice()).toBe('storage-unavailable');
  });
});
