import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { PerfSample } from '../../../../game-engine/core/game-events';

@Component({
  selector: 'app-dev-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.code.Backquote)': 'toggle()' },
  styleUrl: './dev-overlay.component.css',
  templateUrl: './dev-overlay.component.html',
})
export class DevOverlayComponent {
  readonly sample = input<PerfSample | null>(null);
  protected readonly visible = signal(true);

  protected toggle(): void {
    this.visible.update((visible) => !visible);
  }
}
