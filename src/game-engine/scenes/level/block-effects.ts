import type Phaser from 'phaser';
import { ItemFrame, SPARKLE_FRAMES } from '../../../content/art/atlas-frames';
import { GAMEPLAY_ATLAS_ID, type AssetId } from '../../../content/manifests/asset-manifest';
import {
  BLOCK_BUMP,
  BRICK_DEBRIS,
  COIN_POP,
  COIN_SPIN_FPS,
  EFFECT_POOL_SIZE,
  SPARKLE,
} from '../../configuration/effects.config';
import { TILE_SIZE } from '../../configuration/physics.config';
import {
  ballisticOffset,
  bumpOffset,
  coinPopOffset,
  effectProgress,
} from '../../systems/effects/effect-curves';
import { COIN_SPIN_ANIMATION } from './gameplay-animations';
import { tileFrameName } from './stage-assets';

interface BumpSlot {
  readonly image: Phaser.GameObjects.Image;
  tile: Phaser.Tilemaps.Tile | null;
  elapsedMs: number;
}

interface TimedSlot {
  readonly sprite: Phaser.GameObjects.Sprite;
  active: boolean;
  elapsedMs: number;
  baseY: number;
}

interface DebrisSlot {
  readonly image: Phaser.GameObjects.Image;
  active: boolean;
  elapsedMs: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
}

const HALF_TILE = TILE_SIZE / 2;
const MS_PER_SECOND = 1000;

export class BlockEffects {
  private readonly bumps: BumpSlot[] = [];
  private readonly coinPops: TimedSlot[] = [];
  private readonly sparkles: TimedSlot[] = [];
  private readonly debris: DebrisSlot[] = [];

  constructor(scene: Phaser.Scene, tilesetKey: AssetId, depth: number) {
    for (let i = 0; i < EFFECT_POOL_SIZE; i++) {
      this.bumps.push({
        image: scene.add
          .image(0, 0, tilesetKey, tileFrameName(0))
          .setDepth(depth)
          .setVisible(false),
        tile: null,
        elapsedMs: 0,
      });
      this.coinPops.push(this.timedSlot(scene, ItemFrame.coin0, depth + 1));
      this.sparkles.push(this.timedSlot(scene, ItemFrame.sparkle0, depth + 2));
    }
    for (let i = 0; i < BRICK_DEBRIS.poolSize; i++) {
      this.debris.push({
        image: scene.add
          .image(0, 0, GAMEPLAY_ATLAS_ID, ItemFrame.brickDebris)
          .setDepth(depth + 3)
          .setVisible(false),
        active: false,
        elapsedMs: 0,
        originX: 0,
        originY: 0,
        vx: 0,
        vy: 0,
      });
    }
  }

  breakBrick(tile: Phaser.Tilemaps.Tile): void {
    const centerX = tile.pixelX + HALF_TILE;
    const centerY = tile.pixelY + HALF_TILE;
    for (const piece of BRICK_DEBRIS.pieces) {
      const slot = this.oldestDebris();
      slot.active = true;
      slot.elapsedMs = 0;
      slot.originX = centerX + piece.offsetX;
      slot.originY = centerY + piece.offsetY;
      slot.vx = piece.vx;
      slot.vy = piece.vy;
      slot.image.setPosition(slot.originX, slot.originY).setVisible(true);
    }
  }

  isBumping(tile: Phaser.Tilemaps.Tile): boolean {
    return this.bumps.some((slot) => slot.tile === tile);
  }

  bump(tile: Phaser.Tilemaps.Tile): void {
    const slot = this.bumps.find((candidate) => candidate.tile === null) ?? this.oldestBump();
    if (slot.tile !== null) slot.tile.setVisible(true);
    slot.tile = tile;
    slot.elapsedMs = 0;
    tile.setVisible(false);
    slot.image
      .setFrame(tileFrameName(tile.index))
      .setPosition(tile.pixelX + HALF_TILE, tile.pixelY + HALF_TILE)
      .setVisible(true);
  }

  popCoin(centerX: number, topY: number): void {
    const slot = this.freeSlot(this.coinPops);
    slot.baseY = topY - HALF_TILE;
    slot.sprite.setPosition(centerX, slot.baseY).setVisible(true);
    slot.sprite.anims.play(COIN_SPIN_ANIMATION);
    slot.sprite.anims.timeScale = COIN_POP.spinFps / COIN_SPIN_FPS;
  }

  sparkle(centerX: number, centerY: number): void {
    const slot = this.freeSlot(this.sparkles);
    slot.baseY = centerY;
    slot.sprite.setFrame(SPARKLE_FRAMES[0]).setPosition(centerX, centerY).setVisible(true);
  }

  update(deltaMs: number): void {
    for (let i = 0; i < EFFECT_POOL_SIZE; i++) {
      this.updateBump(this.bumps[i], deltaMs);
      this.updateCoinPop(this.coinPops[i], deltaMs);
      this.updateSparkle(this.sparkles[i], deltaMs);
    }
    for (let i = 0; i < this.debris.length; i++) this.updateDebris(this.debris[i], deltaMs);
  }

  private updateDebris(slot: DebrisSlot, deltaMs: number): void {
    if (!slot.active) return;
    slot.elapsedMs += deltaMs;
    if (slot.elapsedMs >= BRICK_DEBRIS.durationMs) {
      slot.active = false;
      slot.image.setVisible(false);
      return;
    }
    const seconds = slot.elapsedMs / MS_PER_SECOND;
    slot.image.setPosition(
      Math.round(slot.originX + slot.vx * seconds),
      Math.round(slot.originY + ballisticOffset(slot.vy, BRICK_DEBRIS.gravity, seconds)),
    );
  }

  private oldestDebris(): DebrisSlot {
    let chosen = this.debris[0];
    for (const slot of this.debris) {
      if (!slot.active) return slot;
      if (slot.elapsedMs > chosen.elapsedMs) chosen = slot;
    }
    return chosen;
  }

  private updateBump(slot: BumpSlot, deltaMs: number): void {
    const tile = slot.tile;
    if (tile === null) return;
    slot.elapsedMs += deltaMs;
    if (slot.elapsedMs >= BLOCK_BUMP.durationMs) {
      tile.setVisible(true);
      slot.tile = null;
      slot.image.setVisible(false);
      return;
    }
    const offset = bumpOffset(slot.elapsedMs, BLOCK_BUMP.durationMs, BLOCK_BUMP.heightPx);
    slot.image.y = tile.pixelY + HALF_TILE + Math.round(offset);
  }

  private updateCoinPop(slot: TimedSlot, deltaMs: number): void {
    if (!slot.active) return;
    slot.elapsedMs += deltaMs;
    if (slot.elapsedMs >= COIN_POP.durationMs) {
      this.release(slot);
      slot.sprite.anims.stop();
      this.sparkle(slot.sprite.x, slot.baseY - HALF_TILE);
      return;
    }
    slot.sprite.y =
      slot.baseY + Math.round(coinPopOffset(slot.elapsedMs, COIN_POP.durationMs, COIN_POP.risePx));
  }

  private updateSparkle(slot: TimedSlot, deltaMs: number): void {
    if (!slot.active) return;
    slot.elapsedMs += deltaMs;
    const progress = effectProgress(slot.elapsedMs, SPARKLE.durationMs);
    if (progress >= 1) {
      this.release(slot);
      return;
    }
    const frame = SPARKLE_FRAMES[progress < 0.5 ? 0 : 1];
    if (slot.sprite.frame.name !== frame) slot.sprite.setFrame(frame);
  }

  private timedSlot(scene: Phaser.Scene, frame: string, depth: number): TimedSlot {
    const sprite = scene.add
      .sprite(0, 0, GAMEPLAY_ATLAS_ID, frame)
      .setDepth(depth)
      .setVisible(false);
    return { sprite, active: false, elapsedMs: 0, baseY: 0 };
  }

  private freeSlot(slots: TimedSlot[]): TimedSlot {
    let chosen = slots[0];
    for (const slot of slots) {
      if (!slot.active) {
        chosen = slot;
        break;
      }
      if (slot.elapsedMs > chosen.elapsedMs) chosen = slot;
    }
    chosen.active = true;
    chosen.elapsedMs = 0;
    return chosen;
  }

  private oldestBump(): BumpSlot {
    return this.bumps.reduce((oldest, slot) => (slot.elapsedMs > oldest.elapsedMs ? slot : oldest));
  }

  private release(slot: TimedSlot): void {
    slot.active = false;
    slot.sprite.setVisible(false);
  }
}
