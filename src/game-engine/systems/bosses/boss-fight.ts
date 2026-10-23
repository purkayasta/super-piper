import {
  BOSS_FIGHT,
  ROOK_KING,
  ROOK_STONE,
  type BossFightRules,
  type RookKingTuning,
  type RookStoneTuning,
} from '../../configuration/boss.config';
import { boxBottom, boxCenterX, boxesOverlap } from '../../entities/actors/actor-body';
import { RookKing, type RookKingEvents, type RookWorld } from '../../entities/bosses/rook-king';
import { RookStone } from '../../entities/bosses/rook-stone';
import type { Parcel } from '../../entities/projectiles/parcel';
import type { CompiledBoss } from '../../world/level-format';
import type { PipProbe } from '../actors/stage-actors';

export type BossPhase = 'waiting' | 'fighting' | 'falling' | 'won';

export interface BossFightEvents {
  fightStarted(): void;
  bossLanded(): void;
  stoneThrown(): void;
  stoneBurst(x: number, y: number): void;
  bossHit(): void;
  bossDefeated(): void;
  gateOpened(): void;
  bouncePip(speed: number): void;
  hurtPip(): void;
  parcelBurst(x: number, y: number): void;
}

export interface BossFightConfig {
  readonly king: RookKingTuning;
  readonly stone: RookStoneTuning;
  readonly rules: BossFightRules;
}

export const DEFAULT_BOSS_FIGHT_CONFIG: BossFightConfig = {
  king: ROOK_KING,
  stone: ROOK_STONE,
  rules: BOSS_FIGHT,
};

export class BossFight {
  readonly king: RookKing;
  readonly stones: RookStone[];
  private currentPhase: BossPhase = 'waiting';
  private stomps = 0;
  private parcelHitCount = 0;
  private pipX = 0;

  private readonly kingEvents: RookKingEvents = {
    landed: () => this.events.bossLanded(),
    throwStone: () => this.throwStone(),
  };

  constructor(
    private readonly arena: CompiledBoss,
    private readonly world: RookWorld,
    private readonly events: BossFightEvents,
    private readonly config: BossFightConfig = DEFAULT_BOSS_FIGHT_CONFIG,
  ) {
    this.king = new RookKing(config.king);
    this.stones = Array.from({ length: config.stone.slots }, () => new RookStone(config.stone));
    this.king.place(arena.centerX, arena.groundY, arena.arenaLeftPx, arena.arenaRightPx);
  }

  get phase(): BossPhase {
    return this.currentPhase;
  }

  get stompHits(): number {
    return this.stomps;
  }

  get parcelHits(): number {
    return this.parcelHitCount;
  }

  get defeated(): boolean {
    return this.currentPhase === 'falling' || this.currentPhase === 'won';
  }

  get cameraLimitPx(): number {
    return this.currentPhase === 'won' ? Infinity : this.arena.arenaRightPx;
  }

  get gateColumn(): number {
    return this.arena.gateColumn;
  }

  get gateRows(): readonly number[] {
    return this.arena.gateRows;
  }

  get activeCount(): number {
    let count = this.king.mode === 'gone' ? 0 : 1;
    for (let i = 0; i < this.stones.length; i++) if (this.stones[i].active) count++;
    return count;
  }

  watchView(viewLeft: number): void {
    if (this.currentPhase !== 'waiting' || viewLeft < this.arena.arenaLeftPx) return;
    this.currentPhase = 'fighting';
    this.king.wake();
    this.events.fightStarted();
  }

  step(dt: number, pip: PipProbe, parcels: readonly Parcel[]): void {
    this.pipX = boxCenterX(pip.box);
    this.king.step(dt, this.world, this.pipX, this.kingEvents);
    this.stepStones(dt);
    if (this.currentPhase === 'fighting') {
      this.resolveParcels(parcels);
      if (pip.interactive) this.resolvePip(pip);
    }
    if (this.currentPhase === 'falling' && this.king.mode === 'gone') {
      this.currentPhase = 'won';
      this.events.gateOpened();
    }
  }

  private throwStone(): void {
    const stone = firstIdle(this.stones);
    if (stone === null) return;
    const king = this.king;
    const tuning = this.config.king;
    const handX = king.centerX + king.facing * tuning.handReachPx;
    stone.launch(handX, king.body.y + tuning.handHeightPx, this.pipX);
    this.events.stoneThrown();
  }

  private stepStones(dt: number): void {
    const stones = this.stones;
    for (let i = 0; i < stones.length; i++) {
      const stone = stones[i];
      if (!stone.active) continue;
      const outcome = stone.step(dt, this.world);
      if (outcome === 'burst') this.burstStone(stone);
      else if (outcome === 'gone') stone.free();
    }
  }

  private burstStone(stone: RookStone): void {
    stone.free();
    const body = stone.body;
    this.events.stoneBurst(boxCenterX(body), body.y + body.height / 2);
  }

  private resolveParcels(parcels: readonly Parcel[]): void {
    const king = this.king;
    if (!king.present) return;
    for (let i = 0; i < parcels.length; i++) {
      const parcel = parcels[i];
      if (!parcel.active || !boxesOverlap(parcel.body, king.body)) continue;
      const body = parcel.body;
      parcel.free();
      this.events.parcelBurst(boxCenterX(body), body.y + body.height / 2);
      const result = king.damage(this.config.king.parcelDamage, boxCenterX(body));
      if (result === 'ignored') continue;
      this.parcelHitCount++;
      this.reportHit(result === 'defeated');
    }
  }

  private resolvePip(pip: PipProbe): void {
    const king = this.king;
    const box = pip.box;
    if (king.present && boxesOverlap(box, king.body)) {
      const stomp =
        pip.vy > 0 && boxBottom(box) - king.body.y <= this.config.rules.stompTolerancePx;
      if (stomp) {
        this.events.bouncePip(this.config.rules.stompBounceSpeed);
        const result = king.damage(this.config.king.stompDamage, boxCenterX(box));
        if (result !== 'ignored') {
          this.stomps++;
          this.reportHit(result === 'defeated');
        }
      } else if (king.harmful && pip.vulnerable && !pip.starPower) {
        this.events.hurtPip();
      }
    }
    const stones = this.stones;
    for (let i = 0; i < stones.length; i++) {
      const stone = stones[i];
      if (!stone.active || !boxesOverlap(box, stone.body)) continue;
      if (pip.starPower) {
        this.burstStone(stone);
      } else if (pip.vulnerable) {
        this.burstStone(stone);
        this.events.hurtPip();
      }
    }
  }

  private reportHit(defeated: boolean): void {
    this.events.bossHit();
    if (!defeated) return;
    this.currentPhase = 'falling';
    for (let i = 0; i < this.stones.length; i++) {
      if (this.stones[i].active) this.burstStone(this.stones[i]);
    }
    this.events.bossDefeated();
  }
}

function firstIdle(stones: readonly RookStone[]): RookStone | null {
  for (let i = 0; i < stones.length; i++) if (!stones[i].active) return stones[i];
  return null;
}
