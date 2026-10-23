import { fadeOut, foldLoop, highPass, lowPass, normalizePeak } from './mixdown';
import { sequenceSong, type Sequence, type Song, type TimedTone } from './sequencer';
import { renderTone, toneSeconds } from './tone';

export const AUDIO_SAMPLE_RATE = 24000;

export const AUDIO_BIT_DEPTH = 12;

const SAMPLE_ROUNDING_EPSILON = 1e-9;

export const MASTERING = {
  highPassHz: 25,
  lowPassHz: 10000,
  musicPeak: 0.8,
  sfxEndFadeSeconds: 0.004,
} as const;

export function tonesEnd(tones: readonly TimedTone[]): number {
  let end = 0;
  for (const { at, tone } of tones) end = Math.max(end, at + toneSeconds(tone));
  return end;
}

export function mixTones(
  tones: readonly TimedTone[],
  seconds: number,
  sampleRate: number,
): Float32Array {
  const buffer = new Float32Array(Math.ceil(seconds * sampleRate - SAMPLE_ROUNDING_EPSILON));
  for (const { at, tone } of tones)
    renderTone(tone, sampleRate, buffer, Math.round(at * sampleRate));
  return buffer;
}

export function mixSequence(sequence: Sequence, loop: boolean, sampleRate: number): Float32Array {
  if (!loop) return mixTones(sequence.tones, tonesEnd(sequence.tones), sampleRate);
  const loopSamples = Math.round(sequence.seconds * sampleRate);
  const withTails = mixTones(
    sequence.tones,
    Math.max(sequence.seconds, tonesEnd(sequence.tones)),
    sampleRate,
  );
  return foldLoop(withTails, loopSamples);
}

export function renderSong(
  song: Song,
  sampleRate: number = AUDIO_SAMPLE_RATE,
  tempoScale = 1,
): Float32Array {
  const buffer = mixSequence(sequenceSong(song, tempoScale), song.loop, sampleRate);
  highPass(buffer, sampleRate, MASTERING.highPassHz, song.loop);
  lowPass(buffer, sampleRate, MASTERING.lowPassHz, song.loop);
  if (!song.loop) fadeOut(buffer, Math.round(MASTERING.sfxEndFadeSeconds * sampleRate));
  normalizePeak(buffer, MASTERING.musicPeak);
  return buffer;
}

export function renderSfx(
  tones: readonly TimedTone[],
  peak: number,
  sampleRate: number = AUDIO_SAMPLE_RATE,
): Float32Array {
  const buffer = mixTones(tones, tonesEnd(tones), sampleRate);
  highPass(buffer, sampleRate, MASTERING.highPassHz, false);
  lowPass(buffer, sampleRate, MASTERING.lowPassHz, false);
  fadeOut(buffer, Math.round(MASTERING.sfxEndFadeSeconds * sampleRate));
  normalizePeak(buffer, peak);
  return buffer;
}
