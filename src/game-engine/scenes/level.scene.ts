import Phaser from 'phaser';
import {
  DEFAULT_OUTFIT,
  GOAL_POLE_TOP_SIZE,
  ItemFrame,
  PIP_FRAME_HEIGHT,
} from '../../content/art/atlas-frames';
import { Sfx, type MusicId, type SfxId } from '../../content/audio/sound-ids';
import { stageSoundIds, stageTracks } from '../../content/audio/stage-sounds';
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
import { SILENT_AUDIO, type GameAudio } from '../audio/game-audio';
import { MusicDirector } from '../audio/music-director';
import { AUDIO_RULES } from '../configuration/audio.config';
import { GOAL_SEQUENCE, PICKUP_INSET, STAR_BLOCK_FRAME_MS } from '../configuration/effects.config';
import { DEFAULT_MOVEMENT, type MovementTuning } from '../configuration/movement.config';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../configuration/performance.config';
import { TILE_SIZE } from '../configuration/physics.config';
import {
  COMBAT,
  DEATH_RULES,
  MULTI_COIN,
  POWER_RULES,
  STAR_TINTS,
} from '../configuration/rules.config';
import { GOAL_HEIGHT_BANDS, SCORING, TIME_TALLY } from '../configuration/scoring.config';
import type { GameBridge } from '../core/game-bridge';
import type { GameCommand, StageResult } from '../core/game-events';
import type { GameOptions } from '../core/game-factory';
import {
  readAudio,
  readBridge,
  readOptions,
  readZoom,
  registryChangeEvent,
} from '../core/registry-keys';
import type { PowerUpKind } from '../entities/power-ups/power-up';
import { Player } from '../entities/player/player';
import {
  StageActors,
  createPipProbe,
  type ActorEvents,
  type PipProbe,
} from '../systems/actors/stage-actors';
import { nextPixelViewLeft } from '../systems/camera/forward-camera';
import { CheckpointTracker } from '../systems/checkpoints/checkpoint';
import { effectProfile, type EffectProfile } from '../systems/effects/effect-profile';
import { flickerVisible, frameAt } from '../systems/effects/effect-curves';
import { DomInput } from '../systems/input/dom-input';
import { GoalSequence, type GoalLayout } from '../systems/level-completion/goal-sequence';
import { PipPower } from '../systems/power/power-state';
import { DeathSequence, type DeathCause } from '../systems/rules/death-sequence';
import { TimeTally, goalHeightPoints, grabHeightFraction } from '../systems/scoring/goal-scoring';
import { ONE_UP } from '../systems/scoring/score-chain';
import { StageSession, type RunTotals } from '../systems/scoring/stage-session';
import { BlockContents } from '../world/block-contents';
import {
  blockHitOutcome,
  headRow,
  hiddenBlockOutcome,
  pickBumpedColumn,
  type BlockHitOutcome,
} from '../world/block-hits';
import { compileLevel } from '../world/level-compiler';
import type {
  BlockItem,
  CellCoordinate,
  CompiledLevel,
  LevelDefinition,
} from '../world/level-format';
import { PickupField } from '../world/pickup-field';
import {
  EMPTY_TILE,
  SOLID_TILES,
  STAR_BLOCK_CYCLE,
  TILESET_LAYOUT,
  Tile,
  isStarBlock,
} from '../world/tile-ids';
import { ActorSprites } from './level/actor-sprites';
import { BlockEffects } from './level/block-effects';
import { COIN_SPIN_ANIMATION, ensureGameplayAnimations } from './level/gameplay-animations';
import { ParallaxRenderer } from './level/parallax-renderer';
import { ScorePopups } from './level/score-popups';
import {
  addTileFrames,
  applySceneryFiltering,
  queueAssets,
  sceneryAssetIds,
} from './level/stage-assets';
import { PerfSampler } from './perf-sampler';
import { applyDetectedPhysicsRate } from './physics-rate';

export interface LevelSceneData {
  readonly run?: RunTotals;
  readonly checkpointReached?: boolean;
  readonly postmarksCollected?: readonly number[];
}

const FALLBACK_ZOOM = 1;
const HALF_TILE = TILE_SIZE / 2;
const PIP_HALF_HEIGHT = PIP_FRAME_HEIGHT / 2;
const FLAG_POLE_GAP = 1;
const MS_PER_SECOND = 1000;
const MAX_PICKUPS_PER_FRAME = 8;
const GOAL_TRIGGER_TOLERANCE = 1;
const PARCEL_HAND_HEIGHT_PX = 10;
const PARCEL_HAND_REACH_PX = 8;

const FRESH_RUN: RunTotals = {
  score: 0,
  coins: 0,
  lives: SCORING.startingLives,
  coinsCollected: 0,
};

const Depth = {
  scenery: 0,
  decoration: 10,
  goal: 15,
  behindTiles: 17,
  tiles: 20,
  pickups: 30,
  actors: 32,
  effects: 35,
  player: 40,
  popups: 45,
} as const;

export class LevelScene extends Phaser.Scene {
  private bridge!: GameBridge;
  private options!: GameOptions;
  private profile!: EffectProfile;
  private audio: GameAudio = SILENT_AUDIO;
  private music!: MusicDirector;
  private musicTrack: MusicId | null | undefined = undefined;
  private stage!: StageEntry;
  private level!: LevelDefinition;
  private compiled!: CompiledLevel;
  private runData: LevelSceneData = {};
  private sceneryIds: AssetId[] = [];
  private perfSampler!: PerfSampler;
  private controls!: DomInput;
  private player!: Player;
  private parallax!: ParallaxRenderer;
  private effects!: BlockEffects;
  private popups!: ScorePopups;
  private session!: StageSession;
  private goal!: GoalSequence;
  private goalLayout!: GoalLayout;
  private goalTriggerX = 0;
  private goalPoleTopY = 0;
  private goalBaseTopY = 0;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;
  private flag!: Phaser.GameObjects.Image;
  private checkpointPost: Phaser.GameObjects.Image | null = null;
  private coinSprites: Phaser.GameObjects.Sprite[] = [];
  private postmarkSprites: Phaser.GameObjects.Image[] = [];
  private coins!: PickupField;
  private postmarks!: PickupField;
  private blocks!: BlockContents;
  private actors!: StageActors;
  private actorSprites!: ActorSprites;
  private power!: PipPower;
  private death!: DeathSequence;
  private checkpoint!: CheckpointTracker;
  private tally!: TimeTally;
  private probe: PipProbe = createPipProbe();
  private starTiles: Phaser.Tilemaps.Tile[] = [];
  private collectedPostmarks: number[] = [];
  private readonly collected: number[] = new Array<number>(MAX_PICKUPS_PER_FRAME).fill(0);
  private tuning: MovementTuning = DEFAULT_MOVEMENT;
  private levelWidthPx = 0;
  private levelHeightPx = 0;
  private startX = 0;
  private startY = 0;
  private viewLeft = 0;
  private shimmerElapsedMs = 0;
  private shimmerFrame = 0;
  private starTintElapsedMs = 0;
  private blockClockMs = 0;
  private runHeldLastStep = true;
  private finished = false;
  private gameIsOver = false;

  constructor() {
    super(LEVEL_SCENE_KEY);
  }

  init(data: LevelSceneData | undefined): void {
    this.runData = data ?? {};
  }

  preload(): void {
    this.bridge = readBridge(this.registry)!;
    this.options = readOptions(this.registry)!;
    this.profile = effectProfile(this.options.settings);
    this.stage = stageEntry(this.options.initialStageId)!;
    this.level = this.stage.level!;
    this.audio = readAudio(this.registry) ?? SILENT_AUDIO;
    this.audio.prepare(stageSoundIds(this.level.music));
    this.sceneryIds = sceneryAssetIds(
      this.level.theme,
      sceneryResolutionForQuality(this.options.settings.quality),
      this.profile.skippedSceneryLayers,
    );
    this.load.on(Phaser.Loader.Events.PROGRESS, this.reportProgress);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.reportLoadError);
    this.load.once(Phaser.Loader.Events.COMPLETE, this.stopLoadReporting);
    queueAssets(this, [...this.stage.assets, ...this.sceneryIds]);
  }

  create(): void {
    const refreshHz = applyDetectedPhysicsRate(this);
    this.tuning = DEFAULT_MOVEMENT;
    this.finished = false;
    this.gameIsOver = false;
    this.shimmerElapsedMs = 0;
    this.shimmerFrame = 0;
    this.starTintElapsedMs = 0;
    this.blockClockMs = 0;
    this.runHeldLastStep = true;
    this.compiled = compileLevel(this.level);
    this.levelWidthPx = this.compiled.width * TILE_SIZE;
    this.levelHeightPx = this.compiled.height * TILE_SIZE;

    const tilesetKey = tilesetAssetId(this.level.theme);
    applySceneryFiltering(this, this.sceneryIds);
    addTileFrames(this, tilesetKey);
    this.parallax = new ParallaxRenderer(
      this,
      this.level.theme,
      sceneryResolutionForQuality(this.options.settings.quality),
      Depth.scenery,
      this.profile.skippedSceneryLayers,
      this.profile.cloudDrift,
    );
    this.collisionLayer = this.buildTileLayers(tilesetKey);
    ensureGameplayAnimations(this, DEFAULT_OUTFIT);
    this.session = new StageSession(
      this.level.timeLimit,
      this.runData.run ?? FRESH_RUN,
      SCORING,
      this.runData.postmarksCollected?.length ?? 0,
    );
    this.buildPickups(this.runData.postmarksCollected ?? []);
    this.buildGoal();
    this.buildCheckpoint();
    this.blocks = new BlockContents(
      this.compiled.width,
      this.compiled.height,
      this.compiled.blockItems,
      this.compiled.hiddenBlocks,
      MULTI_COIN,
    );
    this.effects = new BlockEffects(this, tilesetKey, Depth.effects, this.profile);
    this.popups = new ScorePopups(this, Depth.popups);
    this.goal = new GoalSequence(GOAL_SEQUENCE);
    this.power = new PipPower(POWER_RULES);
    this.death = new DeathSequence(DEATH_RULES);
    this.tally = new TimeTally(TIME_TALLY);
    this.probe = createPipProbe();
    this.music = new MusicDirector(stageTracks(this.level.music), AUDIO_RULES.hurryWarningMs);
    this.musicTrack = undefined;

    this.controls = new DomInput(this.options.bindings);
    this.placeStart();
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

    this.viewLeft = nextPixelViewLeft(
      0,
      this.startX,
      LOGICAL_WIDTH,
      this.levelWidthPx,
      this.tuning.cameraLeadFraction,
    );
    this.actors = new StageActors(
      this.compiled.enemies,
      { isSolid: this.isSolidTile, tileSize: TILE_SIZE, levelHeightPx: this.levelHeightPx },
      this.actorEvents,
    );
    this.actors.start(this.viewLeft);
    this.actorSprites = new ActorSprites(this, this.actors, {
      behindTiles: Depth.behindTiles,
      actors: Depth.actors,
    });
    this.perfSampler = new PerfSampler(this, this.bridge, refreshHz, this.countActors);

    this.fitCameraToLogicalView(readZoom(this.registry) ?? FALLBACK_ZOOM);
    this.listen();
    this.parallax.update(this.viewLeft, 0);

    this.bridge.emit({
      type: 'loadComplete',
      stageId: this.level.id,
      stageLabel: this.level.label,
    });
    this.emitHudIfChanged();
    this.syncMusic();
  }

  override update(_time: number, delta: number): void {
    if (this.options.devTools) this.perfSampler.recordFrame();
    if (this.controls.consumePausePress() && this.canPause) {
      this.bridge.emit({ type: 'pauseRequested' });
    }
    this.stepPower(delta);
    if (this.death.active) this.stepDeath(delta);
    if (!this.worldFrozen && !this.goal.active && !this.finished) {
      this.blockClockMs += delta;
      this.session.tick(delta);
      this.checkHurry();
      if (this.session.timeUp && this.goal.phase === 'inactive') this.killPip('time-up');
    }
    this.effects.update(delta);
    this.popups.update(delta);
    this.advanceStarShimmer(delta);
    if (!this.player.isScripted) {
      this.collectPickups();
      this.checkGoalReached();
      this.checkCheckpoint();
    }
    if (this.goal.phase !== 'inactive' && !this.finished) this.stepGoal(delta);
    this.updatePipFlash(delta);
    this.music.setStar(this.power.starPower);
    this.music.step(delta);
    this.syncMusic();
    this.emitHudIfChanged();
  }

  private checkHurry(): void {
    if (this.music.hurry || this.session.hud.timeLeft > AUDIO_RULES.hurryTimeLeft) return;
    if (this.music.beginHurry()) this.audio.playSfx(Sfx.timeLow);
  }

  private syncMusic(): void {
    const track = this.music.track;
    if (track === this.musicTrack) return;
    this.musicTrack = track;
    this.audio.playMusic(track);
  }

  private get canPause(): boolean {
    return !this.finished && !this.gameIsOver;
  }

  private get worldFrozen(): boolean {
    return this.power.frozen || this.death.phase !== 'inactive' || this.gameIsOver;
  }

  private placeStart(): void {
    const respawnCell = this.runData.checkpointReached ? this.compiled.checkpoint : null;
    const start = respawnCell ?? this.compiled.start;
    this.startX = (start.column + 0.5) * TILE_SIZE;
    this.startY = (start.row + 1) * TILE_SIZE - PIP_HALF_HEIGHT;
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

  private buildPickups(collectedPostmarks: readonly number[]): void {
    const { width, height, coins, postmarks } = this.compiled;
    this.coins = new PickupField(width, height, coins, TILE_SIZE, PICKUP_INSET);
    this.postmarks = new PickupField(width, height, postmarks, TILE_SIZE, PICKUP_INSET);
    this.collectedPostmarks = [...collectedPostmarks];
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
    this.postmarkSprites = postmarks.map((cell, index) => {
      const taken = collectedPostmarks.includes(index);
      if (taken) this.postmarks.collectCell(cell.column, cell.row);
      return this.add
        .image(cellCentreX(cell), cellCentreY(cell), GAMEPLAY_ATLAS_ID, ItemFrame.postmark)
        .setDepth(Depth.pickups)
        .setVisible(!taken);
    });
  }

  private buildGoal(): void {
    const { column, baseRow, poleTopRow } = this.compiled.goal;
    const poleX = column * TILE_SIZE + HALF_TILE;
    const poleTopY = poleTopRow * TILE_SIZE + GOAL_POLE_TOP_SIZE;
    const baseTopY = baseRow * TILE_SIZE;
    this.goalPoleTopY = poleTopY;
    this.goalBaseTopY = baseTopY;
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

  private buildCheckpoint(): void {
    const cell = this.compiled.checkpoint;
    const reached = this.runData.checkpointReached === true;
    this.checkpoint = new CheckpointTracker(cell === null ? null : cellCentreX(cell), reached);
    this.checkpointPost =
      cell === null
        ? null
        : this.add
            .image(
              cellCentreX(cell),
              (cell.row + 1) * TILE_SIZE,
              GAMEPLAY_ATLAS_ID,
              reached ? ItemFrame.checkpointUp : ItemFrame.checkpointDown,
            )
            .setOrigin(0.5, 1)
            .setDepth(Depth.goal);
  }

  private listen(): void {
    this.controls.attach(window);
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.pollGamepad);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.followPlayer);
    // The Arcade plugin nulls physics.world on shutdown, possibly before this scene's clean-up runs.
    const world = this.physics.world;
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.stepActors);
    const unsubscribe = this.bridge.onCommand(this.handleCommand);
    this.registry.events.on(registryChangeEvent('zoom'), this.applyZoom);
    let cleanedUp = false;
    const cleanUp = (): void => {
      if (cleanedUp) return;
      cleanedUp = true;
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanUp);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanUp);
      unsubscribe();
      this.controls.detach();
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.pollGamepad);
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.followPlayer);
      world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.stepActors);
      this.registry.events.off(registryChangeEvent('zoom'), this.applyZoom);
      this.stopLoadReporting();
      this.player.destroy();
      this.parallax.destroy();
      this.coinSprites = [];
      this.postmarkSprites = [];
      this.starTiles = [];
      this.checkpointPost = null;
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanUp);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanUp);
  }

  private readonly handleCommand = (command: GameCommand): void => {
    switch (command.type) {
      case 'pause':
        if (!this.canPause || !this.scene.isActive()) return;
        this.controls.releaseAll();
        this.audio.pauseMusic();
        this.audio.playSfx(Sfx.pause);
        this.scene.pause();
        this.bridge.emit({ type: 'paused' });
        break;
      case 'resume':
        if (!this.scene.isPaused()) return;
        this.audio.resumeMusic();
        this.scene.resume();
        this.bridge.emit({ type: 'resumed' });
        break;
      case 'restart':
        this.audio.playMusic(null);
        this.scene.restart({});
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

  private readonly countActors = (): number => this.actors.activeCount;

  private readonly followPlayer = (_time: number, delta: number): void => {
    if (!this.player.isScripted && this.player.top > this.levelHeightPx) this.killPip('pit');
    this.viewLeft = nextPixelViewLeft(
      this.viewLeft,
      this.player.sprite.x,
      LOGICAL_WIDTH,
      this.levelWidthPx,
      this.tuning.cameraLeadFraction,
    );
    this.player.clampToViewLeft(this.viewLeft);
    this.player.updateAnimation();
    this.actorSprites.sync();
    this.centerCamera();
    this.parallax.update(this.viewLeft, delta);
  };

  private readonly stepActors = (): void => {
    if (this.worldFrozen) return;
    const dt = 1 / this.physics.world.fps;
    if (!this.player.isScripted) {
      if (this.player.controller.justLaunched) {
        this.audio.playSfx(this.player.form === 'small' ? Sfx.jumpSmall : Sfx.jumpBig);
      }
      this.checkHiddenBlocks();
      this.throwOnPress();
    }
    this.updateProbe();
    this.actors.step(dt, this.probe, this.viewLeft);
  };

  private updateProbe(): void {
    const body = this.player.sprite.body;
    const probe = this.probe;
    probe.box.x = body.x;
    probe.box.y = body.y;
    probe.box.width = body.width;
    probe.box.height = body.height;
    probe.vy = this.player.controller.vy;
    probe.onGround = this.player.grounded;
    probe.starPower = this.power.starPower;
    probe.vulnerable = this.power.vulnerable;
    probe.interactive = !this.player.isScripted;
  }

  private throwOnPress(): void {
    const run = this.controls.resolve().run;
    const pressed = run && !this.runHeldLastStep;
    this.runHeldLastStep = run;
    if (!pressed || !this.power.canThrow || this.player.isCrouching) return;
    const body = this.player.sprite.body;
    const facing = this.player.controller.facing;
    const handX = body.center.x + facing * PARCEL_HAND_REACH_PX;
    if (this.actors.throwParcel(handX, body.top + PARCEL_HAND_HEIGHT_PX, facing)) {
      this.player.startThrowPose();
      this.audio.playSfx(Sfx.parcelThrow);
    }
  }

  private readonly actorEvents: ActorEvents = {
    award: (points, x, y) => this.award(points, x, y),
    bouncePip: () => {
      this.player.bounce(COMBAT.stompBounceSpeed);
      this.audio.playSfx(Sfx.stomp);
    },
    hurtPip: () => this.hurtPip(),
    collectPowerUp: (kind, x, y) => this.collectPowerUp(kind, x, y),
    parcelBurst: (x, y) => this.effects.sparkle(x, y),
    strike: () => this.audio.playSfx(Sfx.kick),
  };

  private award(points: number, x: number, y: number): void {
    if (points === ONE_UP) {
      this.session.addLife();
      this.audio.playSfx(Sfx.oneUp);
    } else {
      this.session.addScore(points);
    }
    this.popups.show(points, x, y);
  }

  private hurtPip(): void {
    const outcome = this.power.damage();
    if (outcome === 'shrink') {
      this.audio.playSfx(Sfx.damage);
      this.beginTransition();
    } else if (outcome === 'death') {
      this.killPip('hit');
    }
  }

  private collectPowerUp(kind: PowerUpKind, x: number, y: number): void {
    switch (kind) {
      case 'parcel-box':
      case 'spark-stamp':
        this.audio.playSfx(Sfx.powerUpGet);
        this.award(SCORING.powerUpPoints, x, y);
        if (this.power.collect(kind) === 'transform') this.beginTransition();
        break;
      case 'rush-star':
        this.audio.playSfx(Sfx.powerUpGet);
        this.award(SCORING.powerUpPoints, x, y);
        this.power.startStar();
        this.starTintElapsedMs = 0;
        break;
      case 'green-stamp':
        this.award(ONE_UP, x, y);
        break;
    }
  }

  private beginTransition(): void {
    this.player.beginScripted();
    this.session.setPower(this.power.form);
    this.player.holdPose(this.power.displayForm);
  }

  private stepPower(deltaMs: number): void {
    if (this.death.phase !== 'inactive' || this.gameIsOver) return;
    const ended = this.power.step(deltaMs);
    if (ended) {
      this.player.setForm(this.power.form);
      this.player.endScripted();
    } else if (this.power.frozen) {
      this.player.holdPose(this.power.displayForm);
    }
  }

  private killPip(cause: DeathCause): void {
    if (this.death.phase !== 'inactive' || this.finished || this.gameIsOver) return;
    const sprite = this.player.sprite;
    this.player.beginScripted();
    this.session.stopClock();
    this.music.silence();
    this.audio.playSfx(Sfx.death);
    this.death.start(sprite.y, cause);
    if (cause === 'pit') this.player.hide();
    else this.player.showDeath(sprite.x, sprite.y);
  }

  private stepDeath(deltaMs: number): void {
    this.death.step(deltaMs);
    if (this.death.phase === 'fall') {
      this.player.sprite.y = Math.round(this.death.y);
    }
    if (this.death.done) this.finishLife();
  }

  private finishLife(): void {
    const livesLeft = this.session.loseLife();
    this.emitHudIfChanged();
    this.bridge.emit({ type: 'playerDied', stageId: this.level.id, livesLeft });
    if (livesLeft > 0) {
      const next: LevelSceneData = {
        run: this.session.totals(),
        checkpointReached: this.checkpoint.reached,
        postmarksCollected: this.collectedPostmarks,
      };
      this.scene.restart(next);
      return;
    }
    this.gameIsOver = true;
    this.music.gameOver();
    this.player.hide();
    this.bridge.emit({ type: 'gameOver', result: this.stageResult() });
  }

  private readonly isSolidTile = (tx: number, ty: number): boolean => {
    const row = this.compiled.collision[ty];
    return row !== undefined && (row[tx] ?? EMPTY_TILE) !== EMPTY_TILE;
  };

  private readonly isHiddenBlock = (tx: number, ty: number): boolean =>
    this.blocks.isHidden(tx, ty);

  private checkHiddenBlocks(): void {
    if (this.player.controller.vy >= 0) return;
    const body = this.player.sprite.body;
    const row = Math.floor(body.top / TILE_SIZE);
    const column = pickBumpedColumn(body.left, body.right, row, TILE_SIZE, this.isHiddenBlock);
    if (column === null) return;
    this.blocks.reveal(column, row);
    this.compiled.collision[row][column] = Tile.usedBlock;
    const tile = this.collisionLayer.putTileAt(Tile.usedBlock, column, row);
    this.player.stopUnderBlock((row + 1) * TILE_SIZE);
    this.applyBlockHit(hiddenBlockOutcome(this.blocks.itemAt(column, row)), tile, column, row);
  }

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
    const item = this.blocks.itemAt(column, row);
    const outcome = blockHitOutcome(tile.index, item, this.power.canBreakBricks);
    this.applyBlockHit(outcome, tile, column, row);
  };

  private applyBlockHit(
    outcome: BlockHitOutcome,
    tile: Phaser.Tilemaps.Tile,
    column: number,
    row: number,
  ): void {
    const sound = blockHitSound(outcome);
    if (sound !== null) this.audio.playSfx(sound);
    switch (outcome) {
      case 'none':
        return;
      case 'release-coin':
        this.markUsed(tile, column, row);
        this.payBlockCoin(tile);
        break;
      case 'release-item':
        this.releaseItem(column, row);
        this.markUsed(tile, column, row);
        break;
      case 'multi-coin':
        if (this.blocks.hitMultiCoin(column, row, this.blockClockMs)) {
          this.markUsed(tile, column, row);
        }
        this.payBlockCoin(tile);
        break;
      case 'break':
        this.breakBrick(tile, column, row);
        return;
      case 'bump':
        break;
    }
    this.effects.bump(tile);
    this.disturbAbove(column, row);
  }

  private markUsed(tile: Phaser.Tilemaps.Tile, column: number, row: number): void {
    tile.index = Tile.usedBlock;
    this.compiled.collision[row][column] = Tile.usedBlock;
  }

  private payBlockCoin(tile: Phaser.Tilemaps.Tile): void {
    this.collectCoin();
    this.effects.popCoin(tile.pixelX + HALF_TILE, tile.pixelY);
  }

  private releaseItem(column: number, row: number): void {
    const item = this.blocks.takeItem(column, row);
    const kind = this.itemKindFor(item);
    if (kind !== null) this.actors.releasePowerUp(kind, column, row);
  }

  private itemKindFor(item: BlockItem | null): PowerUpKind | null {
    switch (item) {
      case 'power':
        return this.power.form === 'small' ? 'parcel-box' : 'spark-stamp';
      case 'star':
        return 'rush-star';
      case 'one-up':
        return 'green-stamp';
      default:
        return null;
    }
  }

  private breakBrick(tile: Phaser.Tilemaps.Tile, column: number, row: number): void {
    this.effects.breakBrick(tile);
    this.collisionLayer.removeTileAt(column, row);
    this.compiled.collision[row][column] = EMPTY_TILE;
    this.session.addScore(SCORING.brickPoints);
    this.disturbAbove(column, row);
  }

  private disturbAbove(column: number, row: number): void {
    this.actors.bumpBlock(column, row);
    const coinAbove = this.coins.collectCell(column, row - 1);
    if (coinAbove >= 0) this.takeCoin(coinAbove, true);
  }

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
      const index = collected[i];
      const sprite = this.postmarkSprites[index];
      sprite.setVisible(false);
      this.collectedPostmarks.push(index);
      this.session.collectPostmark();
      this.audio.playSfx(Sfx.postmark);
      this.effects.sparkle(sprite.x, sprite.y);
    }
  }

  private takeCoin(index: number, popped: boolean): void {
    const sprite = this.coinSprites[index];
    sprite.setVisible(false).anims.stop();
    this.collectCoin();
    if (popped) this.effects.popCoin(sprite.x, sprite.y + HALF_TILE);
    else this.effects.sparkle(sprite.x, sprite.y);
  }

  private collectCoin(): void {
    const livesBefore = this.session.hud.lives;
    this.session.addCoin();
    this.audio.playSfx(this.session.hud.lives > livesBefore ? Sfx.oneUp : Sfx.coin);
  }

  private checkCheckpoint(): void {
    if (!this.checkpoint.update(this.player.sprite.x)) return;
    this.checkpointPost?.setFrame(ItemFrame.checkpointUp);
    this.audio.playSfx(Sfx.checkpoint);
    const cell = this.compiled.checkpoint!;
    this.bridge.emit({ type: 'checkpoint', stageId: this.level.id, column: cell.column });
  }

  private checkGoalReached(): void {
    if (this.finished || this.goal.phase !== 'inactive') return;
    const body = this.player.sprite.body;
    if (body.right < this.goalTriggerX) return;
    const feetY = body.bottom;
    this.player.beginScripted();
    this.player.showFlash(true, null);
    this.session.stopClock();
    this.music.silence();
    this.audio.playSfx(Sfx.goal);
    this.goal.start(this.player.sprite.y, this.goalLayout);
    this.player.placeScripted(this.goal.x, this.goal.y, 'goal-grab', 1);
    const fraction = grabHeightFraction(feetY, this.goalPoleTopY, this.goalBaseTopY);
    this.award(goalHeightPoints(fraction, GOAL_HEIGHT_BANDS), this.goalLayout.poleX, feetY);
  }

  private stepGoal(deltaMs: number): void {
    const goal = this.goal;
    if (goal.active) {
      goal.step(deltaMs / MS_PER_SECOND);
      this.flag.y = Math.round(goal.flagY);
      const animation =
        goal.phase === 'slide' ? 'goal-grab' : goal.phase === 'hop' ? 'jump' : 'walk';
      this.player.placeScripted(Math.round(goal.x), Math.round(goal.y), animation, 1);
    }
    if (goal.phase === 'done') this.player.hide();
    const leftThePole = goal.phase === 'walk' || goal.phase === 'done';
    if (leftThePole && !this.tally.active && !this.tally.done) {
      this.tally.start(this.session.hud.timeLeft);
      this.music.stageClear();
    }
    if (this.session.convertTime(this.tally.step(deltaMs)) > 0) this.audio.playSfx(Sfx.tally);
    if (goal.phase === 'done' && this.tally.done) this.finishStage();
  }

  private finishStage(): void {
    if (this.finished) return;
    this.finished = true;
    this.player.hide();
    this.emitHudIfChanged();
    this.bridge.emit({ type: 'stageComplete', result: this.stageResult() });
  }

  private stageResult(): StageResult {
    const hud = this.session.hud;
    return {
      stageId: this.level.id,
      score: hud.score,
      coins: hud.coins,
      timeLeft: hud.timeLeft,
      timeUsed: this.session.timeUsed,
      coinsCollected: this.session.coinsCollected,
      postmarks: this.session.postmarks,
      postmarksCollected: [...this.collectedPostmarks].sort((a, b) => a - b),
      postmarkTotal: this.compiled.postmarks.length,
    };
  }

  private updatePipFlash(deltaMs: number): void {
    if (this.player.isScripted && !this.power.frozen) return;
    const power = this.power;
    const visible =
      !power.invulnerable ||
      flickerVisible(power.invulnerableElapsedMs, POWER_RULES.flickerFrameMs);
    if (!power.starPower) {
      this.player.showFlash(visible, null);
      return;
    }
    this.starTintElapsedMs += deltaMs;
    const frameMs = power.starEnding
      ? POWER_RULES.starTintEndingFrameMs
      : POWER_RULES.starTintFrameMs;
    const tint = STAR_TINTS[frameAt(this.starTintElapsedMs, frameMs, STAR_TINTS.length)];
    this.player.showFlash(visible, tint);
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

function blockHitSound(outcome: BlockHitOutcome): SfxId | null {
  switch (outcome) {
    case 'none':
    case 'bump':
      return Sfx.bump;
    case 'release-item':
      return Sfx.powerUpAppear;
    case 'break':
      return Sfx.brickBreak;
    case 'release-coin':
    case 'multi-coin':
      return null;
  }
}

function cellCentreX(cell: CellCoordinate): number {
  return cell.column * TILE_SIZE + HALF_TILE;
}

function cellCentreY(cell: CellCoordinate): number {
  return cell.row * TILE_SIZE + HALF_TILE;
}
