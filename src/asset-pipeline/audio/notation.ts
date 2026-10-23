import { noteToMidi } from './notes';

export interface ParsedNote {
  readonly start: number;
  readonly length: number;
  readonly value: string;
}

export interface ParsedTrack {
  readonly notes: readonly ParsedNote[];
  readonly length: number;
}

const TOKEN_PATTERN = /^([A-G][#b]?-?\d|[a-z]+|-|~)(?::(\d+))?$/;
const PITCH_PATTERN = /^[A-G][#b]?-?\d$/;
const DRUM_PATTERN = /^[a-z]+$/;
const BAR_SEPARATOR = '|';
const REST = '-';
const TIE = '~';
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const SEMITONES_PER_OCTAVE = 12;

export function isPitch(value: string): boolean {
  return PITCH_PATTERN.test(value);
}

export function isDrum(value: string): boolean {
  return DRUM_PATTERN.test(value);
}

export function parseTrack(source: string): ParsedTrack {
  const notes: { start: number; length: number; value: string }[] = [];
  let position = 0;
  for (const token of tokens(source)) {
    const match = TOKEN_PATTERN.exec(token);
    if (match === null) throw new Error(`Bad token "${token}"`);
    const [, symbol, lengthText] = match;
    const length = lengthText === undefined ? 1 : Number(lengthText);
    if (length < 1) throw new Error(`Token "${token}" has no length`);
    if (symbol === TIE) {
      const previous = notes.at(-1);
      if (previous === undefined || previous.start + previous.length !== position) {
        throw new Error(`Tie "${token}" does not follow a note`);
      }
      previous.length += length;
    } else if (symbol !== REST) {
      if (isPitch(symbol)) noteToMidi(symbol);
      notes.push({ start: position, length, value: symbol });
    }
    position += length;
  }
  return { notes, length: position };
}

export function repeat(phrase: string, times: number): string {
  return Array.from({ length: times }, () => phrase).join(' ');
}

export function transpose(phrase: string, semitones: number): string {
  return tokens(phrase)
    .map((token) => {
      const [symbol, length] = token.split(':');
      if (!isPitch(symbol)) return token;
      const name = midiToNoteName(noteToMidi(symbol) + semitones);
      return length === undefined ? name : `${name}:${length}`;
    })
    .join(' ');
}

export function delayPhrase(phrase: string, steps: number): string {
  const kept = tokens(phrase);
  let trimmed = 0;
  while (trimmed < steps) {
    const last = kept.pop();
    const match = last === undefined ? null : TOKEN_PATTERN.exec(last);
    if (match === null || match[1] !== REST) {
      throw new Error(`Phrase needs ${steps} steps of trailing rest to delay`);
    }
    trimmed += match[2] === undefined ? 1 : Number(match[2]);
  }
  if (trimmed > steps) kept.push(`${REST}:${trimmed - steps}`);
  return [`${REST}:${steps}`, ...kept].join(' ');
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / SEMITONES_PER_OCTAVE) - 1;
  return `${SHARP_NAMES[((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE]}${octave}`;
}

function tokens(source: string): string[] {
  return source.split(/\s+/).filter((token) => token !== '' && token !== BAR_SEPARATOR);
}
