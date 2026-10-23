import type { MovementTuning } from '../configuration/movement.config';

export type StageId = string;

export type QualityLevel = 'low' | 'medium' | 'high';

export interface GameplaySettings {
  quality: QualityLevel;
  reducedMotion: boolean;
  screenShake: boolean;
  jumpSensitivity: number;
  leftSensitivity: number;
  rightSensitivity: number;
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

export type PowerForm = 'small' | 'big' | 'spark';

export interface HudState {
  score: number;
  coins: number;
  timeLeft: number;
  lives: number;
  power: PowerForm;
}

export const MILESTONES = ['stomp-chain', 'shell-chain', 'bonus-room'] as const;

export type Milestone = (typeof MILESTONES)[number];

export interface RunStats {
  hits: number;
  finishPower: PowerForm;
  bossDefeated: boolean;
  bossStompHits: number;
  milestones: readonly Milestone[];
}

export interface StageResult {
  stageId: StageId;
  score: number;
  coins: number;
  timeLeft: number;
  timeUsed: number;
  coinsCollected: number;
  postmarks: number;
  postmarksCollected: readonly number[];
  postmarkTotal: number;
  stats: RunStats;
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
  | { type: 'loadComplete'; stageId: StageId; stageLabel: string }
  | { type: 'hudChanged'; hud: HudState }
  | { type: 'stageComplete'; result: StageResult }
  | { type: 'checkpoint'; stageId: StageId; column: number }
  | { type: 'playerDied'; stageId: StageId; livesLeft: number }
  | { type: 'gameOver'; result: StageResult }
  | { type: 'milestone'; stageId: StageId; milestone: Milestone }
  | { type: 'bossDefeated'; stageId: StageId }
  | { type: 'pauseRequested' }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'perfSample'; sample: PerfSample }
  | { type: 'recoverableError'; message: string };
