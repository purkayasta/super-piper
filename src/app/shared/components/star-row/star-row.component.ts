import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NO_STARS, type StageStars } from '../../../core/models/progression.model';
import { starCount } from '../../../core/utilities/progression-rules';

const STAR_KEYS: readonly (keyof StageStars)[] = ['finish', 'postmarks', 'time'];

@Component({
  selector: 'app-star-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', '[attr.aria-label]': 'label()', '[class.large]': 'large()' },
  template: `
    @for (key of keys; track key; let index = $index) {
      <span
        class="star"
        [class.earned]="stars()[key]"
        [class.fresh]="fresh()[key]"
        [style.animation-delay.ms]="index * 260"
        aria-hidden="true"
      ></span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.35em;
      font-size: 0.75rem;
    }

    :host(.large) {
      font-size: 2rem;
    }

    .star {
      width: 1em;
      height: 1em;
      background: #2c3d63;
      clip-path: polygon(
        50% 0,
        63% 35%,
        100% 38%,
        71% 61%,
        81% 100%,
        50% 78%,
        19% 100%,
        29% 61%,
        0 38%,
        37% 35%
      );
    }

    .earned {
      background: var(--gold);
    }

    .fresh {
      animation: star-pop 420ms steps(4) both;
    }

    @keyframes star-pop {
      from {
        transform: scale(0);
      }
      70% {
        transform: scale(1.35);
      }
      to {
        transform: scale(1);
      }
    }
  `,
})
export class StarRowComponent {
  readonly stars = input.required<StageStars>();
  readonly fresh = input<StageStars>(NO_STARS);
  readonly large = input(false);

  protected readonly keys = STAR_KEYS;
  protected readonly label = computed(() => `${starCount(this.stars())} of 3 stars`);
}
