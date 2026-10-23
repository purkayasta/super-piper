import { describe, expect, it } from 'vitest';
import { ENEMY_TUNING, POWER_UP_TUNING } from '../../configuration/actors.config';
import { SCORING } from '../../configuration/scoring.config';
import type { PowerUpKind } from '../../entities/power-ups/power-up';
import type { EnemySpawn } from '../../world/level-format';
import { ONE_UP } from '../scoring/score-chain';
import {
  DEFAULT_STAGE_ACTORS_CONFIG,
  StageActors,
  createPipProbe,
  type ActorEvents,
  type PipProbe,
} from './stage-actors';

const TILE = 16;
const DT = 1 / 60;
const COLUMNS = 60;
const ROWS = [
  '.'.repeat(COLUMNS),
  '.'.repeat(COLUMNS),
  '.'.repeat(8) + '#' + '.'.repeat(COLUMNS - 9),
  '.'.repeat(COLUMNS),
  '#'.repeat(COLUMNS),
];
const WORLD = {
  isSolid: (column: number, row: number) => ROWS[row]?.[column] === '#',
  tileSize: TILE,
  levelHeightPx: ROWS.length * TILE,
};
const CONFIG = { ...DEFAULT_STAGE_ACTORS_CONFIG, viewWidth: 160 };
const GROUND_Y = 64;

class RecordedEvents implements ActorEvents {
  readonly awards: number[] = [];
  readonly collected: PowerUpKind[] = [];
  bounces = 0;
  hurts = 0;
  bursts = 0;
  strikes = 0;
  readonly combos: string[] = [];

  award(points: number): void {
    this.awards.push(points);
  }
  bouncePip(): void {
    this.bounces++;
  }
  hurtPip(): void {
    this.hurts++;
  }
  collectPowerUp(kind: PowerUpKind): void {
    this.collected.push(kind);
  }
  parcelBurst(): void {
    this.bursts++;
  }
  strike(): void {
    this.strikes++;
  }
  combo(kind: string, length: number): void {
    this.combos.push(`${kind}-${length}`);
  }
}

function setup(spawns: EnemySpawn[]) {
  const events = new RecordedEvents();
  const actors = new StageActors(spawns, WORLD, events, CONFIG);
  const pip = createPipProbe();
  placePip(pip, 1000, GROUND_Y);
  actors.start(0);
  actors.step(DT, pip, 0);
  return { actors, events, pip };
}

function placePip(pip: PipProbe, centerX: number, bottom: number, vy = 0): void {
  pip.box.width = 12;
  pip.box.height = 14;
  pip.box.x = centerX - 6;
  pip.box.y = bottom - 14;
  pip.vy = vy;
  pip.onGround = vy === 0 && bottom === GROUND_Y;
}

function enemyTop(actors: StageActors, slot = 0): number {
  return actors.enemies[slot].body.y;
}

describe('StageActors spawning', () => {
  it('wakes enemies only when the view reaches their column, and skips those behind it', () => {
    const { actors } = setup([
      { kind: 'thornbug', column: 5, row: 3 },
      { kind: 'thornbug', column: 20, row: 3 },
    ]);
    expect(actors.enemies.filter((enemy) => enemy.active)).toHaveLength(1);
    const late = new StageActors(
      [
        { kind: 'thornbug', column: 5, row: 3 },
        { kind: 'thornbug', column: 20, row: 3 },
      ],
      WORLD,
      new RecordedEvents(),
      CONFIG,
    );
    late.start(12 * TILE);
    late.step(DT, createPipProbe(), 12 * TILE);
    expect(late.enemies.filter((enemy) => enemy.active).map((enemy) => enemy.centerX)).toEqual([
      20.5 * TILE - ENEMY_TUNING.walkSpeed * DT,
    ]);
  });

  it('waits for a free slot when the pool is full', () => {
    const spawns = Array.from({ length: 3 }, (_, i) => ({
      kind: 'thornbug' as const,
      column: 2 + i * 2,
      row: 3,
    }));
    const events = new RecordedEvents();
    const actors = new StageActors(spawns, WORLD, events, { ...CONFIG, enemySlots: 2 });
    actors.step(DT, createPipProbe(), 0);
    expect(actors.activeCount).toBe(2);
    actors.enemies[0].free();
    actors.step(DT, createPipProbe(), 0);
    expect(actors.activeCount).toBe(2);
  });

  it('frees enemies far behind the view', () => {
    const { actors, pip } = setup([{ kind: 'thornbug', column: 2, row: 3 }]);
    actors.step(DT, pip, 10 * TILE);
    expect(actors.activeCount).toBe(0);
  });
});

describe('StageActors and Pip', () => {
  it('stomps when falling onto an enemy, bouncing Pip and scoring', () => {
    const { actors, events, pip } = setup([{ kind: 'thornbug', column: 5, row: 3 }]);
    placePip(pip, actors.enemies[0].centerX, enemyTop(actors) + 3, 120);
    actors.step(DT, pip, 0);
    expect(events.bounces).toBe(1);
    expect(events.strikes).toBe(0);
    expect(events.awards).toEqual([100]);
    expect(events.hurts).toBe(0);
    expect(events.combos).toEqual(['stomp-1']);
    expect(actors.enemies[0].mode).toBe('squashed');
  });

  it('climbs the stomp ladder until Pip lands', () => {
    const { actors, events, pip } = setup([
      { kind: 'thornbug', column: 5, row: 3 },
      { kind: 'thornbug', column: 7, row: 3 },
      { kind: 'thornbug', column: 9, row: 3 },
    ]);
    for (const slot of [0, 1]) {
      placePip(pip, actors.enemies[slot].centerX, enemyTop(actors, slot) + 3, 120);
      actors.step(DT, pip, 0);
    }
    placePip(pip, 200, GROUND_Y);
    actors.step(DT, pip, 0);
    placePip(pip, actors.enemies[2].centerX, enemyTop(actors, 2) + 3, 120);
    actors.step(DT, pip, 0);
    expect(events.awards).toEqual([100, 200, 100]);
  });

  it('hurts Pip on a side touch, once per step, and not while invulnerable', () => {
    const { actors, events, pip } = setup([
      { kind: 'thornbug', column: 5, row: 3 },
      { kind: 'thornbug', column: 5, row: 3 },
    ]);
    placePip(pip, actors.enemies[0].centerX - 8, GROUND_Y);
    actors.step(DT, pip, 0);
    expect(events.hurts).toBe(1);
    pip.vulnerable = false;
    actors.step(DT, pip, 0);
    expect(events.hurts).toBe(1);
  });

  it('knocks enemies out with the Rush Star', () => {
    const { actors, events, pip } = setup([{ kind: 'thornbug', column: 5, row: 3 }]);
    pip.starPower = true;
    placePip(pip, actors.enemies[0].centerX - 8, GROUND_Y);
    actors.step(DT, pip, 0);
    expect(actors.enemies[0].mode).toBe('knocked');
    expect(events.awards).toEqual([100]);
    expect(events.hurts).toBe(0);
  });

  it('ignores Pip entirely while he is not interactive', () => {
    const { actors, events, pip } = setup([{ kind: 'thornbug', column: 5, row: 3 }]);
    pip.interactive = false;
    placePip(pip, actors.enemies[0].centerX, GROUND_Y);
    actors.step(DT, pip, 0);
    expect(events.hurts).toBe(0);
  });
});

describe('StageActors shells', () => {
  function shellSetup() {
    const context = setup([{ kind: 'shellback', column: 5, row: 3 }]);
    const { actors, pip } = context;
    placePip(pip, actors.enemies[0].centerX, enemyTop(actors) + 3, 120);
    actors.step(DT, pip, 0);
    return context;
  }

  it('a fresh shell ignores Pip briefly', () => {
    const { actors, events, pip } = shellSetup();
    expect(actors.enemies[0].mode).toBe('shell');
    actors.step(DT, pip, 0);
    expect(actors.enemies[0].mode).toBe('shell');
    expect(events.awards).toEqual([100]);
  });

  it('kicks a resting shell away from Pip', () => {
    const { actors, events, pip } = shellSetup();
    placePip(pip, 200, GROUND_Y);
    for (let i = 0; i < 20; i++) actors.step(DT, pip, 0);
    const shell = actors.enemies[0];
    placePip(pip, shell.centerX - 10, GROUND_Y);
    actors.step(DT, pip, 0);
    expect(shell.mode).toBe('shell-moving');
    expect(shell.facing).toBe(1);
    expect(events.awards).toEqual([100, SCORING.kickPoints]);
    expect(events.hurts).toBe(0);
    expect(events.strikes).toBe(1);
  });

  it('knocks out enemies in its path with its own chain', () => {
    const { actors, events, pip } = setup([
      { kind: 'shellback', column: 2, row: 3 },
      { kind: 'thornbug', column: 6, row: 3 },
      { kind: 'thornbug', column: 8, row: 3 },
    ]);
    const shell = actors.enemies[0];
    shell.stomp();
    shell.kick(1, CONFIG.shellChainStart);
    placePip(pip, 900, GROUND_Y);
    for (let i = 0; i < 60; i++) actors.step(DT, pip, 0);
    expect(actors.enemies[1].mode === 'knocked' || !actors.enemies[1].active).toBe(true);
    expect(events.awards).toEqual([500, 800]);
    expect(events.strikes).toBe(2);
    expect(events.combos).toEqual(['shell-1', 'shell-2']);
  });
});

describe('StageActors enemy contacts', () => {
  it('turns walkers away from each other', () => {
    const { actors, pip } = setup([
      { kind: 'thornbug', column: 5, row: 3 },
      { kind: 'thornbug', column: 6, row: 3 },
    ]);
    actors.enemies[0].turnToward(1);
    for (let i = 0; i < 30; i++) actors.step(DT, pip, 0);
    expect(actors.enemies[0].facing).toBe(-1);
    expect(actors.enemies[1].facing).toBe(1);
  });
});

describe('StageActors parcels', () => {
  it('allows two parcels in flight', () => {
    const { actors } = setup([]);
    expect(actors.throwParcel(40, 50, 1)).toBe(true);
    expect(actors.throwParcel(40, 50, 1)).toBe(true);
    expect(actors.throwParcel(40, 50, 1)).toBe(false);
    expect(actors.activeParcels).toBe(2);
  });

  it('knocks out an enemy and bursts on hit', () => {
    const { actors, events, pip } = setup([{ kind: 'shellback', column: 5, row: 3 }]);
    actors.throwParcel(actors.enemies[0].centerX - 12, GROUND_Y - 6, 1);
    for (let i = 0; i < 10; i++) actors.step(DT, pip, 0);
    expect(actors.enemies[0].mode).toBe('knocked');
    expect(events.awards).toEqual([200]);
    expect(events.bursts).toBe(1);
    expect(events.strikes).toBe(1);
    expect(actors.activeParcels).toBe(0);
  });

  it('frees parcels that leave the view', () => {
    const { actors, pip } = setup([]);
    actors.throwParcel(150, 50, 1);
    for (let i = 0; i < 30; i++) actors.step(DT, pip, 0);
    expect(actors.activeParcels).toBe(0);
  });
});

describe('StageActors blocks and items', () => {
  it('knocks out an enemy standing on a bumped block', () => {
    const { actors, events, pip } = setup([{ kind: 'thornbug', column: 8, row: 1 }]);
    actors.bumpBlock(8, 2);
    expect(actors.enemies[0].mode).toBe('knocked');
    expect(events.awards).toEqual([100]);
    expect(events.strikes).toBe(1);
    actors.step(DT, pip, 0);
  });

  it('releases a power-up that Pip collects on touch', () => {
    const { actors, events, pip } = setup([]);
    expect(actors.releasePowerUp('parcel-box', 8, 2)).toBe(true);
    for (let i = 0; i < (POWER_UP_TUNING.emergeMs / 1000) * 60 + 2; i++) actors.step(DT, pip, 0);
    const item = actors.powerUps[0];
    expect(item.mode).toBe('moving');
    placePip(pip, item.body.x + 7, item.body.y + 14);
    actors.step(DT, pip, 0);
    expect(events.collected).toEqual(['parcel-box']);
    expect(item.active).toBe(false);
  });

  it('cannot be collected while it is still emerging', () => {
    const { actors, events, pip } = setup([]);
    actors.releasePowerUp('green-stamp', 8, 2);
    actors.step(DT, pip, 0);
    const item = actors.powerUps[0];
    placePip(pip, item.body.x + 7, item.body.y + 20);
    actors.step(DT, pip, 0);
    expect(events.collected).toEqual([]);
    expect(item.active).toBe(true);
  });

  it('hops a moving item resting on a bumped block', () => {
    const { actors, pip } = setup([]);
    actors.releasePowerUp('green-stamp', 8, 2);
    for (let i = 0; i < (POWER_UP_TUNING.emergeMs / 1000) * 60 + 2; i++) actors.step(DT, pip, 0);
    actors.bumpBlock(8, 2);
    expect(actors.powerUps[0].body.vy).toBe(-POWER_UP_TUNING.bumpHopSpeed);
  });
});

describe('ONE_UP awards', () => {
  it('is a sentinel that never collides with real points', () => {
    expect(CONFIG.ladder.includes(ONE_UP)).toBe(false);
  });
});
