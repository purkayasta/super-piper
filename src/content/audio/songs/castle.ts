import { repeat } from '../../../asset-pipeline/audio/notation';
import type { Song } from '../../../asset-pipeline/audio/sequencer';
import { BASS_SHORT, DRUMS, LEAD_ROUND, STAB } from '../instruments';
import { bars, sixteenthStabs } from '../phrases';

const MELODY = bars(
  'B4:8 C5:4 B4:4',
  'A4:8 G4:4 F4:4',
  'E4:4 G4:4 B4:4 E5:4',
  'F#5:8 E5:4 D5:4',
  'E5:8 C5:4 G4:4',
  'F#4:4 A4:4 B4:4 D#5:4',
  'E5:6 D5:2 C5:4 B4:4',
  'A4:4 G4:4 F#4:4 D#4:4',
);

const TENSION = bars(
  sixteenthStabs('G4', 'B4'),
  sixteenthStabs('A4', 'C5'),
  sixteenthStabs('G4', 'B4'),
  sixteenthStabs('F#4', 'A4'),
  sixteenthStabs('E4', 'G4'),
  sixteenthStabs('D#4', 'F#4'),
  sixteenthStabs('G4', 'B4'),
  sixteenthStabs('D#4', 'A4'),
);

function ostinato(root: string, octave: string): string {
  return repeat(`${root}:2 ${root}:2 ${octave}:2 ${root}:2`, 2);
}

const BASS_LINE = bars(
  ostinato('E2', 'E3'),
  ostinato('F2', 'F3'),
  ostinato('E2', 'E3'),
  ostinato('D2', 'D3'),
  ostinato('C2', 'C3'),
  ostinato('B1', 'B2'),
  ostinato('E2', 'E3'),
  ostinato('B1', 'B2'),
);

const GROOVE = 't:2 h:2 s:2 h:2 t:2 t:2 s:2 h:2';

export const CASTLE_SONG: Song = {
  bpm: 132,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  channels: [
    { voice: { ...LEAD_ROUND, volume: 0.26 }, track: MELODY },
    { voice: { ...STAB, volume: 0.12 }, track: TENSION },
    { voice: BASS_SHORT, track: BASS_LINE },
    { voice: DRUMS, track: repeat(GROOVE, 8) },
  ],
};
