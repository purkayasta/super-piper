import type { Song } from '../../../asset-pipeline/audio/sequencer';
import { BASS, DRUMS, FANFARE, LEAD_ROUND } from '../instruments';
import { bars } from '../phrases';

export const STAGE_CLEAR_SONG: Song = {
  bpm: 132,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: false,
  channels: [
    {
      voice: FANFARE,
      track: bars('G4:2 C5:2 E5:2 G5:2 E5:2 G5:2 C6:4', 'B5:2 D6:2 G6:4 C6:8'),
    },
    {
      voice: { ...FANFARE, duty: 0.25, volume: 0.18 },
      track: bars('E4:2 G4:2 C5:2 E5:2 C5:2 E5:2 G5:4', 'G5:2 B5:2 D6:4 E5:8'),
    },
    { voice: BASS, track: bars('C3:4 G2:4 C3:4 E3:4', 'G2:4 G3:4 C3:8') },
    { voice: DRUMS, track: bars('k:4 s:4 k:4 s:2 s:2', 'k:4 s:4 k:8') },
  ],
};

export const GAME_OVER_SONG: Song = {
  bpm: 84,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: false,
  channels: [
    { voice: LEAD_ROUND, track: bars('E5:3 D5:1 C5:4 B4:3 A4:1 G#4:4', 'A4:12 -:4') },
    {
      voice: { ...LEAD_ROUND, duty: 0.25, volume: 0.15 },
      track: bars('C5:4 A4:4 G#4:4 E4:4', 'C4:12 -:4'),
    },
    { voice: BASS, track: bars('A2:8 E2:8', 'A2:12 -:4') },
  ],
};
