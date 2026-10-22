import type { GameBridge } from './game-bridge';
import type { QualityLevel, StageId } from './game-events';

export interface GameOptions {
  quality: QualityLevel;
  devTools: boolean;
  initialStageId: StageId;
}

export interface GameHandle {
  destroy(): void;
  resize(viewportCssWidth: number, viewportCssHeight: number, devicePixelRatio: number): void;
}

export type GameFactory = (
  parent: HTMLElement,
  bridge: GameBridge,
  options: GameOptions,
) => GameHandle;
