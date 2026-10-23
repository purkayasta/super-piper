import {
  HURRY_VARIANTS,
  Music,
  ONE_SHOT_MUSIC,
  SFX_MAX_VOICES,
  STAGE_MUSIC_IDS,
  type MusicId,
  type SfxId,
  type SoundId,
} from '../../content/audio/sound-ids';
import type { GameAudio } from './game-audio';
import { VoicePool } from './voice-pool';
import { DEFAULT_VOLUMES, volumeToGain, type AudioVolumes } from './volume';

export interface AudioEventSource {
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void;
  removeEventListener(type: string, listener: () => void, options?: EventListenerOptions): void;
}

export interface AudioEnvironment {
  createContext(): AudioContext | null;
  fetchBytes(path: string): Promise<ArrayBuffer>;
  soundPath(id: SoundId): string;
  hasUserActivation(): boolean;
  readonly gestures: AudioEventSource;
  readonly visibility: (AudioEventSource & { readonly hidden: boolean }) | null;
}

interface PlayingMusic {
  readonly id: MusicId;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  readonly startedAt: number;
  readonly offset: number;
}

export const MAX_SFX_VOICES = 16;
const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'keydown', 'touchend'] as const;
const STEAL_FADE_SECONDS = 0.005;
const MUSIC_FADE_SECONDS = 0.03;
const VOLUME_SMOOTHING_SECONDS = 0.015;
const STAGE_SPECIFIC_MUSIC: ReadonlySet<MusicId> = new Set([
  ...STAGE_MUSIC_IDS,
  ...Object.values(HURRY_VARIANTS),
  Music.boss,
]);

export function musicToRelease(
  decoded: Iterable<SoundId>,
  requested: readonly SoundId[],
): MusicId[] {
  const wanted = new Set(requested);
  if (!requested.some((id) => STAGE_SPECIFIC_MUSIC.has(id as MusicId))) return [];
  const release: MusicId[] = [];
  for (const id of decoded) {
    const music = id as MusicId;
    if (STAGE_SPECIFIC_MUSIC.has(music) && !wanted.has(music)) release.push(music);
  }
  return release;
}

export class WebAudioEngine implements GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private volumes: AudioVolumes = DEFAULT_VOLUMES;
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private readonly fetches = new Map<SoundId, Promise<ArrayBuffer>>();
  private readonly decoding = new Set<SoundId>();
  private readonly voices = new VoicePool(MAX_SFX_VOICES);
  private readonly voiceSources: (AudioBufferSourceNode | null)[] = new Array(MAX_SFX_VOICES).fill(
    null,
  );
  private readonly voiceGains: (GainNode | null)[] = new Array(MAX_SFX_VOICES).fill(null);
  private wantedMusic: MusicId | null = null;
  private musicPaused = false;
  private pausedOffset = 0;
  private playing: PlayingMusic | null = null;
  private listening = false;
  private disposed = false;

  constructor(private readonly environment: AudioEnvironment) {
    if (environment.hasUserActivation()) this.createContext();
    this.listenForGestures();
    environment.visibility?.addEventListener('visibilitychange', this.handleVisibility);
  }

  get unlocked(): boolean {
    return this.context?.state === 'running';
  }

  get currentMusic(): MusicId | null {
    return this.playing?.id ?? null;
  }

  isReady(id: SoundId): boolean {
    return this.buffers.has(id);
  }

  setVolumes(volumes: AudioVolumes): void {
    this.volumes = volumes;
    this.applyVolumes(VOLUME_SMOOTHING_SECONDS);
  }

  prepare(ids: readonly SoundId[]): void {
    for (const id of musicToRelease(this.buffers.keys(), ids)) {
      if (id !== this.playing?.id) this.buffers.delete(id);
    }
    for (const id of ids) {
      if (this.buffers.has(id) || this.fetches.has(id)) continue;
      const bytes = this.environment.fetchBytes(this.environment.soundPath(id));
      this.fetches.set(id, bytes);
      bytes.catch((error: unknown) => this.forget(id, error));
      if (this.context !== null) this.decode(id);
    }
  }

  playSfx(id: SfxId): void {
    const context = this.context;
    const buffer = this.buffers.get(id);
    if (context === null || context.state !== 'running' || buffer === undefined) return;
    const now = context.currentTime;
    const slot = this.voices.claim(id, SFX_MAX_VOICES[id], now, buffer.duration);
    if (this.voices.stole) this.silenceVoice(slot, now);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.sfxBus!);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.voiceSources[slot] !== source) return;
      this.voiceSources[slot] = null;
      this.voiceGains[slot] = null;
      this.voices.release(slot);
    };
    this.voiceSources[slot] = source;
    this.voiceGains[slot] = gain;
    source.start(now);
  }

  playMusic(id: MusicId | null): void {
    if (id === this.wantedMusic && (this.playing !== null || id === null)) return;
    if (id !== this.wantedMusic) {
      this.wantedMusic = id;
      this.pausedOffset = 0;
      this.musicPaused = false;
    }
    this.startWantedMusic();
  }

  pauseMusic(): void {
    if (this.musicPaused) return;
    this.musicPaused = true;
    const playing = this.playing;
    if (playing === null || this.context === null) return;
    const elapsed = playing.offset + this.context.currentTime - playing.startedAt;
    const duration = playing.source.buffer!.duration;
    this.pausedOffset = playing.source.loop ? elapsed % duration : Math.min(elapsed, duration);
    this.stopMusic();
  }

  resumeMusic(): void {
    if (!this.musicPaused) return;
    this.musicPaused = false;
    this.startWantedMusic();
  }

  stopAll(): void {
    this.wantedMusic = null;
    this.musicPaused = false;
    this.pausedOffset = 0;
    this.stopMusic();
    const now = this.context?.currentTime ?? 0;
    for (let slot = 0; slot < MAX_SFX_VOICES; slot++) this.silenceVoice(slot, now);
    this.voices.releaseAll();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopListeningForGestures();
    this.environment.visibility?.removeEventListener('visibilitychange', this.handleVisibility);
    this.stopAll();
    void this.context?.close();
    this.context = null;
  }

  private createContext(): void {
    if (this.context !== null || this.disposed) return;
    const context = this.environment.createContext();
    if (context === null) return;
    this.context = context;
    this.master = context.createGain();
    this.musicBus = context.createGain();
    this.sfxBus = context.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(context.destination);
    this.applyVolumes(0);
    context.onstatechange = this.handleStateChange;
    for (const id of this.fetches.keys()) this.decode(id);
  }

  private decode(id: SoundId): void {
    const context = this.context;
    const bytes = this.fetches.get(id);
    if (context === null || bytes === undefined || this.decoding.has(id)) return;
    this.decoding.add(id);
    bytes
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        this.decoding.delete(id);
        this.fetches.delete(id);
        if (this.disposed) return;
        this.buffers.set(id, buffer);
        if (id === this.wantedMusic) this.startWantedMusic();
      })
      .catch((error: unknown) => {
        this.decoding.delete(id);
        this.forget(id, error);
      });
  }

  private forget(id: SoundId, error: unknown): void {
    if (!this.fetches.has(id)) return;
    this.fetches.delete(id);
    console.warn(`Audio "${id}" could not be loaded`, error);
  }

  private startWantedMusic(): void {
    const id = this.wantedMusic;
    if (this.playing?.id === id && this.playing !== null) return;
    this.stopMusic();
    const context = this.context;
    if (id === null || this.musicPaused || context === null || context.state !== 'running') return;
    const buffer = this.buffers.get(id);
    if (buffer === undefined) return;
    const loop = !ONE_SHOT_MUSIC.has(id);
    const offset = this.pausedOffset;
    if (!loop && offset >= buffer.duration) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(gain);
    gain.connect(this.musicBus!);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    const now = context.currentTime;
    source.start(now, offset);
    this.playing = { id, source, gain, startedAt: now, offset };
  }

  private stopMusic(): void {
    const playing = this.playing;
    const context = this.context;
    this.playing = null;
    if (playing === null || context === null) return;
    const now = context.currentTime;
    playing.gain.gain.setTargetAtTime(0, now, MUSIC_FADE_SECONDS / 3);
    playing.source.stop(now + MUSIC_FADE_SECONDS);
  }

  private silenceVoice(slot: number, now: number): void {
    const source = this.voiceSources[slot];
    const gain = this.voiceGains[slot];
    this.voiceSources[slot] = null;
    this.voiceGains[slot] = null;
    if (source === null || gain === null) return;
    gain.gain.setTargetAtTime(0, now, STEAL_FADE_SECONDS / 3);
    source.stop(now + STEAL_FADE_SECONDS);
  }

  private applyVolumes(smoothingSeconds: number): void {
    const context = this.context;
    if (context === null) return;
    const now = context.currentTime;
    setGain(this.master!, volumeToGain(this.volumes.master), now, smoothingSeconds);
    setGain(this.musicBus!, volumeToGain(this.volumes.music), now, smoothingSeconds);
    setGain(this.sfxBus!, volumeToGain(this.volumes.sfx), now, smoothingSeconds);
  }

  private listenForGestures(): void {
    if (this.unlocked || this.listening) return;
    this.listening = true;
    for (const type of GESTURE_EVENTS) {
      this.environment.gestures.addEventListener(type, this.handleGesture, { capture: true });
    }
  }

  private stopListeningForGestures(): void {
    if (!this.listening) return;
    this.listening = false;
    for (const type of GESTURE_EVENTS) {
      this.environment.gestures.removeEventListener(type, this.handleGesture, { capture: true });
    }
  }

  private readonly handleGesture = (): void => {
    this.createContext();
    const context = this.context;
    if (context === null) return;
    if (context.state !== 'running' && !this.environment.visibility?.hidden) {
      // iOS Safari only unlocks when resume() and a buffer start happen inside the gesture handler itself.
      void context.resume();
      const primer = context.createBufferSource();
      primer.buffer = context.createBuffer(1, 1, context.sampleRate);
      primer.connect(context.destination);
      primer.start();
    }
    if (context.state === 'running') this.handleStateChange();
  };

  private readonly handleStateChange = (): void => {
    if (!this.unlocked) return;
    this.stopListeningForGestures();
    this.startWantedMusic();
  };

  private readonly handleVisibility = (): void => {
    const context = this.context;
    if (context === null) return;
    if (this.environment.visibility?.hidden) {
      if (context.state === 'running') void context.suspend();
    } else if (context.state === 'suspended' && !this.listening) {
      void context.resume();
    }
  };
}

function setGain(node: GainNode, value: number, now: number, smoothingSeconds: number): void {
  if (smoothingSeconds <= 0) {
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(value, now);
    return;
  }
  node.gain.setTargetAtTime(value, now, smoothingSeconds);
}
