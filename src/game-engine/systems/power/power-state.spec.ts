import { describe, expect, it } from 'vitest';
import { POWER_RULES } from '../../configuration/rules.config';
import { PipPower } from './power-state';

function finishTransition(power: PipPower): boolean {
  return power.step(POWER_RULES.transitionMs);
}

describe('PipPower', () => {
  it('grows small Pip with a Parcel Box, freezing the world during the transition', () => {
    const power = new PipPower(POWER_RULES);
    expect(power.collect('parcel-box')).toBe('transform');
    expect(power.form).toBe('big');
    expect(power.frozen).toBe(true);
    expect(power.transition).toBe('grow');
    expect(power.vulnerable).toBe(false);
    expect(finishTransition(power)).toBe(true);
    expect(power.frozen).toBe(false);
    expect(power.canBreakBricks).toBe(true);
  });

  it('alternates the shown form during a transition and settles on the new one', () => {
    const power = new PipPower(POWER_RULES);
    power.collect('parcel-box');
    expect(power.displayForm).toBe('small');
    power.step(POWER_RULES.transitionFrameMs);
    expect(power.displayForm).toBe('big');
    power.step(POWER_RULES.transitionFrameMs);
    expect(power.displayForm).toBe('small');
    finishTransition(power);
    expect(power.displayForm).toBe('big');
  });

  it('gives points for a Parcel Box once big', () => {
    const power = new PipPower(POWER_RULES, 'big');
    expect(power.collect('parcel-box')).toBe('points');
    expect(power.frozen).toBe(false);
  });

  it('turns big Pip into Spark Pip, and small Pip straight to Spark', () => {
    const big = new PipPower(POWER_RULES, 'big');
    expect(big.collect('spark-stamp')).toBe('transform');
    expect(big.transition).toBe('spark-up');
    finishTransition(big);
    expect(big.canThrow).toBe(true);
    expect(big.collect('spark-stamp')).toBe('points');
    const small = new PipPower(POWER_RULES);
    small.collect('spark-stamp');
    expect(small.transition).toBe('grow');
    expect(small.form).toBe('spark');
  });

  it('shrinks on damage, then ignores damage while invulnerable', () => {
    const power = new PipPower(POWER_RULES, 'spark');
    expect(power.damage()).toBe('shrink');
    expect(power.form).toBe('small');
    finishTransition(power);
    expect(power.invulnerable).toBe(true);
    expect(power.damage()).toBe('ignored');
    power.step(POWER_RULES.invulnerableMs / 2);
    expect(power.invulnerableElapsedMs).toBe(POWER_RULES.invulnerableMs / 2);
    power.step(POWER_RULES.invulnerableMs / 2);
    expect(power.invulnerable).toBe(false);
    expect(power.damage()).toBe('death');
  });

  it('keeps the invulnerability timer still while frozen', () => {
    const power = new PipPower(POWER_RULES, 'big');
    power.damage();
    power.step(POWER_RULES.transitionMs - 1);
    power.step(1);
    expect(power.invulnerableElapsedMs).toBe(0);
  });

  it('runs the Rush Star for its duration, flagging the ending', () => {
    const power = new PipPower(POWER_RULES);
    power.startStar();
    expect(power.starPower).toBe(true);
    expect(power.vulnerable).toBe(false);
    expect(power.damage()).toBe('ignored');
    power.step(POWER_RULES.starMs - POWER_RULES.starEndingMs);
    expect(power.starEnding).toBe(true);
    power.step(POWER_RULES.starEndingMs);
    expect(power.starPower).toBe(false);
    expect(power.vulnerable).toBe(true);
  });
});
