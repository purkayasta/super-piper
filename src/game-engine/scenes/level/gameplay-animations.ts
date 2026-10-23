import type Phaser from 'phaser';
import {
  COIN_SPIN_FRAMES,
  SPARK_LOOK,
  pipFrameName,
  type PipFrame,
  type PipLook,
  type PipOutfit,
} from '../../../content/art/atlas-frames';
import { GAMEPLAY_ATLAS_ID } from '../../../content/manifests/asset-manifest';
import { COIN_SPIN_FPS } from '../../configuration/effects.config';
import type { PowerForm } from '../../core/game-events';
import type { PipAnimation } from '../../systems/animation/pip-animation';

export const STRIDE_BASE_FPS = 10;

export const COIN_SPIN_ANIMATION = 'coin-spin';

export type PipSize = 'small' | 'big';

const SMALL_ANIMATION_FRAMES: Readonly<Record<PipAnimation, readonly PipFrame[]>> = {
  idle: ['idle'],
  walk: ['walk-0', 'walk-1', 'walk-2', 'walk-1'],
  run: ['run-0', 'run-1', 'run-2', 'run-1'],
  skid: ['skid'],
  jump: ['jump'],
  fall: ['fall'],
  'goal-grab': ['goal-grab'],
  crouch: ['idle'],
  throw: ['idle'],
  death: ['death'],
};

const BIG_ANIMATION_FRAMES: Readonly<Record<PipAnimation, readonly PipFrame[]>> = {
  idle: ['big-idle'],
  walk: ['big-walk-0', 'big-walk-1', 'big-walk-2', 'big-walk-1'],
  run: ['big-run-0', 'big-run-1', 'big-run-2', 'big-run-1'],
  skid: ['big-skid'],
  jump: ['big-jump'],
  fall: ['big-fall'],
  'goal-grab': ['big-goal-grab'],
  crouch: ['big-crouch'],
  throw: ['big-throw'],
  death: ['big-fall'],
};

const FRAMES_BY_SIZE: Readonly<Record<PipSize, typeof SMALL_ANIMATION_FRAMES>> = {
  small: SMALL_ANIMATION_FRAMES,
  big: BIG_ANIMATION_FRAMES,
};

export function pipSizeFor(form: PowerForm): PipSize {
  return form === 'small' ? 'small' : 'big';
}

export function pipLookFor(form: PowerForm, outfit: PipOutfit): PipLook {
  return form === 'spark' ? SPARK_LOOK : outfit;
}

export function pipAnimationKey(look: PipLook, size: PipSize, animation: PipAnimation): string {
  return `pip.${look}.${size}.${animation}`;
}

export function ensureGameplayAnimations(scene: Phaser.Scene, outfit: PipOutfit): void {
  createPipAnimations(scene, outfit, 'small');
  createPipAnimations(scene, outfit, 'big');
  createPipAnimations(scene, SPARK_LOOK, 'big');
  if (!scene.anims.exists(COIN_SPIN_ANIMATION)) {
    scene.anims.create({
      key: COIN_SPIN_ANIMATION,
      frames: COIN_SPIN_FRAMES.map((frame) => ({ key: GAMEPLAY_ATLAS_ID, frame })),
      frameRate: COIN_SPIN_FPS,
      repeat: -1,
    });
  }
}

function createPipAnimations(scene: Phaser.Scene, look: PipLook, size: PipSize): void {
  const anims = scene.anims;
  for (const [animation, frames] of Object.entries(FRAMES_BY_SIZE[size])) {
    const key = pipAnimationKey(look, size, animation as PipAnimation);
    if (anims.exists(key)) continue;
    anims.create({
      key,
      frames: frames.map((frame) => ({ key: GAMEPLAY_ATLAS_ID, frame: pipFrameName(look, frame) })),
      frameRate: STRIDE_BASE_FPS,
      repeat: -1,
    });
  }
}
