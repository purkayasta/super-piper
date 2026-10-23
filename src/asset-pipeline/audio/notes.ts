const NOTE_PATTERN = /^([A-G])([#b]?)(-?\d)$/;
const SEMITONE_OF: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const A4_MIDI = 69;
const A4_HZ = 440;
const SEMITONES_PER_OCTAVE = 12;

export function noteToMidi(name: string): number {
  const match = NOTE_PATTERN.exec(name);
  if (match === null) throw new Error(`Bad note name "${name}"`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return (Number(octave) + 1) * SEMITONES_PER_OCTAVE + SEMITONE_OF[letter] + shift;
}

export function midiToFrequency(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

export function noteFrequency(name: string): number {
  return midiToFrequency(noteToMidi(name));
}
