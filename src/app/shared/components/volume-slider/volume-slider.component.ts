import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

const PERCENT = 100;

@Component({
  selector: 'app-volume-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="slider">
      <span class="slider-label">{{ label() }}</span>
      <input
        class="ui-range"
        type="range"
        min="0"
        max="100"
        step="5"
        [value]="percent()"
        [attr.aria-valuetext]="percent() + '%'"
        (input)="changed.emit(readValue($event))"
        (change)="committed.emit(readValue($event))"
      />
      <span class="slider-value" aria-hidden="true">{{ percent() }}</span>
    </label>
  `,
  styles: `
    .slider {
      display: grid;
      grid-template-columns: 8.5em 1fr 3.5em;
      align-items: center;
      gap: 1em;
      font-size: 0.75rem;
    }

    .slider-value {
      text-align: right;
      color: var(--gold);
    }
  `,
})
export class VolumeSliderComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly changed = output<number>();
  readonly committed = output<number>();

  protected readonly percent = computed(() => Math.round(this.value() * PERCENT));

  protected readValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value) / PERCENT;
  }
}
