import { isPitch, parseTrack, type ParsedTrack } from './notation';
import { noteToMidi } from './notes';
import type { Song } from './sequencer';
import type { Waveform } from './tone';

export const MAX_CHANNELS = 4;
const MAX_PULSE_CHANNELS = 2;

const PITCH_RANGES: Readonly<Record<Waveform, readonly [string, string]>> = {
  pulse: ['C3', 'C8'],
  triangle: ['A0', 'C6'],
  noise: ['C0', 'C9'],
};

export function validateSong(song: Song): string[] {
  const problems: string[] = [];
  if (!(song.bpm > 0)) problems.push(`tempo ${song.bpm} is not positive`);
  if (song.channels.length === 0 || song.channels.length > MAX_CHANNELS) {
    problems.push(`has ${song.channels.length} channels, expected 1 to ${MAX_CHANNELS}`);
  }
  const instruments = song.channels.flatMap((channel) =>
    channel.voice.kind === 'instrument' ? [channel.voice.wave] : [],
  );
  if (instruments.filter((wave) => wave === 'pulse').length > MAX_PULSE_CHANNELS) {
    problems.push('uses more than two pulse channels');
  }
  if (instruments.filter((wave) => wave === 'triangle').length > 1) {
    problems.push('uses more than one triangle channel');
  }
  if (song.channels.filter((channel) => channel.voice.kind === 'drums').length > 1) {
    problems.push('uses more than one drum channel');
  }
  const lengths = new Set<number>();
  song.channels.forEach((channel, index) => {
    let track: ParsedTrack;
    try {
      track = parseTrack(channel.track);
    } catch (error) {
      problems.push(`channel ${index}: ${(error as Error).message}`);
      return;
    }
    lengths.add(track.length);
    if (track.length % song.stepsPerBar !== 0) {
      problems.push(`channel ${index} is ${track.length} steps, not whole bars`);
    }
    const voice = channel.voice;
    for (const note of track.notes) {
      if (voice.kind === 'drums') {
        if (!Object.hasOwn(voice.hits, note.value)) {
          problems.push(`channel ${index}: unknown drum "${note.value}"`);
        }
        continue;
      }
      if (!isPitch(note.value)) {
        problems.push(`channel ${index}: "${note.value}" is not a pitch`);
        continue;
      }
      const [lowest, highest] = PITCH_RANGES[voice.wave];
      const midi = noteToMidi(note.value);
      if (midi < noteToMidi(lowest) || midi > noteToMidi(highest)) {
        problems.push(`channel ${index}: ${note.value} is outside ${lowest}-${highest}`);
      }
    }
  });
  if (lengths.size > 1) problems.push(`channel lengths differ: ${[...lengths].join(', ')}`);
  return problems;
}
