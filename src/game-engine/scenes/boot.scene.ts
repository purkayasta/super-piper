import Phaser from 'phaser';
import { sceneKeyForStage } from '../../content/manifests/level-manifest';
import { cacheRefreshHz, getCachedRefreshHz } from '../bootstrap/refresh-rate-cache';
import { detectRefreshRate } from '../core/display';
import { readAudio, readBridge, readOptions, writeRegistry } from '../core/registry-keys';

const REFRESH_SAMPLE_COUNT = 30;

export class BootScene extends Phaser.Scene {
  private readonly deltas: number[] = [];
  private stageSceneKey: string | null = null;

  constructor() {
    super('BootScene');
  }

  create(): void {
    this.deltas.length = 0;
    readAudio(this.registry)?.playMusic(null);
    const stageId = readOptions(this.registry)!.initialStageId;
    this.stageSceneKey = sceneKeyForStage(stageId);
    if (this.stageSceneKey === null) {
      readBridge(this.registry)!.emit({
        type: 'recoverableError',
        message: `Unknown stage "${stageId}"`,
      });
      this.scene.stop();
      return;
    }
    const cachedRefreshHz = getCachedRefreshHz();
    if (cachedRefreshHz === null) return;
    this.startStage(cachedRefreshHz);
  }

  override update(): void {
    this.deltas.push(this.game.loop.rawDelta);
    if (this.deltas.length < REFRESH_SAMPLE_COUNT) return;
    const detectedRefreshHz = detectRefreshRate(this.deltas);
    cacheRefreshHz(detectedRefreshHz);
    this.startStage(detectedRefreshHz);
  }

  private startStage(refreshHz: number): void {
    writeRegistry(this.registry, 'refreshHz', refreshHz);
    this.scene.start(this.stageSceneKey!);
  }
}
