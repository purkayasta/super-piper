import { describe, expect, it } from 'vitest';
import { DEATH_RULES } from '../../configuration/rules.config';
import { DeathSequence } from './death-sequence';

const FRAME_MS = 1000 / 60;

function runFor(death: DeathSequence, ms: number): void {
  for (let t = 0; t < ms; t += FRAME_MS) death.step(FRAME_MS);
}

describe('DeathSequence', () => {
  it('holds still, hops up, then falls until done', () => {
    const death = new DeathSequence(DEATH_RULES);
    death.start(100, 'hit');
    runFor(death, DEATH_RULES.freezeMs - FRAME_MS);
    expect(death.phase).toBe('freeze');
    expect(death.y).toBe(100);
    runFor(death, 400);
    expect(death.phase).toBe('fall');
    expect(death.y).toBeLessThan(60);
    runFor(death, DEATH_RULES.durationMs);
    expect(death.done).toBe(true);
    expect(death.y).toBeGreaterThan(300);
  });

  it('hops on a time-out too', () => {
    const death = new DeathSequence(DEATH_RULES);
    death.start(100, 'time-up');
    runFor(death, DEATH_RULES.freezeMs + 200);
    expect(death.y).toBeLessThan(100);
  });

  it('waits without a hop after a pit', () => {
    const death = new DeathSequence(DEATH_RULES);
    death.start(250, 'pit');
    runFor(death, DEATH_RULES.pitDurationMs - FRAME_MS);
    expect(death.active).toBe(true);
    expect(death.y).toBe(250);
    runFor(death, FRAME_MS * 2);
    expect(death.done).toBe(true);
  });

  it('does nothing until started', () => {
    const death = new DeathSequence(DEATH_RULES);
    death.step(5000);
    expect(death.phase).toBe('inactive');
  });
});
