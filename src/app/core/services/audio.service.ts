import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import { MENU_SOUND_IDS } from '../../../content/audio/stage-sounds';
import { Music, type SfxId } from '../../../content/audio/sound-ids';
import { browserAudioEnvironment } from '../../../game-engine/audio/browser-audio-environment';
import { SILENT_AUDIO, type GameAudio } from '../../../game-engine/audio/game-audio';
import type { AudioVolumes, VolumeChannel } from '../../../game-engine/audio/volume';
import { WebAudioEngine } from '../../../game-engine/audio/web-audio-engine';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly engine = createEngine(inject(DOCUMENT).defaultView);
  private readonly settings = inject(SettingsService);

  readonly volumes = this.settings.volumes;
  readonly gameAudio: GameAudio = this.engine ?? SILENT_AUDIO;

  constructor() {
    this.engine?.setVolumes(this.volumes());
    effect(() => this.engine?.setVolumes(this.volumes()));
    inject(DestroyRef).onDestroy(() => this.engine?.dispose());
  }

  setVolume(channel: VolumeChannel, value: number): void {
    this.settings.update({ volumes: { [channel]: value } });
  }

  setVolumes(volumes: Partial<AudioVolumes>): void {
    this.settings.update({ volumes });
  }

  playMenuMusic(): void {
    this.gameAudio.prepare(MENU_SOUND_IDS);
    this.gameAudio.playMusic(Music.menu);
  }

  playSfx(id: SfxId): void {
    this.gameAudio.playSfx(id);
  }

  stopAll(): void {
    this.gameAudio.stopAll();
  }
}

function createEngine(view: Window | null): WebAudioEngine | null {
  const environment = view === null ? null : browserAudioEnvironment(view);
  return environment === null ? null : new WebAudioEngine(environment);
}
