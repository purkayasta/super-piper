import {
  EnemyFrame,
  ONE_UP_LABEL,
  PARCEL_SPIN_FRAMES,
  PowerUpFrame,
  SCORE_LABELS,
  type ScoreLabel,
} from '../../../content/art/atlas-frames';
import { ACTOR_ANIMATION, ENEMY_TUNING } from '../../configuration/actors.config';
import type { Enemy } from '../../entities/enemies/enemy';
import type { PowerUp } from '../../entities/power-ups/power-up';
import type { Parcel } from '../../entities/projectiles/parcel';
import { ONE_UP } from '../scoring/score-chain';
import { frameAt } from '../effects/effect-curves';

function alternate(elapsedMs: number, frameMs: number, first: string, second: string): string {
  return frameAt(elapsedMs, frameMs, 2) === 0 ? first : second;
}

export function enemyFrame(enemy: Enemy): string {
  const { walkFrameMs, flapFrameMs, plantBiteMs } = ACTOR_ANIMATION;
  switch (enemy.kind) {
    case 'thornbug':
      if (enemy.mode === 'squashed') return EnemyFrame.thornbugSquashed;
      return alternate(
        enemy.animMs,
        walkFrameMs,
        EnemyFrame.thornbugWalk0,
        EnemyFrame.thornbugWalk1,
      );
    case 'shellback':
      if (enemy.mode === 'walk') {
        return alternate(
          enemy.animMs,
          walkFrameMs,
          EnemyFrame.shellbackWalk0,
          EnemyFrame.shellbackWalk1,
        );
      }
      if (enemy.mode === 'shell' && enemy.modeMs >= ENEMY_TUNING.shellPeekMs) {
        const peekingMs = enemy.modeMs - ENEMY_TUNING.shellPeekMs;
        return alternate(
          peekingMs,
          walkFrameMs,
          EnemyFrame.shellbackPeek,
          EnemyFrame.shellbackShell,
        );
      }
      return EnemyFrame.shellbackShell;
    case 'flapjack':
      if (enemy.mode === 'fly') {
        return alternate(
          enemy.animMs,
          flapFrameMs,
          EnemyFrame.flapjackFly0,
          EnemyFrame.flapjackFly1,
        );
      }
      if (enemy.mode === 'squashed') return EnemyFrame.flapjackSquashed;
      return alternate(
        enemy.animMs,
        walkFrameMs,
        EnemyFrame.flapjackWalk0,
        EnemyFrame.flapjackWalk1,
      );
    case 'snapvine':
      return alternate(
        enemy.animMs,
        plantBiteMs,
        EnemyFrame.snapvineOpen,
        EnemyFrame.snapvineClosed,
      );
  }
}

export function enemyFacesRight(enemy: Enemy): boolean {
  return enemy.kind === 'shellback' && enemy.facing === 1;
}

export function powerUpFrame(item: PowerUp): string {
  const { glintFrameMs } = ACTOR_ANIMATION;
  switch (item.kind) {
    case 'parcel-box':
      return PowerUpFrame.parcelBox;
    case 'spark-stamp':
      return alternate(
        item.animMs,
        glintFrameMs,
        PowerUpFrame.sparkStamp0,
        PowerUpFrame.sparkStamp1,
      );
    case 'rush-star':
      return alternate(item.animMs, glintFrameMs, PowerUpFrame.rushStar0, PowerUpFrame.rushStar1);
    case 'green-stamp':
      return PowerUpFrame.greenStamp;
  }
}

export function parcelFrame(parcel: Parcel): string {
  const count = PARCEL_SPIN_FRAMES.length;
  const step = frameAt(parcel.animMs, ACTOR_ANIMATION.parcelSpinFrameMs, count);
  return PARCEL_SPIN_FRAMES[parcel.facing === 1 ? step : (count - step) % count];
}

export function scoreLabelFor(points: number): ScoreLabel | null {
  if (points === ONE_UP) return ONE_UP_LABEL;
  const label = String(points);
  return (SCORE_LABELS as readonly string[]).includes(label) ? (label as ScoreLabel) : null;
}
