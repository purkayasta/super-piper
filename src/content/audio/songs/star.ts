import type { Song } from '../../../asset-pipeline/audio/sequencer';
import { ARP, BASS_SHORT, DRUMS, LEAD } from '../instruments';
import { bars } from '../phrases';

const SPARKLE = bars(
  'G5 B5 D6 G6 D6 B5 G5 B5 G5 B5 D6 G6 B6 G6 D6 B5',
  'F#5 A5 D6 F#6 D6 A5 F#5 A5 F#5 A5 D6 F#6 A6 F#6 D6 A5',
  'E5 G5 B5 E6 B5 G5 E5 G5 E5 G5 B5 E6 G6 E6 B5 G5',
  'C6 E6 G6 E6 C6 G5 E5 G5 D6 F#6 A6 F#6 D6 A5 F#5 A5',
);

const HOOK = bars(
  'B5:3 B5:1 D6:4 G6:6 -:2',
  'F#6:4 E6:2 D6:2 A5:8',
  'G5:3 G5:1 B5:4 E6:6 -:2',
  'E6:4 D6:4 F#6:4 A6:4',
);

const BASS_LINE = bars(
  'G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2',
  'D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2',
  'E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2',
  'C3:2 C4:2 C3:2 C4:2 D3:2 D4:2 D3:2 D4:2',
);

const GROOVE = 'k:2 h h s:2 h:2 k k h:2 s:2 h:2';

export const STAR_SONG: Song = {
  bpm: 176,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  channels: [
    { voice: { ...LEAD, volume: 0.27 }, track: HOOK },
    { voice: { ...ARP, volume: 0.14 }, track: SPARKLE },
    { voice: BASS_SHORT, track: BASS_LINE },
    { voice: DRUMS, track: bars(GROOVE, GROOVE, GROOVE, GROOVE) },
  ],
};
