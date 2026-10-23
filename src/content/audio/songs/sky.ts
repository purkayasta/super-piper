import { repeat } from '../../../asset-pipeline/audio/notation';
import type { Song } from '../../../asset-pipeline/audio/sequencer';
import { ARP, BASS, DRUMS, LEAD } from '../instruments';
import { arpeggio16, bars, glide } from '../phrases';

const MELODY = bars(
  'F#5:6 A5:2 E5:4 D5:4',
  'E5:6 G#5:2 F#5:4 E5:2 B4:2',
  'D5:4 F#5:2 B5:2 A5:4 F#5:4',
  'G5:8 B4:2 D5:2 G5:2 A5:2',
  'A5:6 F#5:2 D6:4 C#6:2 A5:2',
  'B5:6 G#5:2 E5:4 F#5:2 G#5:2',
  'B5:4 A5:2 G5:2 D5:4 G5:4',
  'A5:4 E5:4 C#5:4 -:4',
);

const SHIMMER = bars(
  arpeggio16(['D4', 'A4', 'D5', 'F#5']),
  arpeggio16(['E4', 'B4', 'E5', 'G#5']),
  arpeggio16(['B3', 'F#4', 'B4', 'D5']),
  arpeggio16(['G3', 'D4', 'G4', 'B4']),
  arpeggio16(['D4', 'A4', 'D5', 'F#5']),
  arpeggio16(['E4', 'B4', 'E5', 'G#5']),
  arpeggio16(['G3', 'D4', 'G4', 'B4']),
  arpeggio16(['A3', 'E4', 'A4', 'C#5']),
);

const BASS_LINE = bars(
  glide('D3', 'A2'),
  glide('E3', 'B2'),
  glide('B2', 'F#2'),
  glide('G2', 'D3'),
  glide('D3', 'A2'),
  glide('E3', 'B2'),
  glide('G2', 'D3'),
  glide('A2', 'E3'),
);

const GROOVE = 'k:4 h:2 h:2 s:4 h:2 o:2';

export const SKY_SONG: Song = {
  bpm: 126,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  channels: [
    { voice: { ...LEAD, vibrato: { depth: 0.2, rate: 5, delay: 0.15 } }, track: MELODY },
    { voice: ARP, track: SHIMMER },
    { voice: BASS, track: BASS_LINE },
    { voice: DRUMS, track: repeat(GROOVE, 8) },
  ],
};
