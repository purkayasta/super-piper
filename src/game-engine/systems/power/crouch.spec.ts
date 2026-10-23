import { describe, expect, it } from 'vitest';
import { nextCrouching } from './crouch';

describe('nextCrouching', () => {
  it('never crouches small Pip', () => {
    expect(nextCrouching(false, 'small', true, true, true)).toBe(false);
    expect(nextCrouching(true, 'small', true, true, true)).toBe(false);
  });

  it('starts crouching only on the ground with down held', () => {
    expect(nextCrouching(false, 'big', true, true, true)).toBe(true);
    expect(nextCrouching(false, 'spark', true, false, true)).toBe(false);
    expect(nextCrouching(false, 'big', false, true, true)).toBe(false);
  });

  it('stays crouched while down is held, even in the air', () => {
    expect(nextCrouching(true, 'big', true, false, true)).toBe(true);
  });

  it('stands up on release only with headroom', () => {
    expect(nextCrouching(true, 'big', false, true, true)).toBe(false);
    expect(nextCrouching(true, 'big', false, true, false)).toBe(true);
  });
});
