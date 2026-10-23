import Phaser from 'phaser';
import { DEFAULT_OUTFIT, pipFrameName, type PipOutfit } from '../../../content/art/atlas-frames';
import { GAMEPLAY_ATLAS_ID } from '../../../content/manifests/asset-manifest';
import type { MovementTuning } from '../../configuration/movement.config';
import { PLAYER_SMALL_BODY, TILE_SIZE } from '../../configuration/physics.config';
import {
  STRIDE_BASE_FPS,
  ensureGameplayAnimations,
  pipAnimationKey,
} from '../../scenes/level/gameplay-animations';
import {
  selectPipAnimation,
  strideFrameRate,
  type PipAnimation,
} from '../../systems/animation/pip-animation';
import { clampToCameraLeft } from '../../systems/camera/forward-camera';
import type { ActionState } from '../../systems/input/actions';
import { cornerNudge, type Rect } from '../../systems/physics/corner-nudge';
import { PlayerController, type Contacts } from './player-controller';

const UNBOUNDED_SPEED = 1e6;

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
  private leftEdge = -Infinity;
  private animation: PipAnimation | null = null;
  private scripted = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private tuning: MovementTuning,
    private readonly input: () => ActionState,
    private readonly isSolidTile: (tx: number, ty: number) => boolean,
    private readonly onHeadBump: HeadBumpHandler | null = null,
    private readonly outfit: PipOutfit = DEFAULT_OUTFIT,
  ) {
    ensureGameplayAnimations(scene, outfit);
    this.controller = new PlayerController(tuning);
    this.world = scene.physics.world;
    this.sprite = scene.physics.add.sprite(x, y, GAMEPLAY_ATLAS_ID, pipFrameName(outfit, 'idle'));
    const body = this.sprite.body;
    body.setSize(PLAYER_SMALL_BODY.width, PLAYER_SMALL_BODY.height, false);
    body.setOffset(PLAYER_SMALL_BODY.offsetX, PLAYER_SMALL_BODY.offsetY);
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
    this.sprite.setFlipX(false).setVisible(true);
    const body = this.sprite.body;
    body.enable = true;
    body.reset(x, y);
    // Body.reset places the body at the frame's top-left and ignores the body offset.
    body.updateFromGameObject();
  }

  updateAnimation(): void {
    if (this.scripted) return;
    const controller = this.controller;
    const next = selectPipAnimation(controller.mode, controller.vx, controller.vy, this.tuning);
    this.playAnimation(next);
    const striding = next === 'walk' || next === 'run';
    this.sprite.anims.timeScale = striding
      ? strideFrameRate(controller.vx, this.tuning) / STRIDE_BASE_FPS
      : 1;
  }

  beginScripted(): void {
    this.scripted = true;
    const body = this.sprite.body;
    body.setVelocity(0, 0);
    body.enable = false;
  }

  placeScripted(x: number, y: number, animation: PipAnimation, facing: 1 | -1): void {
    this.sprite.setPosition(x, y).setFlipX(facing < 0);
    this.playAnimation(animation);
  }

  hide(): void {
    this.sprite.setVisible(false);
  }

  destroy(): void {
    this.world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.onWorldStep);
    this.sprite.destroy();
  }

  private playAnimation(animation: PipAnimation): void {
    if (animation === this.animation) return;
    this.animation = animation;
    this.sprite.anims.play(pipAnimationKey(this.outfit, animation));
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
    const controller = this.controller;
    const wasRising = controller.vy < 0;
    controller.step(this.input(), contacts, dt);
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
