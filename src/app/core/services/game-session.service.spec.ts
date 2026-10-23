import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { GameBridge } from '../../../game-engine/core/game-bridge';
import type { HudState, PerfSample } from '../../../game-engine/core/game-events';
import { GAME_FACTORY, type GameHandle } from '../game-factory.token';
import { gameOptions, stageResult } from '../testing/game-fixtures.test-helpers';
import { AudioService } from './audio.service';
import { GameSessionService } from './game-session.service';

const options = gameOptions();

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

  it('stops every sound when the game is detached', () => {
    const stopAll = vi.spyOn(TestBed.inject(AudioService), 'stopAll');
    service.attach(host, options);
    service.detach();
    expect(stopAll).toHaveBeenCalledTimes(1);
  });

  it('calls the factory once with the host on attach', () => {
    service.attach(host, options);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory.mock.calls[0][0]).toBe(host);
    expect(factory.mock.calls[0][2]).toBe(options);
    expect(factory.mock.calls[0][3]).toBe(TestBed.inject(AudioService).gameAudio);
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
    const hud: HudState = { score: 200, coins: 1, timeLeft: 399, lives: 3, power: 'small' };
    const result = stageResult({ score: 5000 });
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
    bridge.emit({
      type: 'hudChanged',
      hud: { score: 1, coins: 1, timeLeft: 1, lives: 1, power: 'big' },
    });
    bridge.emit({
      type: 'stageComplete',
      result: stageResult({ stageId: 'sandbox' }),
    });
    bridge.emit({
      type: 'gameOver',
      result: stageResult({ stageId: 'sandbox' }),
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
    expect(service.gameOver()).toBeNull();
  });

  it('shows game over until the stage loads again', () => {
    const result = stageResult({ score: 900 });
    service.attach(host, options);
    bridge.emit({ type: 'playerDied', stageId: '1-1', livesLeft: 0 });
    expect(service.gameOver()).toBeNull();
    bridge.emit({ type: 'gameOver', result });
    expect(service.gameOver()).toEqual(result);
    bridge.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    expect(service.gameOver()).toBeNull();
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

  it('reports a loading error until the stage loads', () => {
    service.attach(host, options);
    bridge.emit({ type: 'recoverableError', message: 'Unknown stage "9-9"' });
    expect(service.loadError()).toBe('Unknown stage "9-9"');
    bridge.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    bridge.emit({ type: 'recoverableError', message: 'later' });
    expect(service.loadError()).toBe('Unknown stage "9-9"');
    service.detach();
    service.attach(host, options);
    expect(service.loadError()).toBeNull();
  });

  describe('pausing', () => {
    let commands: unknown[];

    beforeEach(() => {
      service.attach(host, options);
      commands = [];
      bridge.onCommand((command) => commands.push(command));
    });

    function load(): void {
      bridge.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    }

    it('pauses a loaded stage on request, and when the stage asks', () => {
      load();
      service.requestPause();
      expect(commands).toEqual([{ type: 'pause' }]);
      bridge.emit({ type: 'paused' });
      bridge.emit({ type: 'pauseRequested' });
      expect(commands).toEqual([{ type: 'pause' }]);
      service.resume();
      bridge.emit({ type: 'resumed' });
      bridge.emit({ type: 'pauseRequested' });
      expect(commands).toEqual([{ type: 'pause' }, { type: 'resume' }, { type: 'pause' }]);
    });

    it('remembers a pause asked for during loading and applies it after load', async () => {
      service.requestPause();
      expect(commands).toEqual([]);
      load();
      expect(commands).toEqual([]);
      await Promise.resolve();
      expect(commands).toEqual([{ type: 'pause' }]);
    });

    it('drops a pending pause when the player resumes or restarts first', async () => {
      service.requestPause();
      service.resume();
      load();
      await Promise.resolve();
      expect(commands).toEqual([]);
    });

    it('never pauses over the results or game over', () => {
      load();
      bridge.emit({ type: 'stageComplete', result: stageResult() });
      service.requestPause();
      expect(service.canPause()).toBe(false);
      load();
      bridge.emit({ type: 'gameOver', result: stageResult() });
      service.requestPause();
      expect(commands).toEqual([]);
    });

    it('only resumes a paused game', () => {
      load();
      service.resume();
      expect(commands).toEqual([]);
    });

    it('restarts, and clears the results and pause once the stage loads again', () => {
      load();
      bridge.emit({ type: 'paused' });
      service.restart();
      expect(commands).toEqual([{ type: 'restart' }]);
      bridge.emit({ type: 'stageComplete', result: stageResult() });
      load();
      expect(service.paused()).toBe(false);
      expect(service.stageResult()).toBeNull();
    });
  });
});
