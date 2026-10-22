import Phaser from 'phaser';
import { cacheRefreshHz, getCachedRefreshHz } from '../bootstrap/refresh-rate-cache';
import { detectRefreshRate } from '../core/display';
import { writeRegistry } from '../core/registry-keys';

const REFRESH_SAMPLE_COUNT = 30;

export class BootScene extends Phaser.Scene {
  private readonly deltas: number[] = [];

  constructor() {
    super('BootScene');
  }

  create(): void {
    this.deltas.length = 0;
    const cachedRefreshHz = getCachedRefreshHz();
    if (cachedRefreshHz === null) return;
    this.startSandbox(cachedRefreshHz);
  }

  override update(): void {
    this.deltas.push(this.game.loop.rawDelta);
    if (this.deltas.length < REFRESH_SAMPLE_COUNT) return;
    const detectedRefreshHz = detectRefreshRate(this.deltas);
    cacheRefreshHz(detectedRefreshHz);
    this.startSandbox(detectedRefreshHz);
  }

  private startSandbox(refreshHz: number): void {
    writeRegistry(this.registry, 'refreshHz', refreshHz);
    this.scene.start('SandboxScene');
  }
}
