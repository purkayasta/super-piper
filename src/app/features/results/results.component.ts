import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ClearReport } from '../../core/models/progression.model';
import { StarRowComponent } from '../../shared/components/star-row/star-row.component';
import { MenuNavDirective } from '../../shared/ui/menu-nav.directive';
import { SCORE_DIGITS, TIME_DIGITS, padCounter } from '../../shared/ui/counter-format';

const PERCENT = 100;

@Component({
  imports: [MenuNavDirective, StarRowComponent],
  selector: 'app-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './results.component.css',
  templateUrl: './results.component.html',
})
export class ResultsComponent {
  readonly report = input.required<ClearReport>();
  readonly stageTitle = input('');
  readonly canContinue = input(false);
  readonly next = output<void>();
  readonly replay = output<void>();
  readonly map = output<void>();

  protected readonly score = computed(() => padCounter(this.report().score, SCORE_DIGITS));
  protected readonly timeUsed = computed(() => padCounter(this.report().timeUsed, TIME_DIGITS));
  protected readonly targetTime = computed(() => padCounter(this.report().targetTime, TIME_DIGITS));
  protected readonly rankedUp = computed(
    () => this.report().rankAfter.level > this.report().rankBefore.level,
  );
  protected readonly rankPercent = computed(() =>
    Math.round(this.report().rankAfter.fraction * PERCENT),
  );
}
