import type { MovementTuning } from '../configuration/movement.config';

export type StageId = string;

export type QualityLevel = 'low' | 'medium' | 'high';

export interface GameplaySettings {
  quality: QualityLevel;
  reducedMotion: boolean;
  screenShake: boolean;
}

export interface PerfSample {
  fps: number;
  avgFrameMs: number;
  p95FrameMs: number;
  longFrames: number;
  offStepFrames: number;
  refreshHz: number;
  physicsHz: number;
  activeBodies: number;
}

export type GameCommand =
  | { type: 'startStage'; stageId: StageId }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'quitToMap' }
  | { type: 'applySettings'; settings: GameplaySettings }
  | { type: 'applyTuning'; tuning: MovementTuning };

export type GameEvent =
  | { type: 'loadProgress'; progress: number }
  | { type: 'loadComplete'; stageId: StageId }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'perfSample'; sample: PerfSample }
  | { type: 'recoverableError'; message: string };
