import { repeat } from '../../../asset-pipeline/audio/notation';
import type { Song } from '../../../asset-pipeline/audio/sequencer';
import { BASS_SHORT, DRUMS, LEAD, STAB } from '../instruments';
import { bars, drive, offbeats } from '../phrases';

const MELODY = bars(
  'D5:2 -:1 D5:1 F5:2 A5:2 G5:2 F5:2 E5:2 F5:2',
  'D5:6 -:2 A4:2 C5:2 D5:2 E5:2',
  'F5:2 -:1 F5:1 Bb5:2 D6:2 C6:2 Bb5:2 A5:2 Bb5:2',
  'A5:6 -:2 E5:2 G5:2 A5:2 C#6:2',
  'D6:4 C6:2 A5:2 F5:4 E5:2 D5:2',
  'C#5:2 D5:2 E5:2 F5:2 G5:2 A5:2 Bb5:2 C#6:2',
  'D6:3 C6:1 Bb5:2 G5:2 Bb5:3 A5:1 G5:4',
  'A5:4 E5:4 C#5:4 A4:4',
);

const STABS = bars(
  offbeats('F4', 'A4'),
  offbeats('F4', 'A4'),
  offbeats('F4', 'Bb4'),
  offbeats('E4', 'A4'),
  offbeats('F4', 'A4'),
  offbeats('E4', 'G4'),
  offbeats('G4', 'Bb4'),
  offbeats('E4', 'C#5'),
);

const BASS_LINE = bars(
  drive('D2', 'D3'),
  drive('D2', 'D3'),
  drive('Bb1', 'Bb2'),
  drive('A1', 'A2'),
  drive('D2', 'D3'),
  drive('D2', 'D3'),
  drive('G1', 'G2'),
  drive('A1', 'A2'),
);

const GROOVE = 'k:2 s:2 k k s:2 k:2 s:2 k k s:2';

export const BOSS_SONG: Song = {
  bpm: 168,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  channels: [
    { voice: LEAD, track: MELODY },
    { voice: STAB, track: STABS },
    { voice: BASS_SHORT, track: BASS_LINE },
    { voice: DRUMS, track: repeat(GROOVE, 8) },
  ],
};
