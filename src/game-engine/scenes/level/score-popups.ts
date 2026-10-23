import type Phaser from 'phaser';
import { scoreFrameName } from '../../../content/art/atlas-frames';
import { GAMEPLAY_ATLAS_ID } from '../../../content/manifests/asset-manifest';
import { SCORE_POPUP } from '../../configuration/effects.config';
import { scoreLabelFor } from '../../systems/animation/actor-frames';
import { riseOffset } from '../../systems/effects/effect-curves';

interface PopupSlot {
  readonly image: Phaser.GameObjects.Image;
  active: boolean;
  elapsedMs: number;
  baseY: number;
}

export class ScorePopups {
  private readonly slots: PopupSlot[] = [];

  constructor(scene: Phaser.Scene, depth: number) {
    for (let i = 0; i < SCORE_POPUP.poolSize; i++) {
      this.slots.push({
        image: scene.add
          .image(0, 0, GAMEPLAY_ATLAS_ID, scoreFrameName('100'))
          .setDepth(depth)
          .setVisible(false),
        active: false,
        elapsedMs: 0,
        baseY: 0,
      });
    }
  }

  show(points: number, centerX: number, bottomY: number): void {
    const label = scoreLabelFor(points);
    if (label === null) return;
    const slot = this.oldestSlot();
    slot.active = true;
    slot.elapsedMs = 0;
    slot.baseY = Math.round(bottomY);
    slot.image
      .setFrame(scoreFrameName(label))
      .setOrigin(0.5, 1)
      .setPosition(Math.round(centerX), slot.baseY)
      .setVisible(true);
  }

  update(deltaMs: number): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.active) continue;
      slot.elapsedMs += deltaMs;
      if (slot.elapsedMs >= SCORE_POPUP.durationMs) {
        slot.active = false;
        slot.image.setVisible(false);
        continue;
      }
      const offset = riseOffset(slot.elapsedMs, SCORE_POPUP.durationMs, SCORE_POPUP.risePx);
      slot.image.y = slot.baseY + Math.round(offset);
    }
  }

  private oldestSlot(): PopupSlot {
    let chosen = this.slots[0];
    for (const slot of this.slots) {
      if (!slot.active) return slot;
      if (slot.elapsedMs > chosen.elapsedMs) chosen = slot;
    }
    return chosen;
  }
}
