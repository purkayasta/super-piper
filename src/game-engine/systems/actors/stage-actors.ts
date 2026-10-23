import {
  ACTOR_POOLS,
  ENEMY_TUNING,
  PARCEL_TUNING,
  POWER_UP_TUNING,
  SPAWN_WINDOW,
  type EnemyTuning,
  type ParcelTuning,
  type PowerUpTuning,
} from '../../configuration/actors.config';
import { LOGICAL_WIDTH } from '../../configuration/performance.config';
import { COMBAT } from '../../configuration/rules.config';
import {
  CHAIN_START,
  ENEMY_POINTS,
  SCORE_LADDER,
  SCORING,
} from '../../configuration/scoring.config';
import {
  boxBottom,
  boxCenterX,
  boxesOverlap,
  type Box,
  type SolidQuery,
} from '../../entities/actors/actor-body';
import { Enemy } from '../../entities/enemies/enemy';
import { SpawnSchedule } from '../../entities/enemies/spawn-schedule';
import { PowerUp, type PowerUpKind } from '../../entities/power-ups/power-up';
import { Parcel } from '../../entities/projectiles/parcel';
import type { EnemyKind, EnemySpawn } from '../../world/level-format';
import { ScoreChain, ladderAward } from '../scoring/score-chain';

export interface ActorWorld {
  readonly isSolid: SolidQuery;
  readonly tileSize: number;
  readonly levelHeightPx: number;
}

export interface PipProbe {
  readonly box: Box;
  vy: number;
  onGround: boolean;
  starPower: boolean;
  vulnerable: boolean;
  interactive: boolean;
}

export interface ActorEvents {
  award(points: number, x: number, y: number): void;
  bouncePip(): void;
  hurtPip(): void;
  collectPowerUp(kind: PowerUpKind, x: number, y: number): void;
  parcelBurst(x: number, y: number): void;
  strike(): void;
}

export interface StageActorsConfig {
  readonly enemy: EnemyTuning;
  readonly powerUp: PowerUpTuning;
  readonly parcel: ParcelTuning;
  readonly enemySlots: number;
  readonly powerUpSlots: number;
  readonly parcelSlots: number;
  readonly spawnAheadColumns: number;
  readonly despawnBehindPx: number;
  readonly viewWidth: number;
  readonly stompTolerancePx: number;
  readonly bumpReachPx: number;
  readonly ladder: readonly number[];
  readonly stompChainStart: number;
  readonly shellChainStart: number;
  readonly starChainStart: number;
  readonly kickPoints: number;
  readonly enemyPoints: Readonly<Record<EnemyKind, number>>;
}

export const DEFAULT_STAGE_ACTORS_CONFIG: StageActorsConfig = {
  enemy: ENEMY_TUNING,
  powerUp: POWER_UP_TUNING,
  parcel: PARCEL_TUNING,
  enemySlots: ACTOR_POOLS.enemies,
  powerUpSlots: ACTOR_POOLS.powerUps,
  parcelSlots: ACTOR_POOLS.parcels,
  spawnAheadColumns: SPAWN_WINDOW.aheadColumns,
  despawnBehindPx: SPAWN_WINDOW.despawnBehindPx,
  viewWidth: LOGICAL_WIDTH,
  stompTolerancePx: COMBAT.stompTolerancePx,
  bumpReachPx: COMBAT.bumpReachPx,
  ladder: SCORE_LADDER,
  stompChainStart: CHAIN_START.stomp,
  shellChainStart: CHAIN_START.shell,
  starChainStart: CHAIN_START.star,
  kickPoints: SCORING.kickPoints,
  enemyPoints: ENEMY_POINTS,
};

export function createPipProbe(): PipProbe {
  return {
    box: { x: 0, y: 0, width: 0, height: 0 },
    vy: 0,
    onGround: false,
    starPower: false,
    vulnerable: true,
    interactive: true,
  };
}

export class StageActors {
  readonly enemies: Enemy[];
  readonly powerUps: PowerUp[];
  readonly parcels: Parcel[];
  private readonly schedule: SpawnSchedule;
  private readonly stompChain: ScoreChain;
  private readonly starChain: ScoreChain;

  constructor(
    spawns: readonly EnemySpawn[],
    private readonly world: ActorWorld,
    private readonly events: ActorEvents,
    private readonly config: StageActorsConfig = DEFAULT_STAGE_ACTORS_CONFIG,
  ) {
    this.enemies = Array.from({ length: config.enemySlots }, () => new Enemy(config.enemy));
    this.powerUps = Array.from({ length: config.powerUpSlots }, () => new PowerUp(config.powerUp));
    this.parcels = Array.from({ length: config.parcelSlots }, () => new Parcel(config.parcel));
    this.schedule = new SpawnSchedule(spawns);
    this.stompChain = new ScoreChain(config.ladder, config.stompChainStart);
    this.starChain = new ScoreChain(config.ladder, config.starChainStart);
  }

  get activeCount(): number {
    return countActive(this.enemies) + countActive(this.powerUps) + this.activeParcels;
  }

  get activeParcels(): number {
    return countActive(this.parcels);
  }

  start(viewLeft: number): void {
    this.schedule.skipBefore(Math.floor(viewLeft / this.world.tileSize));
  }

  step(dt: number, pip: PipProbe, viewLeft: number): void {
    this.spawnDue(viewLeft);
    const pipCenterX = boxCenterX(pip.box);
    const world = this.world;
    const enemies = this.enemies;
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].active) enemies[i].step(dt, world, pipCenterX);
    }
    const items = this.powerUps;
    for (let i = 0; i < items.length; i++) if (items[i].active) items[i].step(dt, world);
    this.stepParcels(dt, viewLeft);
    this.despawnBehind(viewLeft);
    this.resolveEnemyContacts();
    this.resolveParcelHits();
    if (pip.interactive) this.resolvePip(pip);
    if (pip.onGround) this.stompChain.reset();
    if (!pip.starPower) this.starChain.reset();
  }

  releasePowerUp(kind: PowerUpKind, column: number, row: number): boolean {
    const item = firstInactive(this.powerUps);
    if (item === null) return false;
    item.release(kind, column, row, this.world.tileSize);
    return true;
  }

  throwParcel(centerX: number, centerY: number, facing: 1 | -1): boolean {
    const parcel = firstInactive(this.parcels);
    if (parcel === null) return false;
    parcel.launch(centerX, centerY, facing);
    return true;
  }

  bumpBlock(column: number, row: number): void {
    const size = this.world.tileSize;
    const top = row * size;
    const left = column * size;
    const centerX = left + size / 2;
    const reach = this.config.bumpReachPx;
    const enemies = this.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.alive || enemy.mode === 'fly' || enemy.mode === 'plant') continue;
      if (!standsOn(enemy.body, left, size, top, reach)) continue;
      enemy.knockOut(enemy.centerX < centerX ? -1 : 1);
      this.events.strike();
      this.award(this.config.enemyPoints[enemy.kind], enemy);
    }
    const items = this.powerUps;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.mode !== 'moving' || !standsOn(item.body, left, size, top, reach)) continue;
      item.hop(boxCenterX(item.body) < centerX ? -1 : 1);
    }
  }

  private spawnDue(viewLeft: number): void {
    const size = this.world.tileSize;
    const lastAwakeColumn =
      Math.floor((viewLeft + this.config.viewWidth - 1) / size) + this.config.spawnAheadColumns;
    for (let spawn = this.schedule.nextDue(lastAwakeColumn); spawn !== null;) {
      const slot = firstInactive(this.enemies);
      if (slot === null) return;
      slot.spawn(spawn.kind, spawn.column, spawn.row, size);
      this.schedule.consume();
      spawn = this.schedule.nextDue(lastAwakeColumn);
    }
  }

  private stepParcels(dt: number, viewLeft: number): void {
    const viewRight = viewLeft + this.config.viewWidth;
    const parcels = this.parcels;
    for (let i = 0; i < parcels.length; i++) {
      const parcel = parcels[i];
      if (!parcel.active) continue;
      const outcome = parcel.step(dt, this.world);
      const body = parcel.body;
      if (outcome === 'burst') this.burst(parcel);
      else if (outcome === 'gone' || body.x + body.width < viewLeft || body.x > viewRight) {
        parcel.free();
      }
    }
  }

  private despawnBehind(viewLeft: number): void {
    const limit = viewLeft - this.config.despawnBehindPx;
    freeBehind(this.enemies, limit);
    freeBehind(this.powerUps, limit);
  }

  private resolveEnemyContacts(): void {
    const enemies = this.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      for (let j = i + 1; j < enemies.length && a.alive; j++) {
        const b = enemies[j];
        if (!b.alive || !a.exposed || !b.exposed || !boxesOverlap(a.body, b.body)) continue;
        const aSliding = a.mode === 'shell-moving';
        const bSliding = b.mode === 'shell-moving';
        if (aSliding && bSliding) {
          a.knockOut(b.facing);
          b.knockOut(a.facing);
          this.events.strike();
          this.award(this.config.enemyPoints[a.kind], a);
          this.award(this.config.enemyPoints[b.kind], b);
        } else if (aSliding) {
          this.knockWithShell(a, b);
        } else if (bSliding) {
          this.knockWithShell(b, a);
        } else if (a.mode === 'walk' && b.mode === 'walk') {
          const direction = a.centerX < b.centerX ? -1 : 1;
          a.turnToward(direction);
          b.turnToward(direction === 1 ? -1 : 1);
        }
      }
    }
  }

  private knockWithShell(shell: Enemy, victim: Enemy): void {
    victim.knockOut(shell.facing);
    this.events.strike();
    this.award(ladderAward(this.config.ladder, shell.chainIndex++), victim);
  }

  private resolveParcelHits(): void {
    const parcels = this.parcels;
    const enemies = this.enemies;
    for (let i = 0; i < parcels.length; i++) {
      const parcel = parcels[i];
      if (!parcel.active) continue;
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (!enemy.alive || !enemy.exposed || !boxesOverlap(parcel.body, enemy.body)) continue;
        enemy.knockOut(parcel.facing);
        this.events.strike();
        this.award(this.config.enemyPoints[enemy.kind], enemy);
        this.burst(parcel);
        break;
      }
    }
  }

  private resolvePip(pip: PipProbe): void {
    const box = pip.box;
    const pipCenterX = boxCenterX(box);
    let hurt = false;
    const enemies = this.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.alive || !enemy.exposed || enemy.pipGraceMs > 0) continue;
      if (!boxesOverlap(box, enemy.body)) continue;
      const away: 1 | -1 = pipCenterX < enemy.centerX ? 1 : -1;
      if (pip.starPower) {
        enemy.knockOut(away);
        this.events.strike();
        this.award(this.starChain.next(), enemy);
      } else if (enemy.mode === 'shell') {
        enemy.kick(away, this.config.shellChainStart);
        this.events.strike();
        this.award(this.config.kickPoints, enemy);
      } else if (enemy.mode !== 'plant' && this.isStomp(pip, enemy)) {
        enemy.stomp();
        this.events.bouncePip();
        this.award(this.stompChain.next(), enemy);
      } else if (pip.vulnerable && !hurt) {
        hurt = true;
        this.events.hurtPip();
      }
    }
    const items = this.powerUps;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.mode !== 'moving' || !boxesOverlap(box, item.body)) continue;
      item.free();
      this.events.collectPowerUp(item.kind, boxCenterX(item.body), item.body.y);
    }
  }

  private isStomp(pip: PipProbe, enemy: Enemy): boolean {
    return pip.vy > 0 && boxBottom(pip.box) - enemy.body.y <= this.config.stompTolerancePx;
  }

  private burst(parcel: Parcel): void {
    const body = parcel.body;
    parcel.free();
    this.events.parcelBurst(boxCenterX(body), body.y + body.height / 2);
  }

  private award(points: number, enemy: Enemy): void {
    this.events.award(points, enemy.centerX, enemy.body.y);
  }
}

interface PooledActor {
  readonly active: boolean;
  readonly body: Box;
  free(): void;
}

function firstInactive<T extends { readonly active: boolean }>(pool: readonly T[]): T | null {
  for (let i = 0; i < pool.length; i++) if (!pool[i].active) return pool[i];
  return null;
}

function countActive(pool: readonly { readonly active: boolean }[]): number {
  let count = 0;
  for (let i = 0; i < pool.length; i++) if (pool[i].active) count++;
  return count;
}

function freeBehind(pool: readonly PooledActor[], limit: number): void {
  for (let i = 0; i < pool.length; i++) {
    const actor = pool[i];
    if (actor.active && actor.body.x + actor.body.width < limit) actor.free();
  }
}

function standsOn(body: Box, left: number, size: number, top: number, reach: number): boolean {
  return (
    Math.abs(boxBottom(body) - top) <= reach && body.x < left + size && body.x + body.width > left
  );
}
