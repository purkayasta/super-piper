import { describe, expect, it } from 'vitest';
import { SCORING } from '../../configuration/scoring.config';
import { StageSession } from './stage-session';

function session(): StageSession {
  const created = new StageSession(400, 3, SCORING);
  created.consumeChange();
  return created;
}

describe('StageSession', () => {
  it('starts with the time limit and lives, flagged as changed', () => {
    const created = new StageSession(400, 3, SCORING);
    expect(created.snapshot()).toEqual({ score: 0, coins: 0, timeLeft: 400, lives: 3 });
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
    const stage = new StageSession(2, 3, SCORING);
    stage.tick(5000);
    expect(stage.hud.timeLeft).toBe(0);
    const stopped = session();
    stopped.stopClock();
    stopped.tick(5000);
    expect(stopped.hud.timeLeft).toBe(400);
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
