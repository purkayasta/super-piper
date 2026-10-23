import { noteFrequency } from '../../asset-pipeline/audio/notes';
import {
  sequenceSong,
  type SongChannel,
  type TimedTone,
} from '../../asset-pipeline/audio/sequencer';
import type { Envelope, ToneSpec, Waveform } from '../../asset-pipeline/audio/tone';
import { BASS, DRUMS, FANFARE, STAB, envelope } from './instruments';
import { Sfx, type SfxId } from './sound-ids';

export interface SfxDefinition {
  readonly peak: number;
  readonly tones: readonly TimedTone[];
}

type ToneExtras = Partial<
  Omit<ToneSpec, 'wave' | 'frequency' | 'duration' | 'volume' | 'envelope'>
>;

function tone(
  wave: Waveform,
  frequency: number | string,
  duration: number,
  volume: number,
  shape: Envelope,
  extras: ToneExtras = {},
): ToneSpec {
  const hz = typeof frequency === 'string' ? noteFrequency(frequency) : frequency;
  return { wave, frequency: hz, duration, volume, envelope: shape, ...extras };
}

function at(seconds: number, spec: ToneSpec): TimedTone {
  return { at: seconds, tone: spec };
}

function jingle(bpm: number, channels: readonly SongChannel[]): readonly TimedTone[] {
  return sequenceSong({ bpm, stepsPerBeat: 4, stepsPerBar: 16, loop: false, channels }).tones;
}

const SNAP = envelope(0.001, 0.05, 0.5, 0.04);
const PING = envelope(0.001, 0.15, 0.3, 0.08);
const HOLD = envelope(0.002, 0.02, 0.85, 0.05);

export const SFX_LIBRARY: Readonly<Record<SfxId, SfxDefinition>> = {
  [Sfx.jumpSmall]: {
    peak: 0.55,
    tones: [
      at(
        0,
        tone('pulse', 300, 0.12, 0.6, envelope(0.002, 0.08, 0.6, 0.05), {
          duty: 0.25,
          endFrequency: 880,
          glide: 0.11,
        }),
      ),
    ],
  },
  [Sfx.jumpBig]: {
    peak: 0.55,
    tones: [
      at(
        0,
        tone('pulse', 190, 0.15, 0.6, envelope(0.002, 0.1, 0.6, 0.06), {
          duty: 0.5,
          endFrequency: 560,
          glide: 0.14,
        }),
      ),
    ],
  },
  [Sfx.coin]: {
    peak: 0.5,
    tones: [
      at(
        0,
        tone('pulse', 'G5', 0.2, 0.6, envelope(0.001, 0.25, 0.2, 0.12), {
          duty: 0.25,
          arpeggio: { semitones: [0, 7, 12], step: 0.035 },
        }),
      ),
    ],
  },
  [Sfx.stomp]: {
    peak: 0.7,
    tones: [
      at(0, tone('triangle', 420, 0.09, 0.8, SNAP, { endFrequency: 70 })),
      at(
        0,
        tone('noise', 9000, 0.04, 0.25, envelope(0.001, 0.04, 0, 0.01), { endFrequency: 2500 }),
      ),
    ],
  },
  [Sfx.kick]: {
    peak: 0.65,
    tones: [
      at(0, tone('pulse', 900, 0.05, 0.5, SNAP, { duty: 0.125, endFrequency: 280 })),
      at(
        0,
        tone('noise', 14000, 0.05, 0.4, envelope(0.001, 0.05, 0, 0.01), { endFrequency: 4000 }),
      ),
    ],
  },
  [Sfx.bump]: {
    peak: 0.6,
    tones: [
      at(0, tone('triangle', 190, 0.09, 0.9, SNAP, { endFrequency: 85 })),
      at(0, tone('pulse', 120, 0.04, 0.3, SNAP, { duty: 0.5, endFrequency: 80 })),
    ],
  },
  [Sfx.brickBreak]: {
    peak: 0.7,
    tones: [
      at(
        0,
        tone('noise', 16000, 0.24, 0.6, envelope(0.001, 0.24, 0, 0.02), {
          endFrequency: 1800,
          arpeggio: { semitones: [0, -7, 5, -12], step: 0.022 },
        }),
      ),
      at(0, tone('triangle', 160, 0.1, 0.7, SNAP, { endFrequency: 55 })),
    ],
  },
  [Sfx.powerUpAppear]: {
    peak: 0.5,
    tones: [
      at(
        0,
        tone('pulse', 260, 0.42, 0.5, envelope(0.01, 0.1, 0.8, 0.08), {
          duty: 0.5,
          endFrequency: 1040,
          vibrato: { depth: 0.8, rate: 16, delay: 0 },
        }),
      ),
    ],
  },
  [Sfx.powerUpGet]: {
    peak: 0.6,
    tones: [
      at(
        0,
        tone('pulse', 'F5', 0.5, 0.5, envelope(0.002, 0.1, 0.75, 0.1), {
          duty: 0.25,
          endFrequency: noteFrequency('F6'),
          arpeggio: { semitones: [0, 4, 7, 12], step: 0.04 },
        }),
      ),
      at(
        0,
        tone('pulse', 'F4', 0.5, 0.3, envelope(0.002, 0.1, 0.75, 0.1), {
          duty: 0.125,
          endFrequency: noteFrequency('F5'),
          arpeggio: { semitones: [7, 12, 4, 0], step: 0.04 },
        }),
      ),
    ],
  },
  [Sfx.oneUp]: {
    peak: 0.55,
    tones: jingle(240, [
      { voice: { ...STAB, duty: 0.25, volume: 0.5, gate: 0.9 }, track: 'A5 C#6 E6 A6:3 | -:2' },
      { voice: { ...BASS, volume: 0.35 }, track: 'A4:2 E5:2 A5:2 -:2' },
    ]).concat([
      at(
        0.25,
        tone('pulse', 'A6', 0.2, 0.35, PING, {
          duty: 0.25,
          arpeggio: { semitones: [0, 2], step: 0.035 },
        }),
      ),
    ]),
  },
  [Sfx.damage]: {
    peak: 0.6,
    tones: [
      at(
        0,
        tone('pulse', 700, 0.45, 0.6, envelope(0.002, 0.05, 0.8, 0.08), {
          duty: 0.25,
          endFrequency: 190,
          vibrato: { depth: 1, rate: 14, delay: 0 },
        }),
      ),
    ],
  },
  [Sfx.death]: {
    peak: 0.65,
    tones: jingle(150, [
      {
        voice: { ...FANFARE, duty: 0.25 },
        track: 'E5:2 -:1 B4:2 -:1 G4:3 F#4:3 | E4:10 -:2',
      },
      { voice: BASS, track: 'E3:3 -:3 C3:3 B2:3 | E2:10 -:2' },
    ]),
  },
  [Sfx.goal]: {
    peak: 0.55,
    tones: [
      at(
        0,
        tone('pulse', 220, 0.9, 0.5, envelope(0.005, 0.1, 0.8, 0.1), {
          duty: 0.25,
          endFrequency: 1760,
          arpeggio: { semitones: [0, 12], step: 0.03 },
        }),
      ),
      at(0, tone('noise', 30000, 0.9, 0.06, envelope(0.01, 0.9, 0, 0.05))),
    ],
  },
  [Sfx.tally]: {
    peak: 0.35,
    tones: [
      at(0, tone('pulse', 1480, 0.025, 0.6, envelope(0.001, 0.025, 0.2, 0.01), { duty: 0.125 })),
    ],
  },
  [Sfx.timeLow]: {
    peak: 0.6,
    tones: jingle(200, [
      {
        voice: { ...STAB, volume: 0.45, duty: 0.25 },
        track: 'G5 D6 G5 D6 A5 E6 A5 E6 B5 F#6 B5 F#6 D6:4 -:2',
      },
      { voice: { ...STAB, volume: 0.3, duty: 0.5 }, track: 'D5:4 E5:4 F#5:4 A5:4 -:2' },
      { voice: BASS, track: 'G3:4 A3:4 B3:4 D4:4 -:2' },
    ]),
  },
  [Sfx.parcelThrow]: {
    peak: 0.45,
    tones: [
      at(0, tone('pulse', 1300, 0.06, 0.5, SNAP, { duty: 0.125, endFrequency: 480 })),
      at(0, tone('noise', 22000, 0.04, 0.2, envelope(0.001, 0.04, 0, 0.01))),
    ],
  },
  [Sfx.tube]: {
    peak: 0.6,
    tones: [
      at(
        0,
        tone('triangle', 170, 0.5, 0.9, envelope(0.003, 0.05, 0.9, 0.06), {
          endFrequency: 60,
          arpeggio: { semitones: [0, 5], step: 0.04 },
        }),
      ),
    ],
  },
  [Sfx.checkpoint]: {
    peak: 0.5,
    tones: [
      at(0, tone('pulse', 'E6', 0.07, 0.5, SNAP, { duty: 0.25 })),
      at(
        0.08,
        tone('pulse', 'B6', 0.25, 0.5, PING, {
          duty: 0.25,
          vibrato: { depth: 0.25, rate: 7, delay: 0.05 },
        }),
      ),
    ],
  },
  [Sfx.postmark]: {
    peak: 0.55,
    tones: [
      at(0, tone('noise', 5000, 0.05, 0.5, envelope(0.001, 0.05, 0, 0.01), { endFrequency: 2000 })),
      at(0, tone('triangle', 200, 0.05, 0.6, SNAP, { endFrequency: 90 })),
      at(
        0.04,
        tone('pulse', 'C6', 0.2, 0.45, PING, {
          duty: 0.25,
          arpeggio: { semitones: [0, 4, 7, 12], step: 0.03 },
        }),
      ),
    ],
  },
  [Sfx.pause]: {
    peak: 0.45,
    tones: [
      at(0, tone('pulse', 'A5', 0.05, 0.5, SNAP, { duty: 0.25 })),
      at(0.06, tone('pulse', 'E5', 0.08, 0.5, PING, { duty: 0.25 })),
    ],
  },
  [Sfx.menuMove]: {
    peak: 0.3,
    tones: [
      at(0, tone('pulse', 1800, 0.02, 0.5, envelope(0.001, 0.02, 0.3, 0.01), { duty: 0.25 })),
    ],
  },
  [Sfx.menuSelect]: {
    peak: 0.45,
    tones: [
      at(0, tone('pulse', 'C6', 0.04, 0.5, SNAP, { duty: 0.5 })),
      at(0.05, tone('pulse', 'G6', 0.12, 0.5, PING, { duty: 0.5 })),
    ],
  },
  [Sfx.bossHit]: {
    peak: 0.75,
    tones: [
      at(
        0,
        tone('pulse', 520, 0.3, 0.6, HOLD, {
          duty: 0.5,
          endFrequency: 95,
          vibrato: { depth: 1.5, rate: 20, delay: 0 },
        }),
      ),
      at(0, tone('noise', 7000, 0.25, 0.5, envelope(0.001, 0.25, 0, 0.02), { endFrequency: 900 })),
      ...DRUMS.hits['k'].map((spec) => at(0, spec)),
    ],
  },
};
