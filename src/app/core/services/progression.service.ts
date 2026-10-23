import { Injectable, computed, inject } from '@angular/core';
import { stageEntry } from '../../../content/manifests/level-manifest';
import { WORLD_1 } from '../../../content/manifests/world-manifest';
import type { StageId, StageResult } from '../../../game-engine/core/game-events';
import type { ClearReport, StageStatus } from '../models/progression.model';
import {
  STARS_PER_STAGE,
  applyClear,
  rankForXp,
  stageStatuses,
  totalStars,
} from '../utilities/progression-rules';
import { SaveService } from './save.service';

export function isBuiltStage(stageId: StageId): boolean {
  return stageEntry(stageId)?.level !== undefined;
}

@Injectable({ providedIn: 'root' })
export class ProgressionService {
  private readonly save = inject(SaveService);

  readonly world = WORLD_1;
  readonly progression = computed(() => this.save.data().progression);
  readonly coins = computed(() => this.progression().coins);
  readonly rank = computed(() => rankForXp(this.progression().xp));
  readonly stars = computed(() => totalStars(this.progression()));
  readonly maxStars = WORLD_1.stages.length * STARS_PER_STAGE;
  readonly statuses = computed(() => stageStatuses(WORLD_1, this.progression(), isBuiltStage));

  status(stageId: StageId): StageStatus | null {
    return this.statuses().find((status) => status.stageId === stageId) ?? null;
  }

  canPlay(stageId: StageId): boolean {
    return this.status(stageId)?.availability === 'open';
  }

  recordClear(result: StageResult): ClearReport | null {
    const level = stageEntry(result.stageId)?.level;
    if (level === undefined) return null;
    let report: ClearReport | null = null;
    this.save.updateProgression((progression) => {
      const outcome = applyClear(progression, result, level.targetTime);
      report = outcome.report;
      return outcome.progression;
    });
    return report;
  }
}
