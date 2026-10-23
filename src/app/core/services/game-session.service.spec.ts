import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { GameBridge } from '../../../game-engine/core/game-bridge';
import type { HudState, PerfSample, StageResult } from '../../../game-engine/core/game-events';
import { GAME_FACTORY, type GameHandle, type GameOptions } from '../game-factory.token';
import { GameSessionService } from './game-session.service';

const options: GameOptions = { quality: 'high', devTools: true, initialStageId: 'test-room' };

const sample: PerfSample = {
  fps: 60,
  avgFrameMs: 16.6,
  p95FrameMs: 17,
  longFrames: 0,
  offStepFrames: 0,
  refreshHz: 60,
  physicsHz: 60,
  activeBodies: 3,
};

describe('GameSessionService', () => {
  let handle: GameHandle;
  let factory: ReturnType<typeof vi.fn>;
  let bridge: GameBridge;
  let service: GameSessionService;
  let host: HTMLElement;

  beforeEach(() => {
    handle = { destroy: vi.fn(), resize: vi.fn() };
    factory = vi.fn((_parent: HTMLElement, gameBridge: GameBridge) => {
      bridge = gameBridge;
      return handle;
    });
    TestBed.configureTestingModule({
      providers: [GameSessionService, { provide: GAME_FACTORY, useValue: factory }],
    });
    service = TestBed.inject(GameSessionService);
    host = document.createElement('div');
  });

  it('calls the factory once with the host on attach', () => {
    service.attach(host, options);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory.mock.calls[0][0]).toBe(host);
    expect(factory.mock.calls[0][2]).toBe(options);
  });

  it('throws on a second attach', () => {
    service.attach(host, options);
    expect(() => service.attach(host, options)).toThrow();
  });

  it('updates perf when a perfSample is emitted', () => {
    service.attach(host, options);
    expect(service.perf()).toBeNull();
    bridge.emit({ type: 'perfSample', sample });
    expect(service.perf()).toEqual(sample);
  });

  it('sets loaded when loadComplete is emitted', () => {
    service.attach(host, options);
    expect(service.loaded()).toBe(false);
    bridge.emit({ type: 'loadComplete', stageId: 'sandbox', stageLabel: 'SANDBOX' });
    expect(service.loaded()).toBe(true);
  });

  it('tracks load progress and the stage label', () => {
    service.attach(host, options);
    bridge.emit({ type: 'loadProgress', progress: 0.4 });
    expect(service.loadProgress()).toBe(0.4);
    bridge.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    expect(service.loadProgress()).toBe(1);
    expect(service.stageLabel()).toBe('1-1');
  });

  it('mirrors HUD changes and the stage result', () => {
    const hud: HudState = { score: 200, coins: 1, timeLeft: 399, lives: 3 };
    const result: StageResult = {
      stageId: '1-1',
      score: 5000,
      coins: 12,
      timeLeft: 210,
      postmarks: 2,
    };
    service.attach(host, options);
    expect(service.hud()).toBeNull();
    bridge.emit({ type: 'hudChanged', hud });
    expect(service.hud()).toEqual(hud);
    bridge.emit({ type: 'stageComplete', result });
    expect(service.stageResult()).toEqual(result);
  });

  it('tracks paused and resumed', () => {
    service.attach(host, options);
    bridge.emit({ type: 'paused' });
    expect(service.paused()).toBe(true);
    bridge.emit({ type: 'resumed' });
    expect(service.paused()).toBe(false);
  });

  it('forwards commands and resize to the engine', () => {
    const received: unknown[] = [];
    service.attach(host, options);
    bridge.onCommand((command) => received.push(command));
    service.send({ type: 'pause' });
    service.resize(864, 480, 2);
    expect(received).toEqual([{ type: 'pause' }]);
    expect(handle.resize).toHaveBeenCalledWith(864, 480, 2);
  });

  it('ignores send and resize when not attached', () => {
    expect(() => service.send({ type: 'pause' })).not.toThrow();
    expect(() => service.resize(864, 480, 1)).not.toThrow();
  });

  it('destroys the game and disposes the bridge on detach, safely twice', () => {
    service.attach(host, options);
    service.detach();
    service.detach();
    expect(handle.destroy).toHaveBeenCalledTimes(1);
    expect(bridge.listenerCount()).toBe(0);
  });

  it('resets every mirrored value on a new attach', () => {
    service.attach(host, options);
    bridge.emit({ type: 'loadComplete', stageId: 'sandbox', stageLabel: 'SANDBOX' });
    bridge.emit({ type: 'hudChanged', hud: { score: 1, coins: 1, timeLeft: 1, lives: 1 } });
    bridge.emit({
      type: 'stageComplete',
      result: { stageId: 'sandbox', score: 1, coins: 1, timeLeft: 1, postmarks: 0 },
    });
    bridge.emit({ type: 'paused' });
    bridge.emit({ type: 'perfSample', sample });
    service.detach();
    service.attach(host, options);
    expect(service.loaded()).toBe(false);
    expect(service.paused()).toBe(false);
    expect(service.perf()).toBeNull();
    expect(service.loadProgress()).toBe(0);
    expect(service.stageLabel()).toBe('');
    expect(service.hud()).toBeNull();
    expect(service.stageResult()).toBeNull();
  });

  it('disposes the bridge and stays detached when the factory throws', () => {
    factory.mockImplementationOnce((_parent: HTMLElement, gameBridge: GameBridge) => {
      bridge = gameBridge;
      throw new Error('boom');
    });
    expect(() => service.attach(host, options)).toThrow('boom');
    expect(bridge.listenerCount()).toBe(0);
    expect(() => service.attach(host, options)).not.toThrow();
  });

  it('allows attaching again after detach with a fresh bridge', () => {
    service.attach(host, options);
    const firstBridge = bridge;
    service.detach();
    service.attach(host, options);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(bridge).not.toBe(firstBridge);
  });
});
