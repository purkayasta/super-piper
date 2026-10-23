import { describe, expect, it } from 'vitest';
import { SCORING } from '../../configuration/scoring.config';
import { StageSession, type RunTotals } from './stage-session';

const FRESH_RUN: RunTotals = { score: 0, coins: 0, lives: 3, coinsCollected: 0 };

function session(): StageSession {
  const created = new StageSession(400, FRESH_RUN, SCORING);
  created.consumeChange();
  return created;
}

describe('StageSession', () => {
  it('starts with the time limit and lives, flagged as changed', () => {
    const created = new StageSession(400, FRESH_RUN, SCORING);
    expect(created.snapshot()).toEqual({
      score: 0,
      coins: 0,
      timeLeft: 400,
      lives: 3,
      power: 'small',
    });
    expect(created.consumeChange()).toBe(true);
    expect(created.consumeChange()).toBe(false);
  });

  it('scores coins and Postmarks', () => {
    const stage = session();
    stage.addCoin();
    stage.collectPostmark();
    expect(stage.snapshot()).toMatchObject({ score: 1200, coins: 1 });
    expect(stage.postmarks).toBe(1);
    expect(stage.consumeChange()).toBe(true);
  });

  it('turns 100 coins into an extra life', () => {
    const stage = session();
    for (let i = 0; i < 100; i++) stage.addCoin();
    expect(stage.snapshot()).toMatchObject({ coins: 0, lives: 4 });
  });

  it('counts time down one unit per 400ms and reports only real changes', () => {
    const stage = session();
    stage.tick(399);
    expect(stage.consumeChange()).toBe(false);
    stage.tick(1);
    expect(stage.hud.timeLeft).toBe(399);
    expect(stage.consumeChange()).toBe(true);
    stage.tick(1200);
    expect(stage.hud.timeLeft).toBe(396);
  });

  it('stops at zero and when the clock is stopped', () => {
    const stage = new StageSession(2, FRESH_RUN, SCORING);
    stage.tick(5000);
    expect(stage.hud.timeLeft).toBe(0);
    expect(stage.timeUp).toBe(true);
    const stopped = session();
    stopped.stopClock();
    stopped.tick(5000);
    expect(stopped.hud.timeLeft).toBe(400);
    expect(stopped.timeUp).toBe(false);
  });

  it('carries the run totals and Postmarks into a restarted stage', () => {
    const restarted = new StageSession(
      400,
      { score: 4200, coins: 12, lives: 2, coinsCollected: 112 },
      SCORING,
      2,
    );
    expect(restarted.snapshot()).toMatchObject({ score: 4200, coins: 12, lives: 2, timeLeft: 400 });
    expect(restarted.postmarks).toBe(2);
    expect(restarted.totals()).toEqual({ score: 4200, coins: 12, lives: 2, coinsCollected: 112 });
  });

  it('adds and loses lives, never below zero', () => {
    const stage = session();
    stage.addLife();
    expect(stage.hud.lives).toBe(4);
    expect(stage.consumeChange()).toBe(true);
    expect(stage.loseLife()).toBe(3);
    const last = new StageSession(400, { ...FRESH_RUN, lives: 0 }, SCORING);
    expect(last.loseLife()).toBe(0);
  });

  it('reports power changes only when the form changes', () => {
    const stage = session();
    stage.setPower('small');
    expect(stage.consumeChange()).toBe(false);
    stage.setPower('spark');
    expect(stage.hud.power).toBe('spark');
    expect(stage.consumeChange()).toBe(true);
  });

  it('converts remaining time into bonus points', () => {
    const stage = new StageSession(10, FRESH_RUN, SCORING);
    expect(stage.convertTime(8)).toBe(8);
    expect(stage.convertTime(8)).toBe(2);
    expect(stage.convertTime(8)).toBe(0);
    expect(stage.snapshot()).toMatchObject({ timeLeft: 0, score: 10 * SCORING.timeBonusPerUnit });
  });

  it('ignores zero-point awards', () => {
    const stage = session();
    stage.addScore(0);
    expect(stage.consumeChange()).toBe(false);
  });

  it('returns snapshots that do not alias its state', () => {
    const stage = session();
    const snapshot = stage.snapshot();
    stage.addCoin();
    expect(snapshot.coins).toBe(0);
  });

  it('counts every coin collected, past the 100-coin wrap and across lives', () => {
    const stage = new StageSession(400, { ...FRESH_RUN, coins: 99, coinsCollected: 5 }, SCORING);
    stage.addCoin();
    stage.addCoin();
    expect(stage.hud.coins).toBe(1);
    expect(stage.coinsCollected).toBe(7);
    expect(stage.totals().coinsCollected).toBe(7);
  });

  it('counts the time units used, not the time converted at the goal', () => {
    const stage = new StageSession(400, FRESH_RUN, SCORING);
    stage.tick(SCORING.timeUnitMs * 3);
    stage.stopClock();
    stage.convertTime(100);
    expect(stage.timeUsed).toBe(3);
  });

  it('carries the clock into another area without losing a partial time unit', () => {
    const first = session();
    first.tick(SCORING.timeUnitMs * 3 + 150);
    const clock = first.clock();
    expect(clock).toEqual({ timeLeft: 397, unitsUsed: 3, unitElapsedMs: 150 });
    const next = new StageSession(400, first.totals(), SCORING, 0, clock);
    expect(next.hud.timeLeft).toBe(397);
    next.tick(SCORING.timeUnitMs - 150);
    expect(next.hud.timeLeft).toBe(396);
    expect(next.timeUsed).toBe(4);
  });
});

