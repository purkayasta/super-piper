import { repeat } from '../../../asset-pipeline/audio/notation';
import type { Song } from '../../../asset-pipeline/audio/sequencer';
import { ARP, BASS, DRUMS, LEAD_ROUND } from '../instruments';
import { bars, glide } from '../phrases';

const MELODY = bars(
  'Bb4:4 G4:2 Bb4:2 Eb5:6 D5:2',
  'D5:4 Bb4:2 G4:2 D5:4 C5:2 Bb4:2',
  'C5:4 Eb5:2 Ab5:2 G5:4 F5:2 Eb5:2',
  'F5:8 D5:4 Bb4:4',
  'Eb5:4 G5:2 C6:2 Bb5:4 G5:2 Eb5:2',
  'F5:4 Ab5:2 C6:2 Bb5:4 Ab5:2 F5:2',
  'G5:4 F5:2 Eb5:2 D5:4 Bb4:4',
  'Eb5:12 -:4',
);

function broken(root: string, fifth: string, third: string): string {
  return repeat(`${root}:2 ${fifth}:2 ${third}:2 ${fifth}:2`, 2);
}

const CHORDS = bars(
  broken('Eb4', 'Bb4', 'G4'),
  broken('G4', 'D5', 'Bb4'),
  broken('Ab4', 'Eb5', 'C5'),
  broken('Bb4', 'F5', 'D5'),
  broken('C5', 'G5', 'Eb5'),
  broken('Ab4', 'Eb5', 'C5'),
  broken('Bb4', 'F5', 'D5'),
  broken('Eb4', 'Bb4', 'G4'),
);

const BASS_LINE = bars(
  glide('Eb3', 'Bb2'),
  glide('G2', 'D3'),
  glide('Ab2', 'Eb3'),
  glide('Bb2', 'F3'),
  glide('C3', 'G2'),
  glide('Ab2', 'Eb3'),
  glide('Bb2', 'F3'),
  glide('Eb3', 'Bb2'),
);

const GROOVE = 'k:4 h:2 h:2 s:4 h:2 h:2';

export const MENU_SONG: Song = {
  bpm: 104,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  channels: [
    { voice: LEAD_ROUND, track: MELODY },
    { voice: ARP, track: CHORDS },
    { voice: BASS, track: BASS_LINE },
    { voice: DRUMS, track: repeat(GROOVE, 8) },
  ],
};
