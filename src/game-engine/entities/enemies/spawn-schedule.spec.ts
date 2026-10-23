import { describe, expect, it } from 'vitest';
import type { EnemySpawn } from '../../world/level-format';
import { SpawnSchedule } from './spawn-schedule';

const SPAWNS: EnemySpawn[] = [
  { kind: 'thornbug', column: 10, row: 12 },
  { kind: 'thornbug', column: 30, row: 12 },
  { kind: 'shellback', column: 31, row: 12 },
  { kind: 'flapjack', column: 60, row: 8 },
];

describe('SpawnSchedule', () => {
  it('wakes spawns in column order as the awake edge reaches them', () => {
    const schedule = new SpawnSchedule(SPAWNS);
    expect(schedule.nextDue(9)).toBeNull();
    expect(schedule.nextDue(10)?.column).toBe(10);
    schedule.consume();
    expect(schedule.nextDue(29)).toBeNull();
    expect(schedule.nextDue(31)?.column).toBe(30);
    schedule.consume();
    expect(schedule.nextDue(31)?.kind).toBe('shellback');
    schedule.consume();
    expect(schedule.remaining).toBe(1);
  });

  it('keeps a due spawn waiting until it is consumed', () => {
    const schedule = new SpawnSchedule(SPAWNS);
    expect(schedule.nextDue(40)?.column).toBe(10);
    expect(schedule.nextDue(40)?.column).toBe(10);
  });

  it('skips spawns behind the start view', () => {
    const schedule = new SpawnSchedule(SPAWNS);
    schedule.skipBefore(31);
    expect(schedule.nextDue(100)?.kind).toBe('shellback');
    schedule.skipBefore(1000);
    expect(schedule.nextDue(10_000)).toBeNull();
    schedule.consume();
    expect(schedule.remaining).toBe(0);
  });
});
