import type Phaser from 'phaser';
import {
  COIN_SPIN_FRAMES,
  pipFrameName,
  type PipFrame,
  type PipOutfit,
} from '../../../content/art/atlas-frames';
import { GAMEPLAY_ATLAS_ID } from '../../../content/manifests/asset-manifest';
import { COIN_SPIN_FPS } from '../../configuration/effects.config';
import type { PipAnimation } from '../../systems/animation/pip-animation';

export const STRIDE_BASE_FPS = 10;

export const COIN_SPIN_ANIMATION = 'coin-spin';

const PIP_ANIMATION_FRAMES: Readonly<Record<PipAnimation, readonly PipFrame[]>> = {
  idle: ['idle'],
  walk: ['walk-0', 'walk-1', 'walk-2', 'walk-1'],
  run: ['run-0', 'run-1', 'run-2', 'run-1'],
  skid: ['skid'],
  jump: ['jump'],
  fall: ['fall'],
  'goal-grab': ['goal-grab'],
};

export function pipAnimationKey(outfit: PipOutfit, animation: PipAnimation): string {
  return `pip.${outfit}.${animation}`;
}

export function ensureGameplayAnimations(scene: Phaser.Scene, outfit: PipOutfit): void {
  const anims = scene.anims;
  for (const [animation, frames] of Object.entries(PIP_ANIMATION_FRAMES)) {
    const key = pipAnimationKey(outfit, animation as PipAnimation);
    if (anims.exists(key)) continue;
    anims.create({
      key,
      frames: frames.map((frame) => ({
        key: GAMEPLAY_ATLAS_ID,
        frame: pipFrameName(outfit, frame),
      })),
      frameRate: STRIDE_BASE_FPS,
      repeat: -1,
    });
  }
  if (!anims.exists(COIN_SPIN_ANIMATION)) {
    anims.create({
      key: COIN_SPIN_ANIMATION,
      frames: COIN_SPIN_FRAMES.map((frame) => ({ key: GAMEPLAY_ATLAS_ID, frame })),
      frameRate: COIN_SPIN_FPS,
      repeat: -1,
    });
  }
}
