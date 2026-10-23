import { describe, expect, it } from 'vitest';
import { CHAIN_START, SCORE_LADDER } from '../../configuration/scoring.config';
import { ONE_UP, ScoreChain, ladderAward } from './score-chain';

describe('ScoreChain', () => {
  it('climbs the ladder and ends in repeated 1-ups', () => {
    const chain = new ScoreChain(SCORE_LADDER);
    const awards = Array.from({ length: SCORE_LADDER.length + 2 }, () => chain.next());
    expect(awards.slice(0, 4)).toEqual([100, 200, 400, 500]);
    expect(awards[SCORE_LADDER.length - 1]).toBe(8000);
    expect(awards.slice(-2)).toEqual([ONE_UP, ONE_UP]);
  });

  it('starts shell chains at 500 and resets to its start', () => {
    const chain = new ScoreChain(SCORE_LADDER, CHAIN_START.shell);
    expect(chain.next()).toBe(500);
    expect(chain.next()).toBe(800);
    chain.reset();
    expect(chain.next()).toBe(500);
  });

  it('reads a single rung by index', () => {
    expect(ladderAward(SCORE_LADDER, 0)).toBe(100);
    expect(ladderAward(SCORE_LADDER, 99)).toBe(ONE_UP);
  });
});
