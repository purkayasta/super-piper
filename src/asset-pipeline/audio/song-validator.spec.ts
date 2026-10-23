import { describe, expect, it } from 'vitest';
import type { DrumKit, Instrument, Song } from './sequencer';
import { validateSong } from './song-validator';

const PULSE: Instrument = {
  kind: 'instrument',
  wave: 'pulse',
  volume: 0.3,
  envelope: { attack: 0, decay: 0, sustain: 1, release: 0.05 },
  gate: 0.8,
};
const TRIANGLE: Instrument = { ...PULSE, wave: 'triangle' };
const KIT: DrumKit = { kind: 'drums', hits: { k: [] } };

function song(channels: Song['channels']): Song {
  return { bpm: 120, stepsPerBeat: 4, stepsPerBar: 4, loop: true, channels };
}

describe('validateSong', () => {
  it('accepts a well-formed four-channel song', () => {
    expect(
      validateSong(
        song([
          { voice: PULSE, track: 'C5:2 E5:2' },
          { voice: PULSE, track: 'G4:4' },
          { voice: TRIANGLE, track: 'C2:4' },
          { voice: KIT, track: 'k:2 k:2' },
        ]),
      ),
    ).toEqual([]);
  });

  it('enforces the 4-channel chip: two pulses, one triangle, one drum channel', () => {
    const problems = validateSong(
      song([
        { voice: PULSE, track: 'C5:4' },
        { voice: PULSE, track: 'C5:4' },
        { voice: PULSE, track: 'C5:4' },
        { voice: TRIANGLE, track: 'C3:4' },
        { voice: KIT, track: 'k:4' },
      ]),
    );
    expect(problems.join('\n')).toMatch(/5 channels/);
    expect(problems.join('\n')).toMatch(/two pulse/);
  });

  it('reports partial bars, unequal channels, bad tokens, unknown drums and out-of-range notes', () => {
    const problems = validateSong(
      song([
        { voice: PULSE, track: 'C5:3' },
        { voice: TRIANGLE, track: 'C7:4' },
        { voice: KIT, track: 'x:4' },
        { voice: PULSE, track: 'Q5:4' },
      ]),
    ).join('\n');
    expect(problems).toMatch(/3 steps, not whole bars/);
    expect(problems).toMatch(/lengths differ/);
    expect(problems).toMatch(/C7 is outside/);
    expect(problems).toMatch(/unknown drum "x"/);
    expect(problems).toMatch(/Bad token "Q5:4"/);
  });
});
