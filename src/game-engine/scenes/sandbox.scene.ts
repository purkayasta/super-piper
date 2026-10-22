import Phaser from 'phaser';
import {
  FRAME_STATS_CAPACITY,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  PERF_SAMPLE_INTERVAL_MS,
} from '../configuration/performance.config';
import { FrameStats } from '../core/frame-stats';
import type { GameBridge } from '../core/game-bridge';
import type { GameOptions } from '../core/game-factory';

const TILE_SIZE = 16;
const TILE_COLUMNS = 27;
const TILE_ROWS = 15;
const SQUARE_COUNT = 20;
const SQUARE_SPEED = 90;
const DEFAULT_REFRESH_HZ = 60;
const GROUND_TEXTURE = 'sandbox-ground';
const SQUARE_TEXTURE = 'sandbox-square';

export class SandboxScene extends Phaser.Scene {
  private bridge!: GameBridge;
  private options!: GameOptions;
  private readonly frameStats = new FrameStats(FRAME_STATS_CAPACITY);
  private sinceLastSampleMs = 0;
  private refreshHz = DEFAULT_REFRESH_HZ;

  constructor() {
    super('SandboxScene');
  }

  create(): void {
    this.bridge = this.registry.get('bridge');
    this.options = this.registry.get('options');
    this.refreshHz = this.registry.get('refreshHz') ?? DEFAULT_REFRESH_HZ;

    this.physics.world.setFPS(this.refreshHz);
    this.physics.world.setBounds(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    const camera = this.cameras.main;
    camera.setOrigin(0, 0);
    camera.setZoom(this.registry.get('zoom'));

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
      camera.setZoom(zoom);
    };
    this.registry.events.on('changedata-zoom', applyZoom);
    const cleanUp = (): void => {
      unsubscribe();
      this.registry.events.off('changedata-zoom', applyZoom);
    };
    this.events.once('shutdown', cleanUp);
    this.events.once('destroy', cleanUp);

    this.bridge.emit({ type: 'loadComplete', stageId: 'sandbox' });
  }

  override update(): void {
    if (!this.options.devTools) return;
    const delta = this.game.loop.rawDelta;
    this.frameStats.push(delta);
    this.sinceLastSampleMs += delta;
    if (this.sinceLastSampleMs < PERF_SAMPLE_INTERVAL_MS) return;
    this.sinceLastSampleMs = 0;
    this.bridge.emit({
      type: 'perfSample',
      sample: {
        fps: this.frameStats.fps,
        avgFrameMs: this.frameStats.average,
        p95FrameMs: this.frameStats.p95,
        longFrames: this.frameStats.longFrames,
        refreshHz: this.refreshHz,
        physicsHz: this.physics.world.fps,
        activeBodies: this.physics.world.bodies.size,
      },
    });
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
