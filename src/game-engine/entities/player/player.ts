import Phaser from 'phaser';
import type { MovementTuning } from '../../configuration/movement.config';
import { PLAYER_SMALL_BODY, TILE_SIZE } from '../../configuration/physics.config';
import { clampToCameraLeft } from '../../systems/camera/forward-camera';
import type { ActionState } from '../../systems/input/actions';
import { cornerNudge, type Rect } from '../../systems/physics/corner-nudge';
import { PIP_TEXTURE_KEY } from './pip-placeholder';
import { PlayerController, type Contacts } from './player-controller';

const UNBOUNDED_SPEED = 1e6;

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

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private tuning: MovementTuning,
    private readonly input: () => ActionState,
    private readonly isSolidTile: (tx: number, ty: number) => boolean,
  ) {
    this.controller = new PlayerController(tuning);
    this.world = scene.physics.world;
    this.sprite = scene.physics.add.sprite(x, y, PIP_TEXTURE_KEY);
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

  clampToViewLeft(viewLeft: number): void {
    this.leftEdge = viewLeft;
    const body = this.sprite.body;
    const shift = clampToCameraLeft(body.x, viewLeft) - body.x;
    if (shift === 0) return;
    this.sprite.x += shift;
    body.updateFromGameObject();
  }

  respawn(x: number, y: number): void {
    this.controller.reset();
    this.leftEdge = -Infinity;
    this.sprite.setFlipX(false);
    const body = this.sprite.body;
    body.reset(x, y);
    // Body.reset places the body at the frame's top-left and ignores the body offset.
    body.updateFromGameObject();
  }

  destroy(): void {
    this.world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.onWorldStep);
    this.sprite.destroy();
  }

  private readonly onWorldStep = (): void => {
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
    controller.step(this.input(), contacts, dt);
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
