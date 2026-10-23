import Phaser from 'phaser';
import { DEFAULT_OUTFIT, pipFrameName, type PipOutfit } from '../../../content/art/atlas-frames';
import { GAMEPLAY_ATLAS_ID } from '../../../content/manifests/asset-manifest';
import {
  DEFAULT_MOVEMENT_SENSITIVITY,
  type MovementSensitivity,
  type MovementTuning,
} from '../../configuration/movement.config';
import { PLAYER_BIG_BODY, PLAYER_SMALL_BODY, TILE_SIZE } from '../../configuration/physics.config';
import { CROUCH_HEADROOM_PX, POWER_RULES } from '../../configuration/rules.config';
import type { PowerForm } from '../../core/game-events';
import {
  STRIDE_BASE_FPS,
  ensureGameplayAnimations,
  pipAnimationKey,
  pipLookFor,
  pipSizeFor,
} from '../../scenes/level/gameplay-animations';
import {
  poseAnimation,
  selectPipAnimation,
  strideFrameRate,
  type PipAnimation,
} from '../../systems/animation/pip-animation';
import { clampToCameraLeft } from '../../systems/camera/forward-camera';
import { createActionState, type ActionState } from '../../systems/input/actions';
import { cornerNudge, type Rect } from '../../systems/physics/corner-nudge';
import { nextCrouching } from '../../systems/power/crouch';
import { PlayerController, type Contacts } from './player-controller';

const UNBOUNDED_SPEED = 1e6;
const MS_PER_SECOND = 1000;
const NO_TINT = -1;

type BodySize = typeof PLAYER_SMALL_BODY | typeof PLAYER_BIG_BODY;

export type HeadBumpHandler = (bodyLeft: number, bodyRight: number, bodyTop: number) => void;

export class Player {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  readonly controller: PlayerController;
  private readonly world: Phaser.Physics.Arcade.World;
  private readonly contacts: Contacts = {
    onGround: false,
    hitCeiling: false,
    hitWallLeft: false,
    hitWallRight: false,
  };
  private readonly headBox: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private readonly steeringFree: ActionState = createActionState();
  private leftEdge = -Infinity;
  private animationKey = '';
  private scripted = false;
  private currentForm: PowerForm = 'small';
  private crouching = false;
  private throwPoseMs = 0;
  private shownTint = NO_TINT;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private tuning: MovementTuning,
    private readonly input: () => ActionState,
    private readonly isSolidTile: (tx: number, ty: number) => boolean,
    private readonly onHeadBump: HeadBumpHandler | null = null,
    private readonly outfit: PipOutfit = DEFAULT_OUTFIT,
    sensitivity: MovementSensitivity = DEFAULT_MOVEMENT_SENSITIVITY,
  ) {
    ensureGameplayAnimations(scene, outfit);
    this.controller = new PlayerController(tuning, sensitivity);
    this.world = scene.physics.world;
    this.sprite = scene.physics.add.sprite(x, y, GAMEPLAY_ATLAS_ID, pipFrameName(outfit, 'idle'));
    const body = this.sprite.body;
    body.setSize(PLAYER_SMALL_BODY.width, PLAYER_SMALL_BODY.height, false);
    body.setOffset(PLAYER_SMALL_BODY.offsetX, PLAYER_SMALL_BODY.offsetY);
    body.updateFromGameObject();
    body.setAllowGravity(false);
    body.setAcceleration(0, 0);
    body.setDrag(0, 0);
    body.setMaxVelocity(UNBOUNDED_SPEED, UNBOUNDED_SPEED);
    this.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.onWorldStep);
  }

  setTuning(tuning: MovementTuning): void {
    this.tuning = tuning;
    this.controller.setTuning(tuning);
  }

  get top(): number {
    return this.sprite.body.y;
  }

  get isScripted(): boolean {
    return this.scripted;
  }

  get form(): PowerForm {
    return this.currentForm;
  }

  get grounded(): boolean {
    return this.controller.mode !== 'air';
  }

  get isCrouching(): boolean {
    return this.crouching;
  }

  setForm(form: PowerForm): void {
    this.currentForm = form;
    if (form === 'small') this.crouching = false;
    this.applyBodySize();
  }

  clampToViewLeft(viewLeft: number): void {
    this.leftEdge = viewLeft;
    if (this.scripted) return;
    const body = this.sprite.body;
    const shift = clampToCameraLeft(body.x, viewLeft) - body.x;
    if (shift === 0) return;
    this.sprite.x += shift;
    body.updateFromGameObject();
  }

  respawn(x: number, y: number): void {
    this.controller.reset();
    this.leftEdge = -Infinity;
    this.scripted = false;
    this.crouching = false;
    this.throwPoseMs = 0;
    this.sprite.setFlipX(false).setVisible(true);
    this.applyTint(NO_TINT);
    const body = this.sprite.body;
    body.enable = true;
    this.applyBodySize();
    body.reset(x, y);
    // Body.reset places the body at the frame's top-left and ignores the body offset.
    body.updateFromGameObject();
  }

  updateAnimation(): void {
    if (this.scripted) return;
    const controller = this.controller;
    const base = selectPipAnimation(controller.mode, controller.vx, controller.vy, this.tuning);
    const pose = poseAnimation(base, this.currentForm, this.crouching, this.throwPoseMs > 0);
    this.playAnimation(this.currentForm, pose);
    const striding = pose === 'walk' || pose === 'run';
    this.sprite.anims.timeScale = striding
      ? strideFrameRate(controller.vx, this.tuning) / STRIDE_BASE_FPS
      : 1;
  }

  showFlash(visible: boolean, tint: number | null): void {
    if (this.sprite.visible !== visible) this.sprite.setVisible(visible);
    this.applyTint(tint ?? NO_TINT);
  }

  bounce(speed: number): void {
    this.controller.bounce(speed);
    this.sprite.body.setVelocity(this.controller.bodyVx, this.controller.bodyVy);
  }

  stopUnderBlock(blockBottomY: number): void {
    const body = this.sprite.body;
    body.position.y = blockBottomY;
    body.updateCenter();
    this.controller.stopRising();
    body.setVelocity(this.controller.bodyVx, this.controller.bodyVy);
  }

  startThrowPose(): void {
    this.throwPoseMs = POWER_RULES.throwPoseMs;
  }

  beginScripted(): void {
    this.scripted = true;
    const sprite = this.sprite;
    sprite.anims.timeScale = 1;
    const body = sprite.body;
    // A disabled body skips postUpdate, so this frame's integrated movement must be copied to the sprite here.
    sprite.setPosition(
      body.x - body.offset.x + sprite.displayOriginX,
      body.y - body.offset.y + sprite.displayOriginY,
    );
    body.setVelocity(0, 0);
    body.enable = false;
  }

  endScripted(): void {
    this.scripted = false;
    const body = this.sprite.body;
    body.enable = true;
    body.updateFromGameObject();
    body.setVelocity(this.controller.bodyVx, this.controller.bodyVy);
  }

  holdPose(form: PowerForm): void {
    const base = this.grounded ? 'idle' : 'jump';
    this.playAnimation(form, poseAnimation(base, form, this.crouching, false));
  }

  placeScripted(x: number, y: number, animation: PipAnimation, facing: 1 | -1): void {
    this.sprite.setPosition(x, y).setFlipX(facing < 0);
    this.playAnimation(this.currentForm, animation);
  }

  showDeath(x: number, y: number): void {
    this.applyTint(NO_TINT);
    this.sprite.setVisible(true).setPosition(x, y).setFlipX(false);
    this.playAnimation('small', 'death');
  }

  hide(): void {
    this.sprite.setVisible(false);
  }

  destroy(): void {
    this.world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.onWorldStep);
    this.sprite.destroy();
  }

  private playAnimation(form: PowerForm, animation: PipAnimation): void {
    const key = pipAnimationKey(pipLookFor(form, this.outfit), pipSizeFor(form), animation);
    if (key === this.animationKey) return;
    this.animationKey = key;
    this.sprite.anims.play(key);
  }

  private applyTint(tint: number): void {
    if (tint === this.shownTint) return;
    this.shownTint = tint;
    if (tint === NO_TINT) this.sprite.clearTint();
    else this.sprite.setTint(tint);
  }

  private applyBodySize(): void {
    const size: BodySize =
      this.currentForm === 'small' || this.crouching ? PLAYER_SMALL_BODY : PLAYER_BIG_BODY;
    const body = this.sprite.body;
    if (body.height === size.height && body.offset.y === size.offsetY) return;
    const feetShift = body.height - size.height;
    body.setSize(size.width, size.height, false);
    body.setOffset(size.offsetX, size.offsetY);
    if (!body.enable) return;
    // Mid-frame the sprite still sits where the frame started; shifting prev/prevFrame keeps postUpdate from moving it.
    body.position.y += feetShift;
    body.prev.y += feetShift;
    body.prevFrame.y += feetShift;
    body.updateCenter();
  }

  private hasHeadroom(): boolean {
    const body = this.sprite.body;
    const firstRow = Math.floor((body.top - CROUCH_HEADROOM_PX) / TILE_SIZE);
    const lastRow = Math.floor((body.top - 1) / TILE_SIZE);
    const firstColumn = Math.floor(body.left / TILE_SIZE);
    const lastColumn = Math.floor((body.right - 1) / TILE_SIZE);
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        if (this.isSolidTile(column, row)) return false;
      }
    }
    return true;
  }

  private steeringFor(actions: ActionState): ActionState {
    if (!this.crouching || !this.grounded) return actions;
    const free = this.steeringFree;
    free.left = false;
    free.right = false;
    free.down = actions.down;
    free.jump = actions.jump;
    free.run = actions.run;
    return free;
  }

  private updateCrouch(actions: ActionState): void {
    const headroom = !this.crouching || this.hasHeadroom();
    const crouching = nextCrouching(
      this.crouching,
      this.currentForm,
      actions.down,
      this.grounded,
      headroom,
    );
    if (crouching === this.crouching) return;
    this.crouching = crouching;
    this.applyBodySize();
  }

  private readonly onWorldStep = (): void => {
    if (this.scripted) return;
    const body = this.sprite.body;
    const blocked = body.blocked;
    const contacts = this.contacts;
    contacts.onGround = blocked.down;
    contacts.hitCeiling = blocked.up;
    contacts.hitWallLeft = blocked.left || body.x <= this.leftEdge;
    contacts.hitWallRight = blocked.right;
    // World.step only resets blocked flags on a frame's first step, so later steps would see stale contacts.
    blocked.none = true;
    blocked.up = false;
    blocked.down = false;
    blocked.left = false;
    blocked.right = false;

    const dt = 1 / this.world.fps;
    this.throwPoseMs = Math.max(0, this.throwPoseMs - dt * MS_PER_SECOND);
    const actions = this.input();
    this.updateCrouch(actions);
    const controller = this.controller;
    const wasRising = controller.vy < 0;
    controller.step(this.steeringFor(actions), contacts, dt);
    if (contacts.hitCeiling && wasRising) this.onHeadBump?.(body.left, body.right, body.top);
    if (controller.vy < 0) this.nudgePastCorner(body, controller.bodyVy * dt);
    body.setVelocity(controller.bodyVx, controller.bodyVy);
    this.sprite.setFlipX(controller.facing < 0);
  };

  private nudgePastCorner(body: Phaser.Physics.Arcade.Body, dy: number): void {
    const box = this.headBox;
    box.x = body.x;
    box.y = body.y;
    box.width = body.width;
    box.height = body.height;
    const dx = cornerNudge(box, dy, this.isSolidTile, TILE_SIZE, this.tuning.cornerNudgePx);
    if (dx === 0) return;
    body.position.x += dx;
    body.updateCenter();
  }
}
