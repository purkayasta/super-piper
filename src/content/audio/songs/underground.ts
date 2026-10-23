import { delayPhrase, repeat } from '../../../asset-pipeline/audio/notation';
import type { Song } from '../../../asset-pipeline/audio/sequencer';
import { BASS_SHORT, DRUMS, ECHO, PLUCK } from '../instruments';
import { bars, pump } from '../phrases';

const MELODY = bars(
  '-:4 A4:2 C5:2 D5:4 -:4',
  'F5:3 E5:1 D5:2 C5:2 A4:4 -:4',
  '-:4 Bb4:2 D5:2 F5:4 -:2 E5:2',
  'E5:4 C5:2 G4:2 C5:4 -:4',
  '-:4 A4:2 C5:2 D5:2 F5:2 A5:4',
  'G5:3 F5:1 E5:2 D5:2 C5:2 D5:2 -:4',
  '-:2 G4:2 Bb4:2 D5:2 G5:4 F5:2 D5:2',
  'E5:4 C#5:4 A4:4 -:4',
);

const BASS_LINE = bars(
  pump('D2', 'A2', 'D3'),
  pump('D2', 'A2', 'D3'),
  pump('Bb1', 'F2', 'Bb2'),
  pump('C2', 'G2', 'C3'),
  pump('D2', 'A2', 'D3'),
  pump('D2', 'A2', 'D3'),
  pump('G1', 'D2', 'G2'),
  pump('A1', 'E2', 'A2'),
);

const GROOVE = 'k:4 h:4 s:4 h:2 h:2';

export const UNDERGROUND_SONG: Song = {
  bpm: 112,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  channels: [
    { voice: PLUCK, track: MELODY },
    { voice: ECHO, track: delayPhrase(MELODY, 3) },
    { voice: { ...BASS_SHORT, volume: 0.6 }, track: BASS_LINE },
    { voice: DRUMS, track: repeat(GROOVE, 8) },
  ],
};
