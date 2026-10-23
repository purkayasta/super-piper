import type { GameAudio } from '../audio/game-audio';
import type { GameBridge } from './game-bridge';
import type { KeyBindings } from '../systems/input/actions';
import type { GameplaySettings, StageId } from './game-events';

export interface GameOptions {
  devTools: boolean;
  initialStageId: StageId;
  settings: GameplaySettings;
  bindings: KeyBindings;
}

export interface GameHandle {
  destroy(): void;
  resize(viewportCssWidth: number, viewportCssHeight: number, devicePixelRatio: number): void;
}

export type GameFactory = (
  parent: HTMLElement,
  bridge: GameBridge,
  options: GameOptions,
  audio: GameAudio,
) => GameHandle;
