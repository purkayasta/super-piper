import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Sfx } from '../../../content/audio/sound-ids';
import { stageEntry } from '../../../content/manifests/level-manifest';
import type { MapStage } from '../../../content/manifests/world-manifest';
import type { StageStatus } from '../../core/models/progression.model';
import { AudioService } from '../../core/services/audio.service';
import { ProgressionService } from '../../core/services/progression.service';
import { SCORE_DIGITS, TIME_DIGITS, padCounter } from '../../shared/ui/counter-format';
import { MenuNavDirective } from '../../shared/ui/menu-nav.directive';
import { StarRowComponent } from '../../shared/components/star-row/star-row.component';

interface MapNode {
  readonly stage: MapStage;
  readonly status: StageStatus;
  readonly targetTime: number | null;
}

@Component({
  imports: [RouterLink, MenuNavDirective, StarRowComponent],
  selector: 'app-world-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './world-map.component.css',
  templateUrl: './world-map.component.html',
})
export class WorldMapComponent {
  private readonly audio = inject(AudioService);
  private readonly router = inject(Router);
  private readonly progression = inject(ProgressionService);

  protected readonly world = this.progression.world;
  protected readonly rank = this.progression.rank;
  protected readonly coins = this.progression.coins;
  protected readonly nodes = computed<MapNode[]>(() =>
    this.progression.statuses().map((status, index) => ({
      stage: this.world.stages[index],
      status,
      targetTime: stageEntry(status.stageId)?.level?.targetTime ?? null,
    })),
  );
  protected readonly selectedIndex = signal(this.furthestOpenIndex());
  protected readonly selected = computed(() => this.nodes()[this.selectedIndex()]);
  protected readonly pathPoints = this.world.stages
    .map((stage) => `${stage.mapX},${stage.mapY}`)
    .join(' ');
  protected readonly rankPercent = computed(() => Math.round(this.rank().fraction * 100));

  constructor() {
    this.audio.playMenuMusic();
  }

  protected select(index: number): void {
    this.selectedIndex.set(index);
  }

  protected activate(index: number): void {
    if (this.selectedIndex() !== index) {
      this.select(index);
      return;
    }
    this.play();
  }

  protected play(): void {
    const node = this.selected();
    if (node.status.availability !== 'open') return;
    this.audio.playSfx(Sfx.menuSelect);
    void this.router.navigate(['/play', node.stage.stageId]);
  }

  protected back(): void {
    void this.router.navigateByUrl('/');
  }

  protected score(value: number): string {
    return padCounter(value, SCORE_DIGITS);
  }

  protected time(value: number | null): string {
    return value === null ? '---' : padCounter(value, TIME_DIGITS);
  }

  private furthestOpenIndex(): number {
    const statuses = this.progression.statuses();
    let index = 0;
    statuses.forEach((status, candidate) => {
      if (status.availability === 'open') index = candidate;
    });
    return index;
  }
}
