import type Phaser from 'phaser';
import { EnemyFrame, PowerUpFrame } from '../../../content/art/atlas-frames';
import { GAMEPLAY_ATLAS_ID } from '../../../content/manifests/asset-manifest';
import { boxBottom, boxCenterX } from '../../entities/actors/actor-body';
import {
  enemyFacesRight,
  enemyFrame,
  parcelFrame,
  powerUpFrame,
} from '../../systems/animation/actor-frames';
import type { StageActors } from '../../systems/actors/stage-actors';

const ART_FOOT_GAP_PX = 2;

export interface ActorDepths {
  readonly behindTiles: number;
  readonly actors: number;
}

export class ActorSprites {
  private readonly enemySprites: Phaser.GameObjects.Image[];
  private readonly powerUpSprites: Phaser.GameObjects.Image[];
  private readonly parcelSprites: Phaser.GameObjects.Image[];

  constructor(
    scene: Phaser.Scene,
    private readonly actors: StageActors,
    private readonly depths: ActorDepths,
  ) {
    const pooled = (count: number, frame: string): Phaser.GameObjects.Image[] =>
      Array.from({ length: count }, () =>
        scene.add.image(0, 0, GAMEPLAY_ATLAS_ID, frame).setDepth(depths.actors).setVisible(false),
      );
    this.enemySprites = pooled(actors.enemies.length, EnemyFrame.thornbugWalk0);
    this.powerUpSprites = pooled(actors.powerUps.length, PowerUpFrame.parcelBox);
    this.parcelSprites = pooled(actors.parcels.length, PowerUpFrame.parcel0);
    for (const sprite of this.parcelSprites) sprite.setOrigin(0.5, 0.5);
  }

  sync(): void {
    this.syncEnemies();
    this.syncPowerUps();
    this.syncParcels();
  }

  private syncEnemies(): void {
    const enemies = this.actors.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const sprite = this.enemySprites[i];
      if (!enemy.active) {
        if (sprite.visible) sprite.setVisible(false);
        continue;
      }
      const body = enemy.body;
      const plant = enemy.kind === 'snapvine';
      const knocked = enemy.mode === 'knocked';
      setFrameIfChanged(sprite, enemyFrame(enemy));
      setDepthIfChanged(sprite, plant && !knocked ? this.depths.behindTiles : this.depths.actors);
      sprite
        .setOrigin(0.5, plant ? 0 : 1)
        .setPosition(boxCenterX(body), plant ? body.y : boxBottom(body))
        .setFlip(enemyFacesRight(enemy), knocked)
        .setVisible(true);
    }
  }

  private syncPowerUps(): void {
    const items = this.actors.powerUps;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const sprite = this.powerUpSprites[i];
      if (!item.active) {
        if (sprite.visible) sprite.setVisible(false);
        continue;
      }
      setFrameIfChanged(sprite, powerUpFrame(item));
      setDepthIfChanged(sprite, item.emerging ? this.depths.behindTiles : this.depths.actors);
      sprite
        .setOrigin(0.5, 1)
        .setPosition(boxCenterX(item.body), boxBottom(item.body) + ART_FOOT_GAP_PX)
        .setVisible(true);
    }
  }

  private syncParcels(): void {
    const parcels = this.actors.parcels;
    for (let i = 0; i < parcels.length; i++) {
      const parcel = parcels[i];
      const sprite = this.parcelSprites[i];
      if (!parcel.active) {
        if (sprite.visible) sprite.setVisible(false);
        continue;
      }
      const body = parcel.body;
      setFrameIfChanged(sprite, parcelFrame(parcel));
      sprite.setPosition(boxCenterX(body), body.y + body.height / 2).setVisible(true);
    }
  }
}

function setFrameIfChanged(sprite: Phaser.GameObjects.Image, frame: string): void {
  if (sprite.frame.name !== frame) sprite.setFrame(frame);
}

// Phaser re-sorts the display list on every setDepth call, even when the value is unchanged.
function setDepthIfChanged(sprite: Phaser.GameObjects.Image, depth: number): void {
  if (sprite.depth !== depth) sprite.setDepth(depth);
}
