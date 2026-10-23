import { describe, expect, it } from 'vitest';
import { PARCEL_TUNING } from '../../configuration/actors.config';
import { ROOK_KING } from '../../configuration/boss.config';
import type { RookWorld } from '../../entities/bosses/rook-king';
import { Parcel } from '../../entities/projectiles/parcel';
import type { CompiledBoss } from '../../world/level-format';
import { createPipProbe, type PipProbe } from '../actors/stage-actors';
import { BossFight, type BossFightEvents } from './boss-fight';

const TILE = 16;
const DT = 1 / 120;
const ARENA: CompiledBoss = {
  centerX: 400,
  groundY: 208,
  gateColumn: 30,
  gateRows: [10, 11, 12],
  arenaLeftPx: 64,
  arenaRightPx: 496,
};

const WORLD: RookWorld = {
  isSolid: (column, row) => row >= 13 || column === ARENA.gateColumn,
  tileSize: TILE,
  levelHeightPx: 240,
};

interface Log extends BossFightEvents {
  readonly entries: string[];
}

function log(): Log {
  const entries: string[] = [];
  const record =
    (name: string) =>
    (): void => {
      entries.push(name);
    };
  return {
    entries,
    fightStarted: record('started'),
    bossLanded: record('landed'),
    stoneThrown: record('thrown'),
    stoneBurst: record('stone-burst'),
    bossHit: record('hit'),
    bossDefeated: record('defeated'),
    gateOpened: record('gate'),
    bouncePip: record('bounce'),
    hurtPip: record('hurt'),
    parcelBurst: record('parcel-burst'),
  };
}

function pipAt(x: number, bottom: number, vy = 0): PipProbe {
  const probe = createPipProbe();
  probe.box.x = x;
  probe.box.y = bottom - 14;
  probe.box.width = 12;
  probe.box.height = 14;
  probe.vy = vy;
  return probe;
}

function startedFight(events: Log): BossFight {
  const fight = new BossFight(ARENA, WORLD, events);
  fight.watchView(ARENA.arenaLeftPx);
  const far = pipAt(80, 208);
  for (let i = 0; i < (ROOK_KING.introMs / 1000) / DT + 2; i++) fight.step(DT, far, []);
  return fight;
}

function above(fight: BossFight): PipProbe {
  const body = fight.king.body;
  return pipAt(body.x + 6, body.y + 4, 120);
}

describe('BossFight', () => {
  it('waits until the arena fills the view, holding the camera at the gate', () => {
    const events = log();
    const fight = new BossFight(ARENA, WORLD, events);
    expect(fight.cameraLimitPx).toBe(ARENA.arenaRightPx);
    fight.watchView(ARENA.arenaLeftPx - 1);
    expect(fight.phase).toBe('waiting');
    fight.watchView(ARENA.arenaLeftPx);
    expect(fight.phase).toBe('fighting');
    expect(fight.king.mode).toBe('intro');
    expect(events.entries).toEqual(['started']);
  });

  it('takes a stomp from above and bounces Pip', () => {
    const events = log();
    const fight = startedFight(events);
    fight.step(DT, above(fight), []);
    expect(events.entries).toEqual(['started', 'bounce', 'hit']);
    expect(fight.king.health).toBe(ROOK_KING.health - ROOK_KING.stompDamage);
    expect(fight.stompHits).toBe(1);
  });

  it('hurts Pip on a touch from the side, but not while he flinches', () => {
    const events = log();
    const fight = startedFight(events);
    const body = fight.king.body;
    fight.step(DT, pipAt(body.x - 6, body.y + body.height), []);
    expect(events.entries.at(-1)).toBe('hurt');
    fight.step(DT, above(fight), []);
    events.entries.length = 0;
    fight.step(DT, pipAt(fight.king.body.x + 2, fight.king.body.y + 20), []);
    expect(events.entries).not.toContain('hurt');
  });

  it('lets the Rush Star touch him harmlessly both ways', () => {
    const events = log();
    const fight = startedFight(events);
    const body = fight.king.body;
    const starPip = pipAt(body.x - 6, body.y + body.height);
    starPip.starPower = true;
    starPip.vulnerable = false;
    fight.step(DT, starPip, []);
    expect(events.entries).toEqual(['started']);
    expect(fight.king.health).toBe(ROOK_KING.health);
  });

  it('takes a point per parcel and bursts it', () => {
    const events = log();
    const fight = startedFight(events);
    const parcel = new Parcel(PARCEL_TUNING);
    const body = fight.king.body;
    parcel.launch(body.x + 12, body.y + 12, 1);
    fight.step(DT, pipAt(80, 208), [parcel]);
    expect(parcel.active).toBe(false);
    expect(events.entries.slice(1)).toEqual(['parcel-burst', 'hit']);
    expect(fight.king.health).toBe(ROOK_KING.health - ROOK_KING.parcelDamage);
    expect(fight.parcelHits).toBe(1);
  });

  it('falls, then opens the gate and frees the camera', () => {
    const events = log();
    const fight = startedFight(events);
    fight.king.health = ROOK_KING.stompDamage;
    fight.step(DT, above(fight), []);
    expect(fight.defeated).toBe(true);
    expect(events.entries).toContain('defeated');
    expect(fight.cameraLimitPx).toBe(ARENA.arenaRightPx);
    for (let i = 0; i < 5 / DT && fight.phase !== 'won'; i++) fight.step(DT, pipAt(80, 208), []);
    expect(fight.phase).toBe('won');
    expect(events.entries.at(-1)).toBe('gate');
    expect(fight.cameraLimitPx).toBe(Infinity);
  });

  it('throws stones that land near Pip and hurt him', () => {
    const events = log();
    const fight = startedFight(events);
    const pip = pipAt(200, 208);
    let hurt = false;
    for (let i = 0; i < 8 / DT && !hurt; i++) {
      fight.step(DT, pip, []);
      hurt = events.entries.includes('hurt');
    }
    expect(events.entries).toContain('thrown');
    expect(hurt).toBe(true);
  });
});
