import type { MusicId } from '../../content/audio/sound-ids';

export interface StageTracks {
  readonly stage: MusicId;
  readonly hurry: MusicId;
  readonly star: MusicId;
  readonly clear: MusicId;
  readonly gameOver: MusicId;
}

type MusicPhase = 'playing' | 'silent' | 'clear' | 'game-over';

export class MusicDirector {
  private phase: MusicPhase = 'playing';
  private hurried = false;
  private warningMs = 0;
  private starActive = false;

  constructor(
    private readonly tracks: StageTracks,
    private readonly hurryWarningMs: number,
  ) {}

  get track(): MusicId | null {
    switch (this.phase) {
      case 'silent':
        return null;
      case 'clear':
        return this.tracks.clear;
      case 'game-over':
        return this.tracks.gameOver;
      case 'playing':
        if (this.warningMs > 0) return null;
        if (this.starActive) return this.tracks.star;
        return this.hurried ? this.tracks.hurry : this.tracks.stage;
    }
  }

  get hurry(): boolean {
    return this.hurried;
  }

  setStar(active: boolean): void {
    this.starActive = active;
  }

  beginHurry(): boolean {
    if (this.hurried || this.phase !== 'playing') return false;
    this.hurried = true;
    this.warningMs = this.hurryWarningMs;
    return true;
  }

  step(deltaMs: number): void {
    if (this.warningMs > 0) this.warningMs = Math.max(0, this.warningMs - deltaMs);
  }

  silence(): void {
    if (this.phase === 'playing') this.phase = 'silent';
  }

  stageClear(): void {
    this.phase = 'clear';
  }

  gameOver(): void {
    this.phase = 'game-over';
  }
}
