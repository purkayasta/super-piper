import { describe, expect, it, vi } from 'vitest';
import { GameBridge } from './game-bridge';

describe('GameBridge', () => {
  it('delivers commands to command handlers only', () => {
    const bridge = new GameBridge();
    const commandHandler = vi.fn();
    const eventHandler = vi.fn();
    bridge.onCommand(commandHandler);
    bridge.onEvent(eventHandler);
    const command = { type: 'pause' } as const;

    bridge.send(command);

    expect(commandHandler).toHaveBeenCalledTimes(1);
    expect(commandHandler).toHaveBeenCalledWith(command);
    expect(eventHandler).not.toHaveBeenCalled();
  });

  it('delivers events to event handlers only', () => {
    const bridge = new GameBridge();
    const commandHandler = vi.fn();
    const eventHandler = vi.fn();
    bridge.onCommand(commandHandler);
    bridge.onEvent(eventHandler);
    const event = { type: 'paused' } as const;

    bridge.emit(event);

    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler).toHaveBeenCalledWith(event);
    expect(commandHandler).not.toHaveBeenCalled();
  });

  it('unsubscribe stops delivery', () => {
    const bridge = new GameBridge();
    const handler = vi.fn();
    const unsubscribe = bridge.onCommand(handler);
    const countBefore = bridge.listenerCount();

    unsubscribe();
    bridge.send({ type: 'pause' });

    expect(handler).not.toHaveBeenCalled();
    expect(bridge.listenerCount()).toBe(countBefore - 1);
  });

  it('dispose removes every listener and silences later calls', () => {
    const bridge = new GameBridge();
    const handlers = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    bridge.onCommand(handlers[0]);
    bridge.onCommand(handlers[1]);
    bridge.onEvent(handlers[2]);
    bridge.onEvent(handlers[3]);

    bridge.dispose();
    bridge.send({ type: 'resume' });
    bridge.emit({ type: 'resumed' });

    expect(bridge.listenerCount()).toBe(0);
    handlers.forEach((handler) => expect(handler).not.toHaveBeenCalled());
  });

  it('a throwing handler does not stop other handlers', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bridge = new GameBridge();
    const failure = new Error('boom');
    const second = vi.fn();
    bridge.onCommand(() => {
      throw failure;
    });
    bridge.onCommand(second);

    bridge.send({ type: 'restart' });

    expect(second).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
