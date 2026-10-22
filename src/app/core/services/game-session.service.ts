import { Injectable, inject, signal } from '@angular/core';
import { GameBridge } from '../../../game-engine/core/game-bridge';
import type { GameCommand, GameEvent, PerfSample } from '../../../game-engine/core/game-events';
import { GAME_FACTORY, type GameHandle, type GameOptions } from '../game-factory.token';

interface ActiveSession {
  readonly handle: GameHandle;
  readonly bridge: GameBridge;
}

@Injectable()
export class GameSessionService {
  private readonly factory = inject(GAME_FACTORY);
  private readonly loadedState = signal(false);
  private readonly pausedState = signal(false);
  private readonly perfState = signal<PerfSample | null>(null);
  private session: ActiveSession | null = null;

  readonly loaded = this.loadedState.asReadonly();
  readonly paused = this.pausedState.asReadonly();
  readonly perf = this.perfState.asReadonly();

  attach(host: HTMLElement, options: GameOptions): void {
    if (this.session) throw new Error('GameSessionService is already attached');
    this.loadedState.set(false);
    this.pausedState.set(false);
    this.perfState.set(null);
    const bridge = new GameBridge();
    bridge.onEvent((event) => this.applyEvent(event));
    try {
      this.session = { bridge, handle: this.factory(host, bridge, options) };
    } catch (error) {
      bridge.dispose();
      throw error;
    }
  }

  send(command: GameCommand): void {
    this.session?.bridge.send(command);
  }

  resize(viewportCssHeight: number, devicePixelRatio: number): void {
    this.session?.handle.resize(viewportCssHeight, devicePixelRatio);
  }

  detach(): void {
    const session = this.session;
    if (!session) return;
    this.session = null;
    session.handle.destroy();
    session.bridge.dispose();
  }

  private applyEvent(event: GameEvent): void {
    switch (event.type) {
      case 'loadComplete':
        this.loadedState.set(true);
        break;
      case 'paused':
        this.pausedState.set(true);
        break;
      case 'resumed':
        this.pausedState.set(false);
        break;
      case 'perfSample':
        this.perfState.set(event.sample);
        break;
    }
  }
}
