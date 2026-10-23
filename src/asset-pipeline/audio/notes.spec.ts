import { describe, expect, it } from 'vitest';
import { midiToFrequency, noteToMidi } from './notes';

describe('notes', () => {
  it('parses naturals, sharps and flats with octaves', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('F#5')).toBe(78);
    expect(noteToMidi('Bb3')).toBe(58);
    expect(noteToMidi('C-1')).toBe(0);
  });

  it('rejects malformed names', () => {
    expect(() => noteToMidi('H4')).toThrow();
    expect(() => noteToMidi('C')).toThrow();
    expect(() => noteToMidi('C##4')).toThrow();
  });

  it('tunes MIDI 69 to 440 Hz with equal temperament', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(81)).toBeCloseTo(880, 9);
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3);
  });
});
