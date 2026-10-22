import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, createActionState, resolveActions } from './actions';

const NONE = { left: false, right: false, down: false, jump: false, run: false };

describe('resolveActions', () => {
  it('maps ArrowRight to right', () => {
    expect(
      resolveActions(new Set(['ArrowRight']), DEFAULT_BINDINGS, null, createActionState()),
    ).toEqual({
      ...NONE,
      right: true,
    });
  });

  it('maps KeyD and ShiftLeft to right and run', () => {
    expect(
      resolveActions(new Set(['KeyD', 'ShiftLeft']), DEFAULT_BINDINGS, null, createActionState()),
    ).toEqual({
      ...NONE,
      right: true,
      run: true,
    });
  });

  it('maps Space to jump', () => {
    expect(
      resolveActions(new Set(['Space']), DEFAULT_BINDINGS, null, createActionState()).jump,
    ).toBe(true);
  });

  it('maps pad axis and buttons', () => {
    expect(
      resolveActions(new Set(), DEFAULT_BINDINGS, { axisX: -0.8, buttons: [] }, createActionState())
        .left,
    ).toBe(true);
    expect(
      resolveActions(
        new Set(),
        DEFAULT_BINDINGS,
        { axisX: 0, buttons: [true] },
        createActionState(),
      ).jump,
    ).toBe(true);
  });

  it('maps pad d-pad and run', () => {
    const buttons: boolean[] = [];
    buttons[2] = true;
    buttons[13] = true;
    buttons[15] = true;
    expect(
      resolveActions(new Set(), DEFAULT_BINDINGS, { axisX: 0, buttons }, createActionState()),
    ).toEqual({
      ...NONE,
      down: true,
      right: true,
      run: true,
    });
  });

  it('returns all false for no input', () => {
    expect(resolveActions(new Set(), DEFAULT_BINDINGS, null, createActionState())).toEqual(NONE);
  });

  it('writes into the provided out object', () => {
    const out = { ...NONE, left: true };
    const result = resolveActions(new Set(['Space']), DEFAULT_BINDINGS, null, out);
    expect(result).toBe(out);
    expect(out).toEqual({ ...NONE, jump: true });
  });
});
