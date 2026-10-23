import { describe, expect, it } from 'vitest';
import { delayPhrase, midiToNoteName, parseTrack, repeat, transpose } from './notation';

describe('parseTrack', () => {
  it('reads notes with lengths in steps, defaulting to one', () => {
    const track = parseTrack('C5:2 E5 G5:4');
    expect(track.notes).toEqual([
      { start: 0, length: 2, value: 'C5' },
      { start: 2, length: 1, value: 'E5' },
      { start: 3, length: 4, value: 'G5' },
    ]);
    expect(track.length).toBe(7);
  });

  it('skips rests and bar lines', () => {
    const track = parseTrack('C4 -:3 | Bb3:2 - F#4');
    expect(track.notes.map((note) => [note.start, note.value])).toEqual([
      [0, 'C4'],
      [4, 'Bb3'],
      [7, 'F#4'],
    ]);
    expect(track.length).toBe(8);
  });

  it('extends the previous note with a tie, across bar lines', () => {
    const track = parseTrack('A4:4 | ~:4 B4');
    expect(track.notes[0]).toEqual({ start: 0, length: 8, value: 'A4' });
    expect(track.notes[1].start).toBe(8);
  });

  it('reads drum hits', () => {
    const track = parseTrack('k h s:2 h');
    expect(track.notes.map((note) => note.value)).toEqual(['k', 'h', 's', 'h']);
    expect(track.length).toBe(5);
  });

  it('rejects bad tokens, zero lengths and ties after rests', () => {
    expect(() => parseTrack('C5 X9')).toThrow();
    expect(() => parseTrack('C5:0')).toThrow();
    expect(() => parseTrack('C5 - ~')).toThrow();
    expect(() => parseTrack('~:2')).toThrow();
  });
});

describe('phrase helpers', () => {
  it('repeats a phrase', () => {
    expect(parseTrack(repeat('C4 D4:2', 3)).length).toBe(9);
  });

  it('transposes pitches and keeps lengths, rests and drums', () => {
    expect(transpose('C4:2 - E4 k Bb3:3', 2)).toBe('D4:2 - F#4 k C4:3');
    expect(transpose('B4', 1)).toBe('C5');
  });

  it('delays a phrase into its trailing rest, keeping its length', () => {
    const delayed = delayPhrase('C5:2 E5:2 | -:4', 3);
    expect(delayed).toBe('-:3 C5:2 E5:2 -:1');
    expect(parseTrack(delayed).length).toBe(8);
    expect(() => delayPhrase('C5:2 -:1', 3)).toThrow(/trailing rest/);
  });

  it('names MIDI notes with sharps', () => {
    expect(midiToNoteName(60)).toBe('C4');
    expect(midiToNoteName(70)).toBe('A#4');
    expect(midiToNoteName(11)).toBe('B-1');
  });
});
