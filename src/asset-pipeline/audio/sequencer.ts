import { isPitch, parseTrack, type ParsedNote } from './notation';
import { noteFrequency } from './notes';
import type { Envelope, ToneSpec, Vibrato, Waveform } from './tone';

export interface Instrument {
  readonly kind: 'instrument';
  readonly wave: Waveform;
  readonly volume: number;
  readonly envelope: Envelope;
  readonly gate: number;
  readonly duty?: number;
  readonly vibrato?: Vibrato;
}

export interface DrumKit {
  readonly kind: 'drums';
  readonly hits: Readonly<Record<string, readonly ToneSpec[]>>;
}

export interface SongChannel {
  readonly voice: Instrument | DrumKit;
  readonly track: string;
}

export interface Song {
  readonly bpm: number;
  readonly stepsPerBeat: number;
  readonly stepsPerBar: number;
  readonly loop: boolean;
  readonly channels: readonly SongChannel[];
}

export interface TimedTone {
  readonly at: number;
  readonly tone: ToneSpec;
}

export interface Sequence {
  readonly tones: readonly TimedTone[];
  readonly steps: number;
  readonly seconds: number;
}

const SECONDS_PER_MINUTE = 60;

export function stepSeconds(bpm: number, stepsPerBeat: number): number {
  return SECONDS_PER_MINUTE / bpm / stepsPerBeat;
}

export function sequenceSong(song: Song, tempoScale = 1): Sequence {
  const step = stepSeconds(song.bpm * tempoScale, song.stepsPerBeat);
  const parsed = song.channels.map((channel) => parseTrack(channel.track));
  const steps = parsed[0]?.length ?? 0;
  parsed.forEach((track, index) => {
    if (track.length !== steps) {
      throw new Error(`Channel ${index} is ${track.length} steps long, expected ${steps}`);
    }
  });
  const tones: TimedTone[] = [];
  song.channels.forEach((channel, index) => {
    const notes = parsed[index].notes;
    notes.forEach((note, noteIndex) => {
      const next = nextStart(notes, noteIndex, steps, song.loop);
      const cutoff = next === null ? undefined : (next - note.start) * step;
      for (const tone of tonesFor(channel.voice, note, step, cutoff)) {
        tones.push({ at: note.start * step, tone });
      }
    });
  });
  return { tones, steps, seconds: steps * step };
}

function nextStart(
  notes: readonly ParsedNote[],
  index: number,
  steps: number,
  loop: boolean,
): number | null {
  if (index + 1 < notes.length) return notes[index + 1].start;
  return loop ? notes[0].start + steps : null;
}

function tonesFor(
  voice: Instrument | DrumKit,
  note: ParsedNote,
  step: number,
  cutoff: number | undefined,
): readonly ToneSpec[] {
  if (voice.kind === 'drums') {
    const hit = voice.hits[note.value];
    if (hit === undefined) throw new Error(`Unknown drum "${note.value}"`);
    return cutoff === undefined ? hit : hit.map((tone) => ({ ...tone, cutoff }));
  }
  if (!isPitch(note.value)) throw new Error(`"${note.value}" is not a pitch`);
  return [
    {
      wave: voice.wave,
      frequency: noteFrequency(note.value),
      duration: note.length * step * voice.gate,
      volume: voice.volume,
      envelope: voice.envelope,
      duty: voice.duty,
      vibrato: voice.vibrato,
      cutoff,
    },
  ];
}
