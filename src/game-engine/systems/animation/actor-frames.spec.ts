import { describe, expect, it } from 'vitest';
import { EnemyFrame, PARCEL_SPIN_FRAMES, PowerUpFrame } from '../../../content/art/atlas-frames';
import {
  ACTOR_ANIMATION,
  ENEMY_TUNING,
  PARCEL_TUNING,
  POWER_UP_TUNING,
} from '../../configuration/actors.config';
import { Enemy } from '../../entities/enemies/enemy';
import { PowerUp } from '../../entities/power-ups/power-up';
import { Parcel } from '../../entities/projectiles/parcel';
import { ONE_UP } from '../scoring/score-chain';
import {
  enemyFacesRight,
  enemyFrame,
  parcelFrame,
  powerUpFrame,
  scoreLabelFor,
} from './actor-frames';

function enemy(kind: Enemy['kind']): Enemy {
  const created = new Enemy(ENEMY_TUNING);
  created.spawn(kind, 3, 3, 16);
  return created;
}

describe('enemyFrame', () => {
  it('alternates walk frames over time', () => {
    const thornbug = enemy('thornbug');
    expect(enemyFrame(thornbug)).toBe(EnemyFrame.thornbugWalk0);
    thornbug.animMs = ACTOR_ANIMATION.walkFrameMs;
    expect(enemyFrame(thornbug)).toBe(EnemyFrame.thornbugWalk1);
    thornbug.stomp();
    expect(enemyFrame(thornbug)).toBe(EnemyFrame.thornbugSquashed);
  });

  it('shows the shell, and peeks before reviving', () => {
    const shellback = enemy('shellback');
    shellback.stomp();
    expect(enemyFrame(shellback)).toBe(EnemyFrame.shellbackShell);
    shellback.modeMs = ENEMY_TUNING.shellPeekMs;
    expect(enemyFrame(shellback)).toBe(EnemyFrame.shellbackPeek);
  });

  it('flaps until its wings are clipped', () => {
    const flapjack = enemy('flapjack');
    expect(enemyFrame(flapjack)).toBe(EnemyFrame.flapjackFly0);
    flapjack.stomp();
    expect(enemyFrame(flapjack)).toBe(EnemyFrame.flapjackWalk0);
    flapjack.stomp();
    expect(enemyFrame(flapjack)).toBe(EnemyFrame.flapjackSquashed);
  });

  it('snaps the Snapvine open and shut', () => {
    const snapvine = enemy('snapvine');
    expect(enemyFrame(snapvine)).toBe(EnemyFrame.snapvineOpen);
    snapvine.animMs = ACTOR_ANIMATION.plantBiteMs;
    expect(enemyFrame(snapvine)).toBe(EnemyFrame.snapvineClosed);
  });

  it('flips only the left-facing Shellback art', () => {
    const shellback = enemy('shellback');
    expect(enemyFacesRight(shellback)).toBe(false);
    shellback.turnToward(1);
    expect(enemyFacesRight(shellback)).toBe(true);
    const thornbug = enemy('thornbug');
    thornbug.turnToward(1);
    expect(enemyFacesRight(thornbug)).toBe(false);
  });
});

describe('powerUpFrame and parcelFrame', () => {
  it('picks the item art and its glint', () => {
    const item = new PowerUp(POWER_UP_TUNING);
    item.release('spark-stamp', 1, 1, 16);
    expect(powerUpFrame(item)).toBe(PowerUpFrame.sparkStamp0);
    item.animMs = ACTOR_ANIMATION.glintFrameMs;
    expect(powerUpFrame(item)).toBe(PowerUpFrame.sparkStamp1);
    item.release('green-stamp', 1, 1, 16);
    expect(powerUpFrame(item)).toBe(PowerUpFrame.greenStamp);
  });

  it('spins parcels the way they fly', () => {
    const parcel = new Parcel(PARCEL_TUNING);
    parcel.launch(0, 0, 1);
    parcel.animMs = ACTOR_ANIMATION.parcelSpinFrameMs;
    expect(parcelFrame(parcel)).toBe(PARCEL_SPIN_FRAMES[1]);
    parcel.launch(0, 0, -1);
    parcel.animMs = ACTOR_ANIMATION.parcelSpinFrameMs;
    expect(parcelFrame(parcel)).toBe(PARCEL_SPIN_FRAMES[3]);
  });
});

describe('scoreLabelFor', () => {
  it('maps awards to pop-up labels', () => {
    expect(scoreLabelFor(800)).toBe('800');
    expect(scoreLabelFor(ONE_UP)).toBe('1up');
    expect(scoreLabelFor(123)).toBeNull();
  });
});
