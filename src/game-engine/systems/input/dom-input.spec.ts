import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BINDINGS } from './actions';
import { DomInput } from './dom-input';

function press(type: 'keydown' | 'keyup', code: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent(type, { code, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

function fakeGamepad(axisX: number, pressedButtons: number[]): Gamepad {
  return {
    connected: true,
    axes: [axisX, 0],
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressedButtons.includes(index),
      touched: false,
      value: 0,
    })),
  } as unknown as Gamepad;
}

describe('DomInput', () => {
  let input: DomInput;

  afterEach(() => {
    input.detach();
    vi.restoreAllMocks();
  });

  it('tracks bound keys from window events and resolves actions', () => {
    input = new DomInput();
    input.attach(window);
    press('keydown', 'ArrowRight');
    press('keydown', 'KeyX');
    expect(input.resolve()).toMatchObject({ right: true, run: true, left: false });
    press('keyup', 'ArrowRight');
    expect(input.resolve().right).toBe(false);
  });

  it('reuses one action object', () => {
    input = new DomInput();
    input.attach(window);
    expect(input.resolve()).toBe(input.resolve());
  });

  it('prevents default only for bound movement keys without shortcut modifiers', () => {
    input = new DomInput();
    input.attach(window);
    expect(press('keydown', 'Space').defaultPrevented).toBe(true);
    expect(press('keydown', 'ArrowLeft').defaultPrevented).toBe(true);
    expect(press('keydown', 'F5').defaultPrevented).toBe(false);
    expect(press('keydown', 'F12').defaultPrevented).toBe(false);
    expect(press('keydown', 'KeyD', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(press('keydown', 'Enter').defaultPrevented).toBe(false);
  });

  it.each([
    ['input', () => document.createElement('input')],
    ['textarea', () => document.createElement('textarea')],
    ['select', () => document.createElement('select')],
    ['button', () => document.createElement('button')],
    [
      'contenteditable',
      () => {
        const host = document.createElement('div');
        host.setAttribute('contenteditable', 'true');
        const child = document.createElement('span');
        host.append(child);
        return child;
      },
    ],
  ])('ignores key presses typed into a %s', (_name, createTarget) => {
    input = new DomInput();
    input.attach(window);
    const target = createTarget();
    const root = target.parentElement ?? target;
    document.body.append(root);
    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true, bubbles: true });
    target.dispatchEvent(event);
    root.remove();
    expect(event.defaultPrevented).toBe(false);
    expect(input.resolve().jump).toBe(false);
  });

  it('still releases a held key when the key-up lands in a text field', () => {
    input = new DomInput();
    input.attach(window);
    press('keydown', 'ArrowRight');
    const field = document.createElement('input');
    document.body.append(field);
    field.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', bubbles: true }));
    field.remove();
    expect(input.resolve().right).toBe(false);
  });

  it('uses the bindings it is given', () => {
    input = new DomInput({ ...DEFAULT_BINDINGS, jump: ['KeyP'] });
    input.attach(window);
    press('keydown', 'Space');
    expect(input.resolve().jump).toBe(false);
    press('keydown', 'KeyP');
    expect(input.resolve().jump).toBe(true);
    expect(press('keydown', 'KeyP').defaultPrevented).toBe(true);
  });

  it('reports a pause press once until the key is released', () => {
    input = new DomInput();
    input.attach(window);
    expect(input.consumePausePress()).toBe(false);
    press('keydown', 'Escape');
    expect(input.consumePausePress()).toBe(true);
    expect(input.consumePausePress()).toBe(false);
    press('keyup', 'Escape');
    expect(input.consumePausePress()).toBe(false);
    press('keydown', 'Enter');
    expect(input.consumePausePress()).toBe(true);
  });

  it('ignores a pause key held from before the game was paused', () => {
    input = new DomInput();
    input.attach(window);
    input.consumePausePress();
    input.releaseAll();
    press('keydown', 'Escape');
    expect(input.consumePausePress()).toBe(false);
    press('keyup', 'Escape');
    input.consumePausePress();
    press('keydown', 'Escape');
    expect(input.consumePausePress()).toBe(true);
  });

  it('treats a key held since the stage started as already handled', () => {
    input = new DomInput();
    input.attach(window);
    press('keydown', 'Escape');
    expect(input.consumePausePress()).toBe(false);
  });

  it('pauses on the gamepad Start button', () => {
    const getGamepads = vi.fn(() => [fakeGamepad(0, [])]);
    Object.defineProperty(navigator, 'getGamepads', { value: getGamepads, configurable: true });
    input = new DomInput();
    input.attach(window);
    input.pollGamepad();
    input.consumePausePress();
    getGamepads.mockReturnValue([fakeGamepad(0, [9])]);
    input.pollGamepad();
    expect(input.consumePausePress()).toBe(true);
    delete (navigator as unknown as Record<string, unknown>)['getGamepads'];
  });

  it('releases everything on window blur', () => {
    input = new DomInput();
    input.attach(window);
    press('keydown', 'ArrowRight');
    window.dispatchEvent(new Event('blur'));
    expect(input.resolve().right).toBe(false);
  });

  it('releases everything when the document becomes hidden', () => {
    input = new DomInput();
    input.attach(window);
    press('keydown', 'Space');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(input.resolve().jump).toBe(false);
  });

  it('stops listening after detach', () => {
    input = new DomInput();
    input.attach(window);
    input.detach();
    press('keydown', 'ArrowRight');
    expect(input.resolve().right).toBe(false);
    expect(press('keydown', 'Space').defaultPrevented).toBe(false);
  });

  it('reads a connected gamepad once per poll', () => {
    const getGamepads = vi.fn(() => [null, fakeGamepad(0.9, [0])]);
    Object.defineProperty(navigator, 'getGamepads', { value: getGamepads, configurable: true });
    input = new DomInput();
    input.attach(window);
    getGamepads.mockClear();
    input.pollGamepad();
    expect(getGamepads).toHaveBeenCalledTimes(1);
    expect(input.resolve()).toMatchObject({ right: true, jump: true, left: false });
    delete (navigator as unknown as Record<string, unknown>)['getGamepads'];
  });

  it('never polls when no gamepad has connected', () => {
    input = new DomInput();
    input.attach(window);
    input.pollGamepad();
    expect(input.resolve().right).toBe(false);
  });
});
