import Phaser from 'phaser';
import {
  TEST_ROOM_LEGEND,
  TEST_ROOM_ROWS,
  TEST_ROOM_START_SYMBOL,
} from '../../content/levels/sandbox/test-room';
import { DEFAULT_MOVEMENT, type MovementTuning } from '../configuration/movement.config';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../configuration/performance.config';
import { TILE_SIZE } from '../configuration/physics.config';
import type { GameBridge } from '../core/game-bridge';
import type { GameCommand } from '../core/game-events';
import type { GameOptions } from '../core/game-factory';
import { readBridge, readOptions, readZoom, registryChangeEvent } from '../core/registry-keys';
import { PIP_FRAME_SIZE, PIP_TEXTURE_KEY, drawPip } from '../entities/player/pip-placeholder';
import { Player } from '../entities/player/player';
import { nextPixelViewLeft } from '../systems/camera/forward-camera';
import { DomInput } from '../systems/input/dom-input';
import {
  EMPTY_TILE,
  PLACEHOLDER_TILESET_KEY,
  PLACEHOLDER_TILE_COUNT,
  SOLID_PLACEHOLDER_TILES,
  drawPlaceholderTileset,
} from '../world/placeholder-tiles';
import { findSymbol, parseTileRows } from '../world/tile-grid';
import { PerfSampler } from './perf-sampler';
import { applyDetectedPhysicsRate } from './physics-rate';

const STAGE_ID = 'test-room';
const FALLBACK_ZOOM = 1;
const FALLBACK_START_ROW_FROM_BOTTOM = 3;

export class TestRoomScene extends Phaser.Scene {
  private bridge!: GameBridge;
  private options!: GameOptions;
  private perfSampler!: PerfSampler;
  private controls!: DomInput;
  private player!: Player;
  private tiles: readonly (readonly number[])[] = [];
  private tuning: MovementTuning = DEFAULT_MOVEMENT;
  private levelWidthPx = 0;
  private levelHeightPx = 0;
  private startX = 0;
  private startY = 0;
  private viewLeft = 0;

  constructor() {
    super('TestRoomScene');
  }

  create(): void {
    this.bridge = readBridge(this.registry)!;
    this.options = readOptions(this.registry)!;
    const refreshHz = applyDetectedPhysicsRate(this);
    this.perfSampler = new PerfSampler(this, this.bridge, refreshHz);
    this.tuning = DEFAULT_MOVEMENT;
    this.viewLeft = 0;

    this.createTextures();
    const layer = this.buildLevel();
    this.controls = new DomInput();
    this.player = new Player(
      this,
      this.startX,
      this.startY,
      this.tuning,
      this.controls.resolve,
      this.isSolidTile,
    );
    this.physics.add.collider(this.player.sprite, layer);

    this.fitCameraToLogicalView(readZoom(this.registry) ?? FALLBACK_ZOOM);
    this.listen();

    this.bridge.emit({ type: 'loadComplete', stageId: STAGE_ID });
  }

  override update(): void {
    if (this.options.devTools) this.perfSampler.recordFrame();
  }

  private buildLevel(): Phaser.Tilemaps.TilemapLayer {
    const grid = parseTileRows(TEST_ROOM_ROWS, TEST_ROOM_LEGEND);
    this.tiles = grid.tiles;
    this.levelWidthPx = grid.width * TILE_SIZE;
    this.levelHeightPx = grid.height * TILE_SIZE;
    const start = findSymbol(TEST_ROOM_ROWS, TEST_ROOM_START_SYMBOL) ?? {
      column: 1,
      row: grid.height - FALLBACK_START_ROW_FROM_BOTTOM,
    };
    this.startX = (start.column + 0.5) * TILE_SIZE;
    this.startY = (start.row + 1) * TILE_SIZE - PIP_FRAME_SIZE / 2;

    const map = this.make.tilemap({
      data: grid.tiles,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage(
      PLACEHOLDER_TILESET_KEY,
      PLACEHOLDER_TILESET_KEY,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0,
    )!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setCollision([...SOLID_PLACEHOLDER_TILES]);
    return layer;
  }

  private listen(): void {
    this.controls.attach(window);
    this.events.on('preupdate', this.pollGamepad);
    this.events.on('postupdate', this.followPlayer);
    const unsubscribe = this.bridge.onCommand(this.handleCommand);
    this.registry.events.on(registryChangeEvent('zoom'), this.applyZoom);
    let cleanedUp = false;
    const cleanUp = (): void => {
      if (cleanedUp) return;
      cleanedUp = true;
      unsubscribe();
      this.controls.detach();
      this.events.off('preupdate', this.pollGamepad);
      this.events.off('postupdate', this.followPlayer);
      this.registry.events.off(registryChangeEvent('zoom'), this.applyZoom);
      this.player.destroy();
    };
    this.events.once('shutdown', cleanUp);
    this.events.once('destroy', cleanUp);
  }

  private readonly handleCommand = (command: GameCommand): void => {
    switch (command.type) {
      case 'pause':
        this.controls.releaseAll();
        this.scene.pause();
        this.bridge.emit({ type: 'paused' });
        break;
      case 'resume':
        this.scene.resume();
        this.bridge.emit({ type: 'resumed' });
        break;
      case 'applyTuning':
        this.tuning = command.tuning;
        this.player.setTuning(command.tuning);
        break;
    }
  };

  private readonly applyZoom = (_parent: unknown, zoom: number): void => {
    this.fitCameraToLogicalView(zoom);
  };

  private readonly pollGamepad = (): void => {
    this.controls.pollGamepad();
  };

  private readonly followPlayer = (): void => {
    if (this.player.top > this.levelHeightPx) {
      this.player.respawn(this.startX, this.startY);
      this.viewLeft = 0;
    }
    this.viewLeft = nextPixelViewLeft(
      this.viewLeft,
      this.player.sprite.x,
      LOGICAL_WIDTH,
      this.levelWidthPx,
      this.tuning.cameraLeadFraction,
    );
    this.player.clampToViewLeft(this.viewLeft);
    this.centerCamera();
  };

  private readonly isSolidTile = (tx: number, ty: number): boolean => {
    const row = this.tiles[ty];
    return row !== undefined && (row[tx] ?? EMPTY_TILE) !== EMPTY_TILE;
  };

  private fitCameraToLogicalView(zoom: number): void {
    this.cameras.main.setZoom(zoom);
    this.centerCamera();
  }

  private centerCamera(): void {
    // roundPixels floors scrollX and sprite x separately, so viewLeft must stay whole.
    this.cameras.main.centerOn(this.viewLeft + LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
  }

  private createTextures(): void {
    this.createPixelTexture(
      PLACEHOLDER_TILESET_KEY,
      TILE_SIZE * PLACEHOLDER_TILE_COUNT,
      TILE_SIZE,
      (context) => drawPlaceholderTileset(context, TILE_SIZE),
    );
    this.createPixelTexture(PIP_TEXTURE_KEY, PIP_FRAME_SIZE, PIP_FRAME_SIZE, drawPip);
  }

  private createPixelTexture(
    key: string,
    width: number,
    height: number,
    draw: (context: CanvasRenderingContext2D) => void,
  ): void {
    if (this.textures.exists(key)) return;
    const texture = this.textures.createCanvas(key, width, height);
    if (!texture) return;
    draw(texture.getContext());
    texture.refresh();
  }
}
