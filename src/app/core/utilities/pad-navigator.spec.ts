import { describe, expect, it } from 'vitest';
import { PAD_NAVIGATION, PadNavigator, type PadSnapshot } from './pad-navigator';

function pad(pressed: number[] = [], axisX = 0, axisY = 0): PadSnapshot {
  const buttons: boolean[] = [];
  for (const button of pressed) buttons[button] = true;
  return { buttons, axisX, axisY };
}

describe('PadNavigator', () => {
  it('turns button presses into confirm, back and start once per press', () => {
    const navigator = new PadNavigator();
    expect(navigator.poll(pad(), 0)).toBeNull();
    expect(navigator.poll(pad([0]), 16)).toBe('confirm');
    expect(navigator.poll(pad([0]), 32)).toBeNull();
    expect(navigator.poll(pad(), 48)).toBeNull();
    expect(navigator.poll(pad([1]), 64)).toBe('back');
    expect(navigator.poll(pad([9]), 80)).toBe('start');
  });

  it('ignores buttons and directions already held when it starts', () => {
    const navigator = new PadNavigator();
    expect(navigator.poll(pad([0, 9, 13]), 0)).toBeNull();
    expect(navigator.poll(pad([0, 9, 13]), 1000)).toBeNull();
    expect(navigator.poll(pad(), 1016)).toBeNull();
    expect(navigator.poll(pad([0]), 1032)).toBe('confirm');
  });

  it('latches again after a reset', () => {
    const navigator = new PadNavigator();
    navigator.poll(pad(), 0);
    navigator.reset();
    expect(navigator.poll(pad([15]), 16)).toBeNull();
  });

  it('moves with the d-pad and the stick, repeating while held', () => {
    const navigator = new PadNavigator();
    navigator.poll(pad(), 0);
    expect(navigator.poll(pad([], 0, 0.9), 10)).toBe('down');
    expect(navigator.poll(pad([], 0, 0.9), 20)).toBeNull();
    const firstRepeat = 10 + PAD_NAVIGATION.repeatDelayMs;
    expect(navigator.poll(pad([], 0, 0.9), firstRepeat)).toBe('down');
    expect(navigator.poll(pad([], 0, 0.9), firstRepeat + 10)).toBeNull();
    expect(navigator.poll(pad([], 0, 0.9), firstRepeat + PAD_NAVIGATION.repeatMs)).toBe('down');
    expect(navigator.poll(pad([14]), 2000)).toBe('left');
    expect(navigator.poll(pad([], -0.2, 0), 2010)).toBeNull();
  });

  it('forgets everything when the pad goes away', () => {
    const navigator = new PadNavigator();
    navigator.poll(pad(), 0);
    navigator.poll(pad([0]), 10);
    expect(navigator.poll(null, 20)).toBeNull();
    expect(navigator.poll(pad([0]), 30)).toBe('confirm');
  });
});
