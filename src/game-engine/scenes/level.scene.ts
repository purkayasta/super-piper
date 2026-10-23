import Phaser from 'phaser';
import { DEFAULT_OUTFIT, GOAL_POLE_TOP_SIZE, ItemFrame } from '../../content/art/atlas-frames';
import {
  GAMEPLAY_ATLAS_ID,
  sceneryResolutionForQuality,
  tilesetAssetId,
  type AssetId,
} from '../../content/manifests/asset-manifest';
import {
  LEVEL_SCENE_KEY,
  stageEntry,
  type StageEntry,
} from '../../content/manifests/level-manifest';
import { GOAL_SEQUENCE, PICKUP_INSET, STAR_BLOCK_FRAME_MS } from '../configuration/effects.config';
import { DEFAULT_MOVEMENT, type MovementTuning } from '../configuration/movement.config';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../configuration/performance.config';
import { TILE_SIZE } from '../configuration/physics.config';
import { SCORING } from '../configuration/scoring.config';
import type { GameBridge } from '../core/game-bridge';
import type { GameCommand } from '../core/game-events';
import type { GameOptions } from '../core/game-factory';
import { readBridge, readOptions, readZoom, registryChangeEvent } from '../core/registry-keys';
import { Player } from '../entities/player/player';
import { nextPixelViewLeft } from '../systems/camera/forward-camera';
import { frameAt } from '../systems/effects/effect-curves';
import { DomInput } from '../systems/input/dom-input';
import { GoalSequence, type GoalLayout } from '../systems/level-completion/goal-sequence';
import { StageSession } from '../systems/scoring/stage-session';
import { blockHitOutcome, headRow, pickBumpedColumn } from '../world/block-hits';
import { compileLevel } from '../world/level-compiler';
import type { CellCoordinate, CompiledLevel, LevelDefinition } from '../world/level-format';
import { PickupField } from '../world/pickup-field';
import {
  EMPTY_TILE,
  SOLID_TILES,
  STAR_BLOCK_CYCLE,
  TILESET_LAYOUT,
  Tile,
  isStarBlock,
} from '../world/tile-ids';
import { BlockEffects } from './level/block-effects';
import { COIN_SPIN_ANIMATION, ensureGameplayAnimations } from './level/gameplay-animations';
import { ParallaxRenderer } from './level/parallax-renderer';
import {
  addTileFrames,
  applySceneryFiltering,
  queueAssets,
  sceneryAssetIds,
} from './level/stage-assets';
import { PerfSampler } from './perf-sampler';
import { applyDetectedPhysicsRate } from './physics-rate';

const FALLBACK_ZOOM = 1;
const HALF_TILE = TILE_SIZE / 2;
const PIP_HALF_HEIGHT = 8;
const FLAG_POLE_GAP = 1;
const MS_PER_SECOND = 1000;
const MAX_PICKUPS_PER_FRAME = 8;
const GOAL_TRIGGER_TOLERANCE = 1;

const Depth = {
  scenery: 0,
  decoration: 10,
  goal: 15,
  tiles: 20,
  pickups: 30,
  effects: 35,
  player: 40,
} as const;

export class LevelScene extends Phaser.Scene {
  private bridge!: GameBridge;
  private options!: GameOptions;
  private stage!: StageEntry;
  private level!: LevelDefinition;
  private compiled!: CompiledLevel;
  private sceneryIds: AssetId[] = [];
  private perfSampler!: PerfSampler;
  private controls!: DomInput;
  private player!: Player;
  private parallax!: ParallaxRenderer;
  private effects!: BlockEffects;
  private session!: StageSession;
  private goal!: GoalSequence;
  private goalLayout!: GoalLayout;
  private goalTriggerX = 0;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;
  private flag!: Phaser.GameObjects.Image;
  private coinSprites: Phaser.GameObjects.Sprite[] = [];
  private postmarkSprites: Phaser.GameObjects.Image[] = [];
  private coins!: PickupField;
  private postmarks!: PickupField;
  private starTiles: Phaser.Tilemaps.Tile[] = [];
  private readonly collected: number[] = new Array<number>(MAX_PICKUPS_PER_FRAME).fill(0);
  private tuning: MovementTuning = DEFAULT_MOVEMENT;
  private levelWidthPx = 0;
  private levelHeightPx = 0;
  private startX = 0;
  private startY = 0;
  private viewLeft = 0;
  private shimmerElapsedMs = 0;
  private shimmerFrame = 0;
  private finished = false;

  constructor() {
    super(LEVEL_SCENE_KEY);
  }

  preload(): void {
    this.bridge = readBridge(this.registry)!;
    this.options = readOptions(this.registry)!;
    this.stage = stageEntry(this.options.initialStageId)!;
    this.level = this.stage.level!;
    this.sceneryIds = sceneryAssetIds(
      this.level.theme,
      sceneryResolutionForQuality(this.options.quality),
    );
    this.load.on(Phaser.Loader.Events.PROGRESS, this.reportProgress);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.reportLoadError);
    this.load.once(Phaser.Loader.Events.COMPLETE, this.stopLoadReporting);
    queueAssets(this, [...this.stage.assets, ...this.sceneryIds]);
  }

  create(): void {
    const refreshHz = applyDetectedPhysicsRate(this);
    this.perfSampler = new PerfSampler(this, this.bridge, refreshHz);
    this.tuning = DEFAULT_MOVEMENT;
    this.viewLeft = 0;
    this.finished = false;
    this.shimmerElapsedMs = 0;
    this.shimmerFrame = 0;
    this.compiled = compileLevel(this.level);
    this.levelWidthPx = this.compiled.width * TILE_SIZE;
    this.levelHeightPx = this.compiled.height * TILE_SIZE;

    const tilesetKey = tilesetAssetId(this.level.theme);
    applySceneryFiltering(this, this.sceneryIds);
    addTileFrames(this, tilesetKey);
    this.parallax = new ParallaxRenderer(
      this,
      this.level.theme,
      sceneryResolutionForQuality(this.options.quality),
      Depth.scenery,
    );
    this.collisionLayer = this.buildTileLayers(tilesetKey);
    ensureGameplayAnimations(this, DEFAULT_OUTFIT);
    this.buildPickups();
    this.buildGoal();
    this.effects = new BlockEffects(this, tilesetKey, Depth.effects);
    this.session = new StageSession(this.level.timeLimit, SCORING.startingLives, SCORING);
    this.goal = new GoalSequence(GOAL_SEQUENCE);

    this.controls = new DomInput();
    const start = this.compiled.start;
    this.startX = (start.column + 0.5) * TILE_SIZE;
    this.startY = (start.row + 1) * TILE_SIZE - PIP_HALF_HEIGHT;
    this.player = new Player(
      this,
      this.startX,
      this.startY,
      this.tuning,
      this.controls.resolve,
      this.isSolidTile,
      this.handleHeadBump,
    );
    this.player.sprite.setDepth(Depth.player);
    this.physics.add.collider(this.player.sprite, this.collisionLayer);

    this.fitCameraToLogicalView(readZoom(this.registry) ?? FALLBACK_ZOOM);
    this.listen();
    this.parallax.update(this.viewLeft, 0);

    this.bridge.emit({
      type: 'loadComplete',
      stageId: this.level.id,
      stageLabel: this.level.label,
    });
    this.emitHudIfChanged();
  }

  override update(_time: number, delta: number): void {
    if (this.options.devTools) this.perfSampler.recordFrame();
    if (!this.goal.active && !this.finished) this.session.tick(delta);
    this.effects.update(delta);
    this.advanceStarShimmer(delta);
    if (!this.player.isScripted) {
      this.collectPickups();
      this.checkGoalReached();
    }
    if (this.goal.active) this.stepGoal(delta);
    this.emitHudIfChanged();
  }

  private buildTileLayers(tilesetKey: AssetId): Phaser.Tilemaps.TilemapLayer {
    this.createLayer(this.compiled.decoration, tilesetKey).setDepth(Depth.decoration);
    const collision = this.createLayer(this.compiled.collision, tilesetKey).setDepth(Depth.tiles);
    collision.setCollision([...SOLID_TILES]);
    this.starTiles = collision.filterTiles((tile: Phaser.Tilemaps.Tile) => isStarBlock(tile.index));
    return collision;
  }

  private createLayer(data: number[][], tilesetKey: AssetId): Phaser.Tilemaps.TilemapLayer {
    const { tileSize, margin, spacing } = TILESET_LAYOUT;
    const map = this.make.tilemap({ data, tileWidth: tileSize, tileHeight: tileSize });
    const tileset = map.addTilesetImage(
      tilesetKey,
      tilesetKey,
      tileSize,
      tileSize,
      margin,
      spacing,
    )!;
    return map.createLayer(0, tileset, 0, 0)!;
  }

  private buildPickups(): void {
    const { width, height, coins, postmarks } = this.compiled;
    this.coins = new PickupField(width, height, coins, TILE_SIZE, PICKUP_INSET);
    this.postmarks = new PickupField(width, height, postmarks, TILE_SIZE, PICKUP_INSET);
    this.coinSprites = coins.map((cell) => {
      const sprite = this.add.sprite(
        cellCentreX(cell),
        cellCentreY(cell),
        GAMEPLAY_ATLAS_ID,
        ItemFrame.coin0,
      );
      sprite.setDepth(Depth.pickups).play(COIN_SPIN_ANIMATION);
      return sprite;
    });
    this.postmarkSprites = postmarks.map((cell) =>
      this.add
        .image(cellCentreX(cell), cellCentreY(cell), GAMEPLAY_ATLAS_ID, ItemFrame.postmark)
        .setDepth(Depth.pickups),
    );
  }

  private buildGoal(): void {
    const { column, baseRow, poleTopRow } = this.compiled.goal;
    const poleX = column * TILE_SIZE + HALF_TILE;
    const poleTopY = poleTopRow * TILE_SIZE + GOAL_POLE_TOP_SIZE;
    const baseTopY = baseRow * TILE_SIZE;
    this.add
      .image(poleX, poleTopY, GAMEPLAY_ATLAS_ID, ItemFrame.pole)
      .setOrigin(0.5, 0)
      .setScale(1, (baseTopY - poleTopY) / TILE_SIZE)
      .setDepth(Depth.goal);
    this.add
      .image(
        poleX,
        poleTopRow * TILE_SIZE + GOAL_POLE_TOP_SIZE / 2,
        GAMEPLAY_ATLAS_ID,
        ItemFrame.poleTop,
      )
      .setDepth(Depth.goal);
    const flagTopY = poleTopY + FLAG_POLE_GAP;
    this.flag = this.add
      .image(poleX - FLAG_POLE_GAP, flagTopY, GAMEPLAY_ATLAS_ID, ItemFrame.flag)
      .setOrigin(1, 0)
      .setDepth(Depth.goal);
    this.goalTriggerX = column * TILE_SIZE - GOAL_TRIGGER_TOLERANCE;
    const groundTopY = (baseRow + 1) * TILE_SIZE;
    const doorColumn = this.compiled.doorColumn;
    this.goalLayout = {
      poleX,
      slideBottomY: baseTopY - PIP_HALF_HEIGHT,
      groundY: groundTopY - PIP_HALF_HEIGHT,
      doorX: doorColumn === null ? this.levelWidthPx : doorColumn * TILE_SIZE + HALF_TILE,
      flagTopY,
      flagBottomY: baseTopY - TILE_SIZE,
    };
  }

  private listen(): void {
    this.controls.attach(window);
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.pollGamepad);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.followPlayer);
    const unsubscribe = this.bridge.onCommand(this.handleCommand);
    this.registry.events.on(registryChangeEvent('zoom'), this.applyZoom);
    let cleanedUp = false;
    const cleanUp = (): void => {
      if (cleanedUp) return;
      cleanedUp = true;
      unsubscribe();
      this.controls.detach();
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.pollGamepad);
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.followPlayer);
      this.registry.events.off(registryChangeEvent('zoom'), this.applyZoom);
      this.stopLoadReporting();
      this.player.destroy();
      this.parallax.destroy();
      this.coinSprites = [];
      this.postmarkSprites = [];
      this.starTiles = [];
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanUp);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanUp);
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

  private readonly reportProgress = (progress: number): void => {
    this.bridge.emit({ type: 'loadProgress', progress });
  };

  private readonly reportLoadError = (file: Phaser.Loader.File): void => {
    this.bridge.emit({ type: 'recoverableError', message: `Could not load asset "${file.key}"` });
  };

  private readonly stopLoadReporting = (): void => {
    this.load.off(Phaser.Loader.Events.PROGRESS, this.reportProgress);
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.reportLoadError);
    this.load.off(Phaser.Loader.Events.COMPLETE, this.stopLoadReporting);
  };

  private readonly applyZoom = (_parent: unknown, zoom: number): void => {
    this.fitCameraToLogicalView(zoom);
  };

  private readonly pollGamepad = (): void => {
    this.controls.pollGamepad();
  };

  private readonly followPlayer = (_time: number, delta: number): void => {
    if (!this.player.isScripted && this.player.top > this.levelHeightPx) {
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
    this.player.updateAnimation();
    this.centerCamera();
    this.parallax.update(this.viewLeft, delta);
  };

  private readonly isSolidTile = (tx: number, ty: number): boolean => {
    const row = this.compiled.collision[ty];
    return row !== undefined && (row[tx] ?? EMPTY_TILE) !== EMPTY_TILE;
  };

  private readonly handleHeadBump = (
    bodyLeft: number,
    bodyRight: number,
    bodyTop: number,
  ): void => {
    const row = headRow(bodyTop, TILE_SIZE);
    const column = pickBumpedColumn(bodyLeft, bodyRight, row, TILE_SIZE, this.isSolidTile);
    if (column === null) return;
    const tile = this.collisionLayer.getTileAt(column, row);
    if (tile === null || this.effects.isBumping(tile)) return;
    const outcome = blockHitOutcome(tile.index);
    if (outcome === 'none') return;
    if (outcome === 'release-coin') {
      tile.index = Tile.usedBlock;
      this.compiled.collision[row][column] = Tile.usedBlock;
      this.session.addCoin();
      this.effects.popCoin(tile.pixelX + HALF_TILE, tile.pixelY);
    }
    this.effects.bump(tile);
    const coinAbove = this.coins.collectCell(column, row - 1);
    if (coinAbove >= 0) this.takeCoin(coinAbove, true);
  };

  private collectPickups(): void {
    const body = this.player.sprite.body;
    const collected = this.collected;
    const coinCount = this.coins.collectOverlapping(
      body.left,
      body.top,
      body.right,
      body.bottom,
      collected,
    );
    for (let i = 0; i < coinCount; i++) this.takeCoin(collected[i], false);
    const postmarkCount = this.postmarks.collectOverlapping(
      body.left,
      body.top,
      body.right,
      body.bottom,
      collected,
    );
    for (let i = 0; i < postmarkCount; i++) {
      const sprite = this.postmarkSprites[collected[i]];
      sprite.setVisible(false);
      this.session.collectPostmark();
      this.effects.sparkle(sprite.x, sprite.y);
    }
  }

  private takeCoin(index: number, popped: boolean): void {
    const sprite = this.coinSprites[index];
    sprite.setVisible(false).anims.stop();
    this.session.addCoin();
    if (popped) this.effects.popCoin(sprite.x, sprite.y + HALF_TILE);
    else this.effects.sparkle(sprite.x, sprite.y);
  }

  private checkGoalReached(): void {
    if (this.finished || this.goal.phase !== 'inactive') return;
    if (this.player.sprite.body.right < this.goalTriggerX) return;
    this.player.beginScripted();
    this.session.stopClock();
    this.goal.start(this.player.sprite.y, this.goalLayout);
    this.player.placeScripted(this.goal.x, this.goal.y, 'goal-grab', 1);
  }

  private stepGoal(deltaMs: number): void {
    const goal = this.goal;
    goal.step(deltaMs / MS_PER_SECOND);
    this.flag.y = Math.round(goal.flagY);
    const animation = goal.phase === 'slide' ? 'goal-grab' : goal.phase === 'hop' ? 'jump' : 'walk';
    this.player.placeScripted(Math.round(goal.x), Math.round(goal.y), animation, 1);
    if (goal.phase === 'done') this.finishStage();
  }

  private finishStage(): void {
    if (this.finished) return;
    this.finished = true;
    this.player.hide();
    this.bridge.emit({
      type: 'stageComplete',
      result: {
        stageId: this.level.id,
        score: this.session.hud.score,
        coins: this.session.hud.coins,
        timeLeft: this.session.hud.timeLeft,
        postmarks: this.session.postmarks,
      },
    });
  }

  private advanceStarShimmer(deltaMs: number): void {
    this.shimmerElapsedMs += deltaMs;
    const frame = frameAt(this.shimmerElapsedMs, STAR_BLOCK_FRAME_MS, STAR_BLOCK_CYCLE.length);
    if (frame === this.shimmerFrame) return;
    this.shimmerFrame = frame;
    const tiles = this.starTiles;
    for (let i = 0; i < tiles.length; i++) {
      if (isStarBlock(tiles[i].index)) tiles[i].index = STAR_BLOCK_CYCLE[frame];
    }
  }

  private emitHudIfChanged(): void {
    if (!this.session.consumeChange()) return;
    this.bridge.emit({ type: 'hudChanged', hud: this.session.snapshot() });
  }

  private fitCameraToLogicalView(zoom: number): void {
    this.cameras.main.setZoom(zoom);
    this.centerCamera();
  }

  private centerCamera(): void {
    // roundPixels floors scrollX and sprite x separately, so viewLeft must stay whole.
    this.cameras.main.centerOn(this.viewLeft + LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
  }
}

function cellCentreX(cell: CellCoordinate): number {
  return cell.column * TILE_SIZE + HALF_TILE;
}

function cellCentreY(cell: CellCoordinate): number {
  return cell.row * TILE_SIZE + HALF_TILE;
}
