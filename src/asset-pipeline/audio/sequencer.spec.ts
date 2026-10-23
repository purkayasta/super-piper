import { describe, expect, it } from 'vitest';
import { sequenceSong, stepSeconds, type DrumKit, type Instrument, type Song } from './sequencer';

const LEAD: Instrument = {
  kind: 'instrument',
  wave: 'pulse',
  duty: 0.25,
  volume: 0.4,
  envelope: { attack: 0, decay: 0.05, sustain: 0.6, release: 0.05 },
  gate: 0.5,
};

const KIT: DrumKit = {
  kind: 'drums',
  hits: {
    k: [
      {
        wave: 'noise',
        frequency: 2000,
        duration: 0.05,
        volume: 0.5,
        envelope: { attack: 0, decay: 0.05, sustain: 0, release: 0.01 },
      },
    ],
  },
};

function song(overrides: Partial<Song> = {}): Song {
  return {
    bpm: 120,
    stepsPerBeat: 4,
    stepsPerBar: 16,
    loop: true,
    channels: [
      { voice: LEAD, track: 'C5:2 E5:2 G5:4' },
      { voice: KIT, track: 'k:4 k:4' },
    ],
    ...overrides,
  };
}

describe('sequenceSong', () => {
  it('times steps from the tempo', () => {
    expect(stepSeconds(120, 4)).toBe(0.125);
    const sequence = sequenceSong(song());
    expect(sequence.steps).toBe(8);
    expect(sequence.seconds).toBe(1);
    const lead = sequence.tones.filter((timed) => timed.tone.wave === 'pulse');
    expect(lead.map((timed) => timed.at)).toEqual([0, 0.25, 0.5]);
  });

  it('holds each note for its gate fraction', () => {
    const lead = sequenceSong(song()).tones.filter((timed) => timed.tone.wave === 'pulse');
    expect(lead.map((timed) => timed.tone.duration)).toEqual([0.125, 0.125, 0.25]);
    expect(lead[0].tone.frequency).toBeCloseTo(523.25, 2);
    expect(lead[0].tone.duty).toBe(0.25);
  });

  it('cuts each note at the next one on its channel, wrapping when looping', () => {
    const lead = sequenceSong(song()).tones.filter((timed) => timed.tone.wave === 'pulse');
    expect(lead.map((timed) => timed.tone.cutoff)).toEqual([0.25, 0.25, 0.5]);
  });

  it('lets the last note ring out when not looping', () => {
    const lead = sequenceSong(song({ loop: false })).tones.filter(
      (timed) => timed.tone.wave === 'pulse',
    );
    expect(lead.at(-1)?.tone.cutoff).toBeUndefined();
  });

  it('plays drum hits from the kit', () => {
    const drums = sequenceSong(song()).tones.filter((timed) => timed.tone.wave === 'noise');
    expect(drums.map((timed) => timed.at)).toEqual([0, 0.5]);
    expect(drums[0].tone.cutoff).toBe(0.5);
  });

  it('scales the tempo for hurry variants', () => {
    const sequence = sequenceSong(song(), 1.25);
    expect(sequence.seconds).toBeCloseTo(0.8, 9);
    expect(sequence.tones.at(-1)?.at).toBeCloseTo(0.4, 9);
  });

  it('rejects channels of different lengths, unknown drums and drums on an instrument', () => {
    expect(() =>
      sequenceSong(
        song({
          channels: [
            { voice: LEAD, track: 'C5:4' },
            { voice: KIT, track: 'k' },
          ],
        }),
      ),
    ).toThrow(/expected 4/);
    expect(() => sequenceSong(song({ channels: [{ voice: KIT, track: 'x' }] }))).toThrow(/Unknown/);
    expect(() => sequenceSong(song({ channels: [{ voice: LEAD, track: 'k' }] }))).toThrow(/pitch/);
  });
});
