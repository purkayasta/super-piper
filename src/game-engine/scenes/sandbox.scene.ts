import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../configuration/performance.config';
import type { GameBridge } from '../core/game-bridge';
import type { GameOptions } from '../core/game-factory';
import { readBridge, readOptions, readZoom, registryChangeEvent } from '../core/registry-keys';
import { PerfSampler } from './perf-sampler';
import { applyDetectedPhysicsRate } from './physics-rate';

const TILE_SIZE = 16;
const TILE_COLUMNS = 27;
const TILE_ROWS = 15;
const SQUARE_COUNT = 20;
const SQUARE_SPEED = 90;
const FALLBACK_ZOOM = 1;
const GROUND_TEXTURE = 'sandbox-ground';
const SQUARE_TEXTURE = 'sandbox-square';

export class SandboxScene extends Phaser.Scene {
  private bridge!: GameBridge;
  private options!: GameOptions;
  private perfSampler!: PerfSampler;

  constructor() {
    super('SandboxScene');
  }

  create(): void {
    this.bridge = readBridge(this.registry)!;
    this.options = readOptions(this.registry)!;
    const refreshHz = applyDetectedPhysicsRate(this);
    this.perfSampler = new PerfSampler(this, this.bridge, refreshHz);

    this.physics.world.setBounds(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    this.fitCameraToLogicalView(readZoom(this.registry) ?? FALLBACK_ZOOM);

    this.createTextures();
    this.add.image(0, 0, GROUND_TEXTURE).setOrigin(0, 0);
    this.createSquares();

    const unsubscribe = this.bridge.onCommand((command) => {
      if (command.type === 'pause') {
        this.scene.pause();
        this.bridge.emit({ type: 'paused' });
      } else if (command.type === 'resume') {
        this.scene.resume();
        this.bridge.emit({ type: 'resumed' });
      }
    });
    const applyZoom = (_parent: unknown, zoom: number): void => {
      this.fitCameraToLogicalView(zoom);
    };
    this.registry.events.on(registryChangeEvent('zoom'), applyZoom);
    const cleanUp = (): void => {
      unsubscribe();
      this.registry.events.off(registryChangeEvent('zoom'), applyZoom);
    };
    this.events.once('shutdown', cleanUp);
    this.events.once('destroy', cleanUp);

    this.bridge.emit({ type: 'loadComplete', stageId: 'sandbox', stageLabel: 'SANDBOX' });
  }

  override update(): void {
    if (this.options.devTools) this.perfSampler.recordFrame();
  }

  private fitCameraToLogicalView(zoom: number): void {
    const camera = this.cameras.main;
    camera.setZoom(zoom);
    camera.centerOn(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
  }

  private createTextures(): void {
    const graphics = this.make.graphics({}, false);

    for (let row = 0; row < TILE_ROWS; row++) {
      for (let column = 0; column < TILE_COLUMNS; column++) {
        graphics.fillStyle((row + column) % 2 === 0 ? 0x4a8c3a : 0x5aa648, 1);
        graphics.fillRect(column * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    graphics.generateTexture(GROUND_TEXTURE, TILE_COLUMNS * TILE_SIZE, TILE_ROWS * TILE_SIZE);

    graphics.clear();
    graphics.fillStyle(0xffd23f, 1);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.lineStyle(2, 0x7a4b00, 1);
    graphics.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    graphics.generateTexture(SQUARE_TEXTURE, TILE_SIZE, TILE_SIZE);

    graphics.destroy();
  }

  private createSquares(): void {
    for (let i = 0; i < SQUARE_COUNT; i++) {
      const square = this.physics.add.image(
        Phaser.Math.Between(TILE_SIZE, LOGICAL_WIDTH - TILE_SIZE),
        Phaser.Math.Between(TILE_SIZE, LOGICAL_HEIGHT - TILE_SIZE),
        SQUARE_TEXTURE,
      );
      square.setBounce(1, 1);
      square.setCollideWorldBounds(true);
      square.setVelocity(
        Phaser.Math.Between(-SQUARE_SPEED, SQUARE_SPEED) || SQUARE_SPEED,
        Phaser.Math.Between(-SQUARE_SPEED, SQUARE_SPEED) || SQUARE_SPEED,
      );
    }
  }
}
