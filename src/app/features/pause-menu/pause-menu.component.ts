import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Sfx } from '../../../content/audio/sound-ids';
import type { VolumeChannel } from '../../../game-engine/audio/volume';
import { AudioService } from '../../core/services/audio.service';
import { SettingsService } from '../../core/services/settings.service';
import { VolumeSliderComponent } from '../../shared/components/volume-slider/volume-slider.component';
import { MenuNavDirective } from '../../shared/ui/menu-nav.directive';

const ACTIVATION_CODES: ReadonlySet<string> = new Set(['Enter', 'NumpadEnter', 'Space']);

@Component({
  imports: [MenuNavDirective, VolumeSliderComponent],
  selector: 'app-pause-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'resumeOnPauseKey($event)' },
  template: `
    <div class="overlay">
      <section
        class="panel pause"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        appMenuNav
        startAction="back"
        (menuBack)="resumed.emit()"
      >
        <h2 id="pause-title" class="screen-title">PAUSED</h2>
        <p class="stage">WORLD {{ stageLabel() }}</p>
        <div class="actions">
          <button
            type="button"
            class="ui-button primary"
            data-nav-default
            data-testid="resume"
            (click)="resumed.emit()"
          >
            Resume
          </button>
          <button type="button" class="ui-button" data-testid="restart" (click)="restarted.emit()">
            Restart stage
          </button>
          <button type="button" class="ui-button" data-testid="quit" (click)="quit.emit()">
            World map
          </button>
        </div>
        <app-volume-slider
          label="Music"
          [value]="volumes().music"
          (changed)="setVolume('music', $event)"
        />
        <app-volume-slider
          label="Effects"
          [value]="volumes().sfx"
          (changed)="setVolume('sfx', $event)"
          (committed)="previewEffects()"
        />
      </section>
    </div>
  `,
  styles: `
    .pause {
      display: grid;
      gap: 1.25rem;
      width: min(26rem, 100%);
      text-align: center;
    }

    .stage {
      margin: 0;
      color: var(--sky);
      font-size: 0.625rem;
    }

    .actions {
      display: grid;
      gap: 0.75rem;
    }
  `,
})
export class PauseMenuComponent {
  private readonly audio = inject(AudioService);
  private readonly settings = inject(SettingsService);

  readonly stageLabel = input('');
  readonly resumed = output<void>();
  readonly restarted = output<void>();
  readonly quit = output<void>();

  protected readonly volumes = this.audio.volumes;

  protected setVolume(channel: VolumeChannel, value: number): void {
    this.audio.setVolume(channel, value);
  }

  protected previewEffects(): void {
    this.audio.playSfx(Sfx.coin);
  }

  protected resumeOnPauseKey(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.repeat || ACTIVATION_CODES.has(event.code)) return;
    const pauseKey = event.code === 'Escape' || this.settings.bindings().pause.includes(event.code);
    if (!pauseKey) return;
    event.preventDefault();
    this.resumed.emit();
  }
}
