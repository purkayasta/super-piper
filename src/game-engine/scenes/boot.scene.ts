import Phaser from 'phaser';
import { detectRefreshRate } from '../core/display';

const REFRESH_SAMPLE_COUNT = 30;

export class BootScene extends Phaser.Scene {
  private readonly deltas: number[] = [];

  constructor() {
    super('BootScene');
  }

  create(): void {
    this.deltas.length = 0;
  }

  override update(): void {
    this.deltas.push(this.game.loop.rawDelta);
    if (this.deltas.length < REFRESH_SAMPLE_COUNT) return;
    this.registry.set('refreshHz', detectRefreshRate(this.deltas));
    this.scene.start('SandboxScene');
  }
}
