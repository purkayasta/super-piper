import type { MilestoneRules } from '../../configuration/rules.config';
import type { Milestone, PowerForm, RunStats } from '../../core/game-events';
import type { ComboKind } from '../actors/stage-actors';

export const EMPTY_RUN_STATS: RunStats = {
  hits: 0,
  finishPower: 'small',
  bossDefeated: false,
  bossStompHits: 0,
  milestones: [],
};

export class RunStatsTracker {
  private hitCount: number;
  private bossStomps: number;
  private bossDown: boolean;
  private readonly reached: Milestone[];

  constructor(
    private readonly rules: MilestoneRules,
    start: RunStats = EMPTY_RUN_STATS,
  ) {
    this.hitCount = start.hits;
    this.bossStomps = start.bossStompHits;
    this.bossDown = start.bossDefeated;
    this.reached = [...start.milestones];
  }

  get hits(): number {
    return this.hitCount;
  }

  recordHit(): void {
    this.hitCount++;
  }

  recordBoss(stompHits: number, defeated: boolean): void {
    this.bossStomps = stompHits;
    this.bossDown = defeated;
  }

  reach(milestone: Milestone): boolean {
    if (this.reached.includes(milestone)) return false;
    this.reached.push(milestone);
    return true;
  }

  combo(kind: ComboKind, length: number): Milestone | null {
    const milestone: Milestone = kind === 'stomp' ? 'stomp-chain' : 'shell-chain';
    const needed = kind === 'stomp' ? this.rules.stompChain : this.rules.shellChain;
    if (length < needed) return null;
    return this.reach(milestone) ? milestone : null;
  }

  snapshot(finishPower: PowerForm): RunStats {
    return {
      hits: this.hitCount,
      finishPower,
      bossDefeated: this.bossDown,
      bossStompHits: this.bossStomps,
      milestones: [...this.reached],
    };
  }
}
