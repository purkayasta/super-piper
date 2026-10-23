import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { MENU_SOUND_IDS } from '../../../content/audio/stage-sounds';
import { Music, type SfxId } from '../../../content/audio/sound-ids';
import { browserAudioEnvironment } from '../../../game-engine/audio/browser-audio-environment';
import { SILENT_AUDIO, type GameAudio } from '../../../game-engine/audio/game-audio';
import {
  DEFAULT_VOLUMES,
  sanitizeVolumes,
  withVolume,
  type AudioVolumes,
  type VolumeChannel,
} from '../../../game-engine/audio/volume';
import { WebAudioEngine } from '../../../game-engine/audio/web-audio-engine';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly engine = createEngine(inject(DOCUMENT).defaultView);
  private readonly volumesState = signal<AudioVolumes>(DEFAULT_VOLUMES);

  readonly volumes = this.volumesState.asReadonly();
  readonly gameAudio: GameAudio = this.engine ?? SILENT_AUDIO;

  constructor() {
    this.engine?.setVolumes(this.volumesState());
    inject(DestroyRef).onDestroy(() => this.engine?.dispose());
  }

  setVolume(channel: VolumeChannel, value: number): void {
    this.applyVolumes(withVolume(this.volumesState(), channel, value));
  }

  setVolumes(volumes: Partial<AudioVolumes>): void {
    this.applyVolumes(sanitizeVolumes({ ...this.volumesState(), ...volumes }));
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

  private applyVolumes(volumes: AudioVolumes): void {
    this.volumesState.set(volumes);
    this.engine?.setVolumes(volumes);
  }
}

function createEngine(view: Window | null): WebAudioEngine | null {
  const environment = view === null ? null : browserAudioEnvironment(view);
  return environment === null ? null : new WebAudioEngine(environment);
}
