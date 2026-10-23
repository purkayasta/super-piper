import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Sfx } from '../../../content/audio/sound-ids';
import type { VolumeChannel } from '../../../game-engine/audio/volume';
import type { QualityLevel } from '../../../game-engine/core/game-events';
import { GAME_ACTIONS, type GameAction } from '../../../game-engine/systems/input/actions';
import { QUALITY_LEVELS } from '../../core/models/settings.model';
import { AudioService } from '../../core/services/audio.service';
import { SaveService } from '../../core/services/save.service';
import { SettingsService } from '../../core/services/settings.service';
import { ACTION_LABELS, isReservedCode, keyLabel } from '../../core/utilities/key-binding-rules';
import { VolumeSliderComponent } from '../../shared/components/volume-slider/volume-slider.component';
import { MenuNavDirective } from '../../shared/ui/menu-nav.directive';

const QUALITY_NOTES: Readonly<Record<QualityLevel, string>> = {
  low: 'Fewer particles, no drifting clouds, lighter scenery. For older machines.',
  medium: 'Every effect with standard-resolution scenery.',
  high: 'Every effect with sharp, high-resolution scenery.',
};

const VOLUME_CHANNELS: readonly { channel: VolumeChannel; label: string }[] = [
  { channel: 'master', label: 'Master' },
  { channel: 'music', label: 'Music' },
  { channel: 'sfx', label: 'Effects' },
];

@Component({
  imports: [RouterLink, MenuNavDirective, VolumeSliderComponent],
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './settings.component.css',
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly save = inject(SaveService);
  private readonly audio = inject(AudioService);
  private readonly router = inject(Router);
  private readonly view = inject(DOCUMENT).defaultView;

  protected readonly settings = this.settingsService.settings;
  protected readonly qualityLevels = QUALITY_LEVELS;
  protected readonly qualityNotes = QUALITY_NOTES;
  protected readonly volumeChannels = VOLUME_CHANNELS;
  protected readonly actions = GAME_ACTIONS;
  protected readonly actionLabels = ACTION_LABELS;
  protected readonly capturing = signal<GameAction | null>(null);
  protected readonly confirmingErase = signal(false);
  protected readonly erased = signal(false);
  protected readonly keyLabel = keyLabel;

  constructor() {
    this.audio.playMenuMusic();
    inject(DestroyRef).onDestroy(() => this.stopCapture());
  }

  protected setVolume(channel: VolumeChannel, value: number): void {
    this.audio.setVolume(channel, value);
  }

  protected previewVolume(channel: VolumeChannel): void {
    if (channel !== 'music') this.audio.playSfx(Sfx.coin);
  }

  protected setQuality(quality: QualityLevel): void {
    this.settingsService.update({ quality });
  }

  protected setJumpSensitivity(value: number): void {
    this.settingsService.update({ jumpSensitivity: value });
  }

  protected setLeftSensitivity(value: number): void {
    this.settingsService.update({ leftSensitivity: value });
  }

  protected setRightSensitivity(value: number): void {
    this.settingsService.update({ rightSensitivity: value });
  }

  protected toggleReducedMotion(): void {
    this.settingsService.update({ reducedMotion: !this.settings().reducedMotion });
  }

  protected toggleScreenShake(): void {
    this.settingsService.update({ screenShake: !this.settings().screenShake });
  }

  protected startCapture(action: GameAction): void {
    this.stopCapture();
    this.capturing.set(action);
    this.view?.addEventListener('keydown', this.captureKey, { capture: true });
  }

  protected resetBindings(): void {
    this.settingsService.resetBindings();
    this.audio.playSfx(Sfx.menuSelect);
  }

  protected askErase(): void {
    this.confirmingErase.set(true);
    this.erased.set(false);
  }

  protected cancelErase(): void {
    this.confirmingErase.set(false);
  }

  protected erase(): void {
    this.save.eraseProgress();
    this.confirmingErase.set(false);
    this.erased.set(true);
  }

  protected back(): void {
    if (this.capturing() !== null) return;
    void this.router.navigateByUrl('/');
  }

  private readonly captureKey = (event: KeyboardEvent): void => {
    const action = this.capturing();
    if (action === null) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.code === 'Escape') {
      this.stopCapture();
      return;
    }
    if (event.code === '' || isReservedCode(event.code)) return;
    this.settingsService.rebind(action, event.code);
    this.audio.playSfx(Sfx.menuSelect);
    this.stopCapture();
  };

  private stopCapture(): void {
    this.view?.removeEventListener('keydown', this.captureKey, { capture: true });
    this.capturing.set(null);
  }
}
