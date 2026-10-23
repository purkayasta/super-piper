import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage, stageResult } from '../testing/game-fixtures.test-helpers';
import { ProgressionService } from './progression.service';
import { SAVE_KEYS, SAVE_STORAGE } from './save.service';

describe('ProgressionService', () => {
  let storage: MemoryStorage;
  let progression: ProgressionService;

  beforeEach(() => {
    storage = new MemoryStorage();
    TestBed.configureTestingModule({ providers: [{ provide: SAVE_STORAGE, useValue: storage }] });
    progression = TestBed.inject(ProgressionService);
  });

  it('opens only 1-1 for a new player', () => {
    expect(progression.statuses().map((status) => status.availability)).toEqual([
      'open',
      'locked',
      'locked',
      'locked',
    ]);
    expect(progression.canPlay('1-1')).toBe(true);
    expect(progression.canPlay('1-2')).toBe(false);
    expect(progression.rank().rank.title).toBe('Trainee Courier');
  });

  it('records a clear, saves it at once and reports it', () => {
    const report = progression.recordClear(stageResult({ coinsCollected: 30, timeUsed: 100 }));
    expect(report?.stars).toEqual({ finish: true, postmarks: false, time: true });
    expect(progression.coins()).toBe(30);
    expect(progression.stars()).toBe(2);
    expect(progression.status('1-2')?.availability).toBe('open');
    expect(progression.canPlay('1-2')).toBe(true);
    expect(storage.getItem(SAVE_KEYS.primary)).toContain('"coins":30');
  });

  it('ignores stages without a level, such as the test room', () => {
    expect(progression.recordClear(stageResult({ stageId: 'test-room' }))).toBeNull();
    expect(storage.length).toBe(0);
  });
});
