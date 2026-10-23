import { describe, expect, it } from 'vitest';
import { SCORING } from '../../configuration/scoring.config';
import { StageSession, type RunTotals } from './stage-session';

const FRESH_RUN: RunTotals = { score: 0, coins: 0, lives: 3 };

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
    const restarted = new StageSession(400, { score: 4200, coins: 12, lives: 2 }, SCORING, 2);
    expect(restarted.snapshot()).toMatchObject({ score: 4200, coins: 12, lives: 2, timeLeft: 400 });
    expect(restarted.postmarks).toBe(2);
    expect(restarted.totals()).toEqual({ score: 4200, coins: 12, lives: 2 });
  });

  it('adds and loses lives, never below zero', () => {
    const stage = session();
    stage.addLife();
    expect(stage.hud.lives).toBe(4);
    expect(stage.consumeChange()).toBe(true);
    expect(stage.loseLife()).toBe(3);
    const last = new StageSession(400, { score: 0, coins: 0, lives: 0 }, SCORING);
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
});
