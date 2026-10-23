import { Injectable, computed, inject, signal } from '@angular/core';
import { GameBridge } from '../../../game-engine/core/game-bridge';
import type {
  GameCommand,
  GameEvent,
  HudState,
  PerfSample,
  StageResult,
} from '../../../game-engine/core/game-events';
import { GAME_FACTORY, type GameHandle, type GameOptions } from '../game-factory.token';
import { AudioService } from './audio.service';

interface ActiveSession {
  readonly handle: GameHandle;
  readonly bridge: GameBridge;
}

@Injectable()
export class GameSessionService {
  private readonly factory = inject(GAME_FACTORY);
  private readonly audio = inject(AudioService);
  private readonly loadedState = signal(false);
  private readonly pausedState = signal(false);
  private readonly perfState = signal<PerfSample | null>(null);
  private readonly loadProgressState = signal(0);
  private readonly stageLabelState = signal('');
  private readonly hudState = signal<HudState | null>(null);
  private readonly stageResultState = signal<StageResult | null>(null);
  private readonly gameOverState = signal<StageResult | null>(null);
  private readonly loadErrorState = signal<string | null>(null);
  private session: ActiveSession | null = null;
  private pauseWanted = false;

  readonly loaded = this.loadedState.asReadonly();
  readonly paused = this.pausedState.asReadonly();
  readonly perf = this.perfState.asReadonly();
  readonly loadProgress = this.loadProgressState.asReadonly();
  readonly stageLabel = this.stageLabelState.asReadonly();
  readonly hud = this.hudState.asReadonly();
  readonly stageResult = this.stageResultState.asReadonly();
  readonly gameOver = this.gameOverState.asReadonly();
  readonly loadError = this.loadErrorState.asReadonly();
  readonly canPause = computed(
    () =>
      this.loadedState() &&
      !this.pausedState() &&
      this.stageResultState() === null &&
      this.gameOverState() === null,
  );

  attach(host: HTMLElement, options: GameOptions): void {
    if (this.session) throw new Error('GameSessionService is already attached');
    this.loadedState.set(false);
    this.pausedState.set(false);
    this.perfState.set(null);
    this.loadProgressState.set(0);
    this.stageLabelState.set('');
    this.hudState.set(null);
    this.stageResultState.set(null);
    this.gameOverState.set(null);
    this.loadErrorState.set(null);
    this.pauseWanted = false;
    const bridge = new GameBridge();
    bridge.onEvent((event) => this.applyEvent(event));
    try {
      this.session = { bridge, handle: this.factory(host, bridge, options, this.audio.gameAudio) };
    } catch (error) {
      bridge.dispose();
      throw error;
    }
  }

  requestPause(): void {
    if (!this.session) return;
    if (!this.loadedState()) {
      this.pauseWanted = true;
      return;
    }
    if (this.canPause()) this.send({ type: 'pause' });
  }

  resume(): void {
    this.pauseWanted = false;
    if (this.pausedState()) this.send({ type: 'resume' });
  }

  restart(): void {
    this.pauseWanted = false;
    this.send({ type: 'restart' });
  }

  send(command: GameCommand): void {
    this.session?.bridge.send(command);
  }

  resize(viewportCssWidth: number, viewportCssHeight: number, devicePixelRatio: number): void {
    this.session?.handle.resize(viewportCssWidth, viewportCssHeight, devicePixelRatio);
  }

  detach(): void {
    const session = this.session;
    if (!session) return;
    this.session = null;
    session.handle.destroy();
    session.bridge.dispose();
    this.audio.stopAll();
  }

  private applyWantedPause(): void {
    if (!this.pauseWanted) return;
    this.pauseWanted = false;
    // A scene that pauses inside its own create() is set back to running by Phaser's SceneManager.
    queueMicrotask(() => this.requestPause());
  }

  private applyEvent(event: GameEvent): void {
    switch (event.type) {
      case 'loadProgress':
        this.loadProgressState.set(event.progress);
        break;
      case 'loadComplete':
        this.loadProgressState.set(1);
        this.stageLabelState.set(event.stageLabel);
        this.loadedState.set(true);
        this.pausedState.set(false);
        this.stageResultState.set(null);
        this.gameOverState.set(null);
        this.applyWantedPause();
        break;
      case 'hudChanged':
        this.hudState.set(event.hud);
        break;
      case 'stageComplete':
        this.stageResultState.set(event.result);
        break;
      case 'gameOver':
        this.gameOverState.set(event.result);
        break;
      case 'pauseRequested':
        this.requestPause();
        break;
      case 'paused':
        this.pausedState.set(true);
        break;
      case 'resumed':
        this.pausedState.set(false);
        break;
      case 'recoverableError':
        if (!this.loadedState()) this.loadErrorState.set(event.message);
        break;
      case 'perfSample':
        this.perfState.set(event.sample);
        break;
    }
  }
}
