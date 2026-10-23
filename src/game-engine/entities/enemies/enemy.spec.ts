import { describe, expect, it } from 'vitest';
import { ENEMY_TUNING } from '../../configuration/actors.config';
import { Enemy, type EnemyWorld } from './enemy';

const TILE = 16;
const DT = 1 / 60;

function worldFrom(rows: readonly string[]): EnemyWorld {
  return {
    isSolid: (column, row) => rows[row]?.[column] === '#',
    tileSize: TILE,
    levelHeightPx: rows.length * TILE,
  };
}

const FLOOR = worldFrom(['#........#', '#........#', '#........#', '##########']);

function spawned(kind: Enemy['kind'], column = 5, row = 2, world = FLOOR): Enemy {
  const enemy = new Enemy(ENEMY_TUNING);
  enemy.spawn(kind, column, row, TILE);
  enemy.step(DT, world, 0);
  return enemy;
}

function run(enemy: Enemy, seconds: number, world = FLOOR, pipCenterX = 0): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) enemy.step(DT, world, pipCenterX);
}

describe('Enemy walkers', () => {
  it('stand on the floor and walk left first', () => {
    const thornbug = spawned('thornbug');
    const startX = thornbug.body.x;
    run(thornbug, 0.5);
    expect(thornbug.body.y + thornbug.body.height).toBe(48);
    expect(thornbug.body.x).toBeCloseTo(startX - ENEMY_TUNING.walkSpeed * 0.5, 4);
  });

  it('turn around at walls', () => {
    const thornbug = spawned('thornbug', 2);
    run(thornbug, 2);
    expect(thornbug.facing).toBe(1);
    expect(thornbug.body.x).toBeGreaterThan(TILE);
  });

  it('fall out of the level and free themselves', () => {
    const pit = worldFrom(['..........', '..........', '..........', '..........']);
    const thornbug = spawned('thornbug', 5, 2, pit);
    run(thornbug, 2, pit);
    expect(thornbug.active).toBe(false);
  });

  it('turn toward a direction only while walking or flying', () => {
    const thornbug = spawned('thornbug');
    thornbug.turnToward(1);
    expect(thornbug.facing).toBe(1);
    thornbug.stomp();
    thornbug.turnToward(-1);
    expect(thornbug.facing).toBe(1);
  });
});

describe('Thornbug stomp', () => {
  it('squashes, then frees after the squash time', () => {
    const thornbug = spawned('thornbug');
    expect(thornbug.stomp()).toBe('squashed');
    expect(thornbug.alive).toBe(false);
    run(thornbug, ENEMY_TUNING.squashedMs / 1000 + 0.05);
    expect(thornbug.active).toBe(false);
  });
});

describe('Shellback', () => {
  it('becomes a resting shell that ignores Pip briefly, then revives toward Pip', () => {
    const shellback = spawned('shellback');
    expect(shellback.stomp()).toBe('shelled');
    expect(shellback.mode).toBe('shell');
    expect(shellback.pipGraceMs).toBeGreaterThan(0);
    run(shellback, ENEMY_TUNING.shellReviveMs / 1000 + 0.05, FLOOR, 1000);
    expect(shellback.mode).toBe('walk');
    expect(shellback.facing).toBe(1);
  });

  it('slides fast when kicked, bounces off walls, and stops when stomped', () => {
    const shellback = spawned('shellback');
    shellback.stomp();
    shellback.kick(1, 3);
    expect(shellback.chainIndex).toBe(3);
    run(shellback, 0.5);
    expect(shellback.facing).toBe(-1);
    expect(shellback.stomp()).toBe('stopped');
    expect(shellback.mode).toBe('shell');
  });
});

describe('Flapjack', () => {
  it('bobs around its spawn height without gravity', () => {
    const flapjack = spawned('flapjack', 5, 1);
    const anchor = flapjack.body.y;
    let lowest = anchor;
    let highest = anchor;
    for (let i = 0; i < 150; i++) {
      flapjack.step(DT, FLOOR, 0);
      lowest = Math.max(lowest, flapjack.body.y);
      highest = Math.min(highest, flapjack.body.y);
    }
    expect(flapjack.mode).toBe('fly');
    expect(highest).toBeLessThan(anchor - 10);
    expect(lowest).toBeLessThanOrEqual(48 - flapjack.body.height);
  });

  it('loses its wings to a stomp and walks, then squashes', () => {
    const flapjack = spawned('flapjack', 5, 1);
    expect(flapjack.stomp()).toBe('clipped');
    run(flapjack, 1);
    expect(flapjack.mode).toBe('walk');
    expect(flapjack.body.onGround).toBe(true);
    expect(flapjack.stomp()).toBe('squashed');
  });
});

describe('knocked-out enemies', () => {
  it('hop, then fall out of the level ignoring tiles', () => {
    const thornbug = spawned('thornbug');
    thornbug.knockOut(1);
    expect(thornbug.alive).toBe(false);
    expect(thornbug.body.vy).toBeLessThan(0);
    run(thornbug, 2);
    expect(thornbug.active).toBe(false);
  });
});

describe('Snapvine', () => {
  const TUBE_TOP_ROW = 2;

  function plant(): Enemy {
    const snapvine = new Enemy(ENEMY_TUNING);
    snapvine.spawn('snapvine', 4, TUBE_TOP_ROW, TILE);
    return snapvine;
  }

  it('waits hidden, rises out of its tube, then sinks again', () => {
    const snapvine = plant();
    expect(snapvine.centerX).toBe(5 * TILE);
    run(snapvine, ENEMY_TUNING.plantHiddenMs / 1000 + 0.05, FLOOR, 1000);
    expect(snapvine.plantPhase).toBe('rising');
    run(snapvine, ENEMY_TUNING.plantMoveMs / 1000, FLOOR, 1000);
    expect(snapvine.plantPhase).toBe('out');
    expect(snapvine.body.height).toBe(ENEMY_TUNING.plantRisePx);
    expect(snapvine.body.y).toBe(TUBE_TOP_ROW * TILE - ENEMY_TUNING.plantRisePx);
    expect(snapvine.exposed).toBe(true);
    run(snapvine, (ENEMY_TUNING.plantOutMs + ENEMY_TUNING.plantMoveMs) / 1000 + 0.05, FLOOR, 1000);
    expect(snapvine.plantPhase).toBe('hidden');
    expect(snapvine.exposed).toBe(false);
  });

  it('stays hidden while Pip is next to its tube', () => {
    const snapvine = plant();
    run(snapvine, 5, FLOOR, 5 * TILE + 10);
    expect(snapvine.plantPhase).toBe('hidden');
  });
});
