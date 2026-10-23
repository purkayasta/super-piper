import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, type KeyBindings } from '../../../game-engine/systems/input/actions';
import { isReservedCode, keyLabel, rebindKey, validateBindings } from './key-binding-rules';

describe('rebindKey', () => {
  it('makes a free key the primary key, replacing the old primary', () => {
    const next = rebindKey(DEFAULT_BINDINGS, 'jump', 'KeyL');
    expect(next.jump).toEqual(['KeyL', 'KeyZ', 'KeyK']);
    expect(next.left).toBe(DEFAULT_BINDINGS.left);
  });

  it('takes a key from another action that has keys to spare', () => {
    const next = rebindKey(DEFAULT_BINDINGS, 'jump', 'KeyX');
    expect(next.jump[0]).toBe('KeyX');
    expect(next.run).toEqual(['ShiftLeft', 'ShiftRight', 'KeyJ']);
  });

  it('swaps when taking the only key of another action', () => {
    const sparse: KeyBindings = { ...DEFAULT_BINDINGS, pause: ['KeyP'] };
    const next = rebindKey(sparse, 'jump', 'KeyP');
    expect(next.jump).toEqual(['KeyP', 'KeyZ', 'KeyK']);
    expect(next.pause).toEqual(['Space']);
  });

  it('promotes one of the action’s own keys without duplicating it', () => {
    const next = rebindKey(DEFAULT_BINDINGS, 'jump', 'KeyK');
    expect(next.jump).toEqual(['KeyK', 'KeyZ']);
  });

  it('ignores reserved keys and the current primary', () => {
    expect(rebindKey(DEFAULT_BINDINGS, 'jump', 'Tab')).toBe(DEFAULT_BINDINGS);
    expect(rebindKey(DEFAULT_BINDINGS, 'jump', 'Backquote')).toBe(DEFAULT_BINDINGS);
    expect(rebindKey(DEFAULT_BINDINGS, 'jump', 'F2')).toBe(DEFAULT_BINDINGS);
    expect(rebindKey(DEFAULT_BINDINGS, 'jump', 'Space')).toBe(DEFAULT_BINDINGS);
  });

  it('always leaves a valid set of bindings', () => {
    let bindings = DEFAULT_BINDINGS;
    for (const code of ['KeyX', 'ArrowLeft', 'Escape', 'KeyA', 'ShiftLeft']) {
      bindings = rebindKey(bindings, 'jump', code);
      expect(validateBindings(bindings)).toEqual(bindings);
    }
  });
});

describe('validateBindings', () => {
  it('accepts the defaults', () => {
    expect(validateBindings(DEFAULT_BINDINGS)).toEqual(DEFAULT_BINDINGS);
  });

  it('fills a missing action with its default keys', () => {
    const { pause: _pause, ...withoutPause } = DEFAULT_BINDINGS;
    expect(validateBindings(withoutPause)?.pause).toEqual(DEFAULT_BINDINGS.pause);
  });

  it.each([
    ['not an object', 'Space'],
    ['an empty action', { ...DEFAULT_BINDINGS, jump: [] }],
    ['a non-string key', { ...DEFAULT_BINDINGS, jump: [32] }],
    ['a reserved key', { ...DEFAULT_BINDINGS, jump: ['Tab'] }],
    ['a key on two actions', { ...DEFAULT_BINDINGS, jump: ['ArrowLeft'] }],
    ['a repeated key', { ...DEFAULT_BINDINGS, jump: ['Space', 'Space'] }],
  ])('rejects %s', (_name, value) => {
    expect(validateBindings(value)).toBeNull();
  });
});

describe('keys', () => {
  it('reserves focus, dev and browser keys only', () => {
    expect(isReservedCode('Tab')).toBe(true);
    expect(isReservedCode('F12')).toBe(true);
    expect(isReservedCode('MetaLeft')).toBe(true);
    expect(isReservedCode('KeyQ')).toBe(false);
    expect(isReservedCode('Escape')).toBe(false);
  });

  it('labels key codes for the screen', () => {
    expect(keyLabel('KeyZ')).toBe('Z');
    expect(keyLabel('Digit4')).toBe('4');
    expect(keyLabel('ArrowLeft')).toBe('LEFT');
    expect(keyLabel('ShiftRight')).toBe('R-SHIFT');
    expect(keyLabel('Space')).toBe('SPACE');
    expect(keyLabel('Escape')).toBe('ESC');
    expect(keyLabel('Numpad7')).toBe('NUM 7');
    expect(keyLabel('Semicolon')).toBe('SEMICOLON');
  });
});
