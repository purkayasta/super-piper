import { repeat } from '../../asset-pipeline/audio/notation';

export function bars(...phrases: readonly string[]): string {
  return phrases.join(' | ');
}

export function offbeats(first: string, second: string): string {
  return repeat(`-:2 ${first}:2 -:2 ${second}:2`, 2);
}

export function sixteenthStabs(first: string, second: string): string {
  return repeat(`-:2 ${first} ${second}`, 4);
}

export function pump(root: string, fifth: string, octave: string): string {
  return repeat(`${root}:2 ${fifth}:2 ${octave}:2 ${fifth}:2`, 2);
}

export function drive(root: string, octave: string): string {
  return repeat(`${root} ${root} ${octave} ${root}`, 4);
}

export function bounce(root: string, fifth: string, octave: string): string {
  return `${root}:2 -:1 ${root} ${fifth}:2 -:2 ${root}:2 -:1 ${root} ${fifth}:2 ${octave}:2`;
}

export function glide(root: string, fifth: string): string {
  return `${root}:6 ${root}:2 ${fifth}:6 ${root}:2`;
}

export function arpeggio16(notes: readonly [string, string, string, string]): string {
  return repeat(notes.join(' '), 4);
}

export function rest(steps: number): string {
  return `-:${steps}`;
}
