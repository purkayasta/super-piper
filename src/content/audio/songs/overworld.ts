import type { Song } from '../../../asset-pipeline/audio/sequencer';
import { BASS, DRUMS, LEAD, STAB } from '../instruments';
import { bars, bounce, offbeats } from '../phrases';

const MELODY = bars(
  'C5:2 F5:2 A5:3 G5:1 F5:2 C5:2 D5:2 F5:2',
  'A5:4 G5:2 F5:2 D5:4 -:2 C5:2',
  'D5:2 F5:2 Bb5:3 A5:1 G5:2 F5:2 D5:2 Bb4:2',
  'C5:3 D5:1 E5:2 G5:2 C6:6 -:2',
  'C5:2 F5:2 A5:3 G5:1 F5:2 A5:2 C6:2 A5:2',
  'D6:4 C6:2 A5:2 F5:4 -:2 D5:2',
  'Bb4:2 D5:2 F5:2 Bb5:2 A5:2 G5:2 E5:2 C5:2',
  'F5:8 -:4 C5:2 E5:2',
  'F5:3 F5:1 G5:2 A5:2 Bb5:4 A5:2 G5:2',
  'G5:3 G5:1 A5:2 Bb5:2 C6:4 Bb5:2 A5:2',
  'A5:2 E5:2 C5:2 E5:2 A5:3 G5:1 E5:4',
  'F5:2 D5:2 A4:2 D5:2 F5:3 E5:1 D5:4',
  'Bb4:2 D5:2 G5:4 F5:2 G5:2 Bb5:4',
  'C6:4 Bb5:2 A5:2 G5:4 E5:4',
  'A5:2 C6:2 F6:4 E6:2 D6:2 C6:4',
  'Bb5:2 A5:2 G5:2 E5:2 C5:4 -:4',
);

const HARMONY = bars(
  offbeats('A4', 'C5'),
  offbeats('A4', 'D5'),
  offbeats('Bb4', 'D5'),
  offbeats('G4', 'C5'),
  offbeats('A4', 'C5'),
  offbeats('A4', 'D5'),
  '-:2 Bb4:2 -:2 D5:2 -:2 G4:2 -:2 C5:2',
  offbeats('A4', 'C5'),
  offbeats('Bb4', 'D5'),
  offbeats('G4', 'C5'),
  offbeats('C5', 'E5'),
  offbeats('A4', 'D5'),
  offbeats('Bb4', 'D5'),
  offbeats('G4', 'C5'),
  offbeats('A4', 'C5'),
  offbeats('G4', 'E5'),
);

const BASS_LINE = bars(
  bounce('F2', 'C3', 'F3'),
  bounce('D2', 'A2', 'D3'),
  bounce('Bb2', 'F3', 'Bb3'),
  bounce('C3', 'G3', 'C4'),
  bounce('F2', 'C3', 'F3'),
  bounce('D2', 'A2', 'D3'),
  'Bb2:2 -:1 Bb2 F3:2 -:2 C3:2 -:1 C3 G3:2 C4:2',
  bounce('F2', 'C3', 'F3'),
  bounce('Bb2', 'F3', 'Bb3'),
  bounce('C3', 'G3', 'C4'),
  bounce('A2', 'E3', 'A3'),
  bounce('D3', 'A3', 'D4'),
  bounce('G2', 'D3', 'G3'),
  bounce('C3', 'G3', 'C4'),
  bounce('F2', 'C3', 'F3'),
  bounce('C3', 'G3', 'C4'),
);

const GROOVE = 'k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2';
const FILL = 'k:2 h:2 s:2 h:2 k:2 s s s s t:2';

const BEAT = bars(
  GROOVE,
  GROOVE,
  GROOVE,
  GROOVE,
  GROOVE,
  GROOVE,
  GROOVE,
  FILL,
  GROOVE,
  GROOVE,
  GROOVE,
  GROOVE,
  GROOVE,
  GROOVE,
  GROOVE,
  FILL,
);

export const OVERWORLD_SONG: Song = {
  bpm: 150,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  channels: [
    { voice: LEAD, track: MELODY },
    { voice: STAB, track: HARMONY },
    { voice: BASS, track: BASS_LINE },
    { voice: DRUMS, track: BEAT },
  ],
};
