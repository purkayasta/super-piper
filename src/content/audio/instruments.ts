import type { DrumKit, Instrument } from '../../asset-pipeline/audio/sequencer';
import type { Envelope, ToneSpec } from '../../asset-pipeline/audio/tone';

export function envelope(
  attack: number,
  decay: number,
  sustain: number,
  release: number,
): Envelope {
  return { attack, decay, sustain, release };
}

export const LEAD: Instrument = {
  kind: 'instrument',
  wave: 'pulse',
  duty: 0.25,
  volume: 0.3,
  envelope: envelope(0.003, 0.12, 0.6, 0.06),
  gate: 0.85,
  vibrato: { depth: 0.12, rate: 5.5, delay: 0.2 },
};

export const LEAD_ROUND: Instrument = {
  kind: 'instrument',
  wave: 'pulse',
  duty: 0.5,
  volume: 0.24,
  envelope: envelope(0.008, 0.25, 0.55, 0.12),
  gate: 0.9,
  vibrato: { depth: 0.15, rate: 5, delay: 0.25 },
};

export const PLUCK: Instrument = {
  kind: 'instrument',
  wave: 'pulse',
  duty: 0.5,
  volume: 0.26,
  envelope: envelope(0.002, 0.18, 0.25, 0.08),
  gate: 0.7,
};

export const ECHO: Instrument = {
  kind: 'instrument',
  wave: 'pulse',
  duty: 0.125,
  volume: 0.12,
  envelope: envelope(0.002, 0.18, 0.25, 0.08),
  gate: 0.7,
};

export const STAB: Instrument = {
  kind: 'instrument',
  wave: 'pulse',
  duty: 0.125,
  volume: 0.15,
  envelope: envelope(0.002, 0.07, 0.35, 0.04),
  gate: 0.55,
};

export const ARP: Instrument = {
  kind: 'instrument',
  wave: 'pulse',
  duty: 0.125,
  volume: 0.11,
  envelope: envelope(0.002, 0.06, 0.4, 0.03),
  gate: 0.6,
};

export const FANFARE: Instrument = {
  kind: 'instrument',
  wave: 'pulse',
  duty: 0.5,
  volume: 0.28,
  envelope: envelope(0.004, 0.2, 0.7, 0.35),
  gate: 0.85,
  vibrato: { depth: 0.18, rate: 6, delay: 0.25 },
};

export const BASS: Instrument = {
  kind: 'instrument',
  wave: 'triangle',
  volume: 0.55,
  envelope: envelope(0.002, 0, 1, 0.02),
  gate: 0.85,
};

export const BASS_SHORT: Instrument = {
  kind: 'instrument',
  wave: 'triangle',
  volume: 0.55,
  envelope: envelope(0.002, 0, 1, 0.015),
  gate: 0.5,
};

function hit(tone: Omit<ToneSpec, 'envelope'> & { readonly decay: number }): ToneSpec {
  const { decay, ...rest } = tone;
  return { ...rest, envelope: envelope(0.001, decay, 0, 0.005) };
}

export const DRUMS: DrumKit = {
  kind: 'drums',
  hits: {
    k: [
      hit({
        wave: 'triangle',
        frequency: 170,
        endFrequency: 45,
        glide: 0.06,
        duration: 0.08,
        volume: 0.6,
        decay: 0.08,
      }),
      hit({ wave: 'noise', frequency: 3500, duration: 0.03, volume: 0.12, decay: 0.03 }),
    ],
    s: [
      hit({
        wave: 'noise',
        frequency: 11000,
        endFrequency: 6000,
        duration: 0.12,
        volume: 0.24,
        decay: 0.12,
      }),
      hit({
        wave: 'triangle',
        frequency: 260,
        endFrequency: 160,
        duration: 0.04,
        volume: 0.25,
        decay: 0.04,
      }),
    ],
    h: [hit({ wave: 'noise', frequency: 60000, duration: 0.025, volume: 0.1, decay: 0.025 })],
    o: [hit({ wave: 'noise', frequency: 50000, duration: 0.11, volume: 0.09, decay: 0.11 })],
    t: [
      hit({
        wave: 'triangle',
        frequency: 240,
        endFrequency: 110,
        duration: 0.12,
        volume: 0.5,
        decay: 0.12,
      }),
    ],
  },
};
