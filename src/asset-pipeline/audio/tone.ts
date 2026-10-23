import { NoiseGenerator, PulseOscillator, TriangleOscillator } from './oscillators';

export type Waveform = 'pulse' | 'triangle' | 'noise';

export interface Envelope {
  readonly attack: number;
  readonly decay: number;
  readonly sustain: number;
  readonly release: number;
}

export interface Vibrato {
  readonly depth: number;
  readonly rate: number;
  readonly delay: number;
}

export interface Arpeggio {
  readonly semitones: readonly number[];
  readonly step: number;
}

export interface ToneSpec {
  readonly wave: Waveform;
  readonly frequency: number;
  readonly duration: number;
  readonly volume: number;
  readonly envelope: Envelope;
  readonly duty?: number;
  readonly endFrequency?: number;
  readonly glide?: number;
  readonly vibrato?: Vibrato;
  readonly arpeggio?: Arpeggio;
  readonly shortNoise?: boolean;
  readonly cutoff?: number;
}

export const MIN_ATTACK_SECONDS = 0.001;
export const MIN_RELEASE_SECONDS = 0.003;
export const CUTOFF_FADE_SECONDS = 0.003;
const DEFAULT_DUTY = 0.5;
const SEMITONES_PER_OCTAVE = 12;

export function toneSeconds(tone: ToneSpec): number {
  const natural = tone.duration + Math.max(MIN_RELEASE_SECONDS, tone.envelope.release);
  return tone.cutoff === undefined ? natural : Math.min(natural, tone.cutoff);
}

export function envelopeLevel(envelope: Envelope, t: number, gate: number): number {
  if (t < 0) return 0;
  if (t <= gate) return heldLevel(envelope, t);
  const release = Math.max(MIN_RELEASE_SECONDS, envelope.release);
  return heldLevel(envelope, gate) * Math.max(0, 1 - (t - gate) / release);
}

export function frequencyAt(tone: ToneSpec, t: number): number {
  let frequency = tone.frequency;
  if (tone.endFrequency !== undefined) {
    const glide = tone.glide ?? tone.duration;
    const progress = glide > 0 ? Math.min(1, Math.max(0, t / glide)) : 1;
    frequency *= (tone.endFrequency / tone.frequency) ** progress;
  }
  let semitones = 0;
  const arpeggio = tone.arpeggio;
  if (arpeggio !== undefined && arpeggio.semitones.length > 0) {
    const index = Math.floor(t / arpeggio.step) % arpeggio.semitones.length;
    semitones += arpeggio.semitones[index];
  }
  const vibrato = tone.vibrato;
  if (vibrato !== undefined && t > vibrato.delay) {
    semitones += vibrato.depth * Math.sin(2 * Math.PI * vibrato.rate * (t - vibrato.delay));
  }
  return semitones === 0 ? frequency : frequency * 2 ** (semitones / SEMITONES_PER_OCTAVE);
}

export function renderTone(
  tone: ToneSpec,
  sampleRate: number,
  out: Float32Array,
  startIndex: number,
  gain = 1,
): void {
  const length = Math.ceil(toneSeconds(tone) * sampleRate);
  const end = Math.min(out.length, startIndex + length);
  const source = createSource(tone);
  const amplitude = tone.volume * gain;
  const cutoff = tone.cutoff;
  for (let index = Math.max(0, startIndex); index < end; index++) {
    const t = (index - startIndex) / sampleRate;
    let level = envelopeLevel(tone.envelope, t, tone.duration);
    if (cutoff !== undefined && t > cutoff - CUTOFF_FADE_SECONDS) {
      level *= Math.max(0, (cutoff - t) / CUTOFF_FADE_SECONDS);
    }
    out[index] += source(frequencyAt(tone, t), sampleRate) * level * amplitude;
  }
}

function heldLevel(envelope: Envelope, t: number): number {
  const attack = Math.max(MIN_ATTACK_SECONDS, envelope.attack);
  if (t < attack) return t / attack;
  const decayed = t - attack;
  if (decayed >= envelope.decay) return envelope.sustain;
  return 1 - (1 - envelope.sustain) * (decayed / envelope.decay);
}

function createSource(tone: ToneSpec): (frequency: number, sampleRate: number) => number {
  switch (tone.wave) {
    case 'pulse': {
      const pulse = new PulseOscillator();
      const duty = tone.duty ?? DEFAULT_DUTY;
      return (frequency, sampleRate) => pulse.next(frequency, duty, sampleRate);
    }
    case 'triangle': {
      const triangle = new TriangleOscillator();
      return (frequency, sampleRate) => triangle.next(frequency, sampleRate);
    }
    case 'noise': {
      const noise = new NoiseGenerator();
      const shortMode = tone.shortNoise === true;
      return (frequency, sampleRate) => noise.next(frequency, sampleRate, shortMode);
    }
  }
}
