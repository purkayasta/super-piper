import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { HudState } from '../../../../game-engine/core/game-events';
import {
  COIN_DIGITS,
  SCORE_DIGITS,
  TIME_DIGITS,
  padCounter,
} from '../../../shared/ui/counter-format';

@Component({
  selector: 'app-hud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './hud.component.css',
  templateUrl: './hud.component.html',
})
export class HudComponent {
  readonly hud = input<HudState | null>(null);
  readonly stageLabel = input('');

  protected readonly score = computed(() => padCounter(this.hud()?.score ?? 0, SCORE_DIGITS));
  protected readonly coins = computed(() => padCounter(this.hud()?.coins ?? 0, COIN_DIGITS));
  protected readonly time = computed(() => padCounter(this.hud()?.timeLeft ?? 0, TIME_DIGITS));
  protected readonly lives = computed(() => this.hud()?.lives ?? 0);
}
