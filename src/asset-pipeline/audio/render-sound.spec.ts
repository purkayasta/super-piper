import { describe, expect, it } from 'vitest';
import { peakOf } from './mixdown';
import { MASTERING, mixSequence, renderSfx, renderSong, tonesEnd } from './render-sound';
import { sequenceSong, type Instrument, type Song } from './sequencer';

const RATE = 8000;

const PAD: Instrument = {
  kind: 'instrument',
  wave: 'triangle',
  volume: 0.5,
  envelope: { attack: 0.01, decay: 0, sustain: 1, release: 0.4 },
  gate: 1,
};

function loopSong(track: string): Song {
  return {
    bpm: 120,
    stepsPerBeat: 4,
    stepsPerBar: 16,
    loop: true,
    channels: [{ voice: PAD, track }],
  };
}

describe('renderSong', () => {
  it("folds a looping song's tail so its end flows into its start", () => {
    const once = mixSequence(sequenceSong(loopSong('- C4:7 | -:3 G3:5')), true, RATE);
    const twice = mixSequence(
      sequenceSong({ ...loopSong('- C4:7 -:3 G3:5 - C4:7 -:3 G3:5'), loop: false }),
      false,
      RATE,
    );
    const loopSamples = once.length;
    expect(loopSamples).toBe(RATE * 2);
    for (let i = 0; i < loopSamples; i += 37) {
      expect(once[i]).toBeCloseTo(twice[loopSamples + i], 5);
    }
  });

  it('renders a loop exactly one loop long, normalised', () => {
    const buffer = renderSong(loopSong('C4:8 E4:8'), RATE);
    expect(buffer.length).toBe(RATE * 2);
    expect(peakOf(buffer)).toBeCloseTo(MASTERING.musicPeak, 5);
  });

  it('lets a one-shot song ring out and end in silence', () => {
    const buffer = renderSong({ ...loopSong('C4:8 E4:8'), loop: false }, RATE);
    expect(buffer.length).toBe(Math.ceil((2 + 0.4) * RATE));
    expect(buffer.at(-1)).toBeCloseTo(0, 9);
  });

  it('speeds up for a hurry variant', () => {
    expect(renderSong(loopSong('C4:8 E4:8'), RATE, 1.25).length).toBe(Math.round(1.6 * RATE));
  });
});

describe('renderSfx', () => {
  it('starts and ends silent at the requested peak', () => {
    const tones = [
      {
        at: 0,
        tone: {
          wave: 'pulse' as const,
          frequency: 600,
          endFrequency: 1200,
          duration: 0.1,
          volume: 1,
          envelope: { attack: 0, decay: 0.05, sustain: 0.4, release: 0.05 },
        },
      },
      {
        at: 0.05,
        tone: {
          wave: 'noise' as const,
          frequency: 9000,
          duration: 0.05,
          volume: 0.5,
          envelope: { attack: 0, decay: 0, sustain: 1, release: 0.02 },
        },
      },
    ];
    const buffer = renderSfx(tones, 0.7, RATE);
    expect(tonesEnd(tones)).toBeCloseTo(0.15, 9);
    expect(buffer.length).toBe(Math.ceil(0.15 * RATE));
    expect(buffer[0]).toBeCloseTo(0, 9);
    expect(buffer.at(-1)).toBeCloseTo(0, 9);
    expect(peakOf(buffer)).toBeCloseTo(0.7, 5);
  });
});
