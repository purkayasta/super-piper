import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuIntent } from '../utilities/pad-navigator';
import { GamepadMenuService } from './gamepad-menu.service';

function gamepad(pressed: number[]): Gamepad {
  return {
    connected: true,
    axes: [0, 0],
    buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: pressed.includes(index) })),
  } as unknown as Gamepad;
}

describe('GamepadMenuService', () => {
  let frames: FrameRequestCallback[];
  let pads: (Gamepad | null)[];

  beforeEach(() => {
    frames = [];
    pads = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    Object.defineProperty(navigator, 'getGamepads', { value: () => pads, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as unknown as Record<string, unknown>)['getGamepads'];
  });

  function runFrame(nowMs: number): void {
    const callback = frames.shift();
    callback?.(nowMs);
  }

  it('does not poll without a connected pad', () => {
    const service = TestBed.inject(GamepadMenuService);
    service.register({ handleIntent: vi.fn() });
    expect(frames).toHaveLength(0);
  });

  it('polls while a menu is registered and sends intents to the newest menu', () => {
    pads = [gamepad([])];
    const service = TestBed.inject(GamepadMenuService);
    const older: MenuIntent[] = [];
    const newer: MenuIntent[] = [];
    service.register({ handleIntent: (intent) => older.push(intent) });
    const unregister = service.register({ handleIntent: (intent) => newer.push(intent) });
    runFrame(0);
    pads = [gamepad([1])];
    runFrame(16);
    expect(newer).toEqual(['back']);
    expect(older).toEqual([]);
    unregister();
    pads = [gamepad([])];
    runFrame(32);
    pads = [gamepad([0])];
    runFrame(48);
    expect(older).toEqual(['confirm']);
  });

  it('starts polling when a pad connects and stops when the last menu leaves', () => {
    const service = TestBed.inject(GamepadMenuService);
    const unregister = service.register({ handleIntent: vi.fn() });
    pads = [gamepad([])];
    window.dispatchEvent(new Event('gamepadconnected'));
    expect(frames).toHaveLength(1);
    unregister();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
