import { describe, expect, it } from 'vitest';
import {
  CUTOFF_FADE_SECONDS,
  envelopeLevel,
  frequencyAt,
  renderTone,
  toneSeconds,
  type Envelope,
  type ToneSpec,
} from './tone';

const RATE = 32000;
const ENVELOPE: Envelope = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 };

function tone(overrides: Partial<ToneSpec> = {}): ToneSpec {
  return {
    wave: 'pulse',
    frequency: 440,
    duration: 0.3,
    volume: 0.5,
    envelope: ENVELOPE,
    ...overrides,
  };
}

describe('envelopeLevel', () => {
  it('ramps up, decays to the sustain level and holds it', () => {
    expect(envelopeLevel(ENVELOPE, 0, 1)).toBe(0);
    expect(envelopeLevel(ENVELOPE, 0.005, 1)).toBeCloseTo(0.5, 9);
    expect(envelopeLevel(ENVELOPE, 0.01, 1)).toBeCloseTo(1, 9);
    expect(envelopeLevel(ENVELOPE, 0.06, 1)).toBeCloseTo(0.75, 9);
    expect(envelopeLevel(ENVELOPE, 0.5, 1)).toBe(0.5);
  });

  it('releases from the level reached at the gate', () => {
    expect(envelopeLevel(ENVELOPE, 0.06, 0.06)).toBeCloseTo(0.75, 9);
    expect(envelopeLevel(ENVELOPE, 0.16, 0.06)).toBeCloseTo(0.375, 9);
    expect(envelopeLevel(ENVELOPE, 0.26, 0.06)).toBe(0);
  });

  it('never starts with a click, even with zero attack', () => {
    const instant: Envelope = { attack: 0, decay: 0, sustain: 1, release: 0 };
    expect(envelopeLevel(instant, 0, 1)).toBe(0);
    expect(envelopeLevel(instant, 0.002, 1)).toBe(1);
    expect(envelopeLevel(instant, 1.001, 1)).toBeCloseTo(2 / 3, 6);
  });
});

describe('frequencyAt', () => {
  it('glides exponentially to the end frequency', () => {
    const sweep = tone({ frequency: 200, endFrequency: 800, duration: 0.2 });
    expect(frequencyAt(sweep, 0)).toBe(200);
    expect(frequencyAt(sweep, 0.1)).toBeCloseTo(400, 6);
    expect(frequencyAt(sweep, 0.5)).toBeCloseTo(800, 6);
  });

  it('can glide faster than the note', () => {
    const sweep = tone({ frequency: 200, endFrequency: 100, glide: 0.05 });
    expect(frequencyAt(sweep, 0.05)).toBeCloseTo(100, 6);
    expect(frequencyAt(sweep, 0.2)).toBeCloseTo(100, 6);
  });

  it('steps through an arpeggio and wraps', () => {
    const arp = tone({ frequency: 220, arpeggio: { semitones: [0, 12, 7], step: 0.05 } });
    expect(frequencyAt(arp, 0.01)).toBeCloseTo(220, 6);
    expect(frequencyAt(arp, 0.06)).toBeCloseTo(440, 6);
    expect(frequencyAt(arp, 0.11)).toBeCloseTo(220 * 2 ** (7 / 12), 6);
    expect(frequencyAt(arp, 0.16)).toBeCloseTo(220, 6);
  });

  it('adds vibrato only after its delay', () => {
    const vibrato = tone({ vibrato: { depth: 0.5, rate: 5, delay: 0.1 } });
    expect(frequencyAt(vibrato, 0.05)).toBe(440);
    expect(frequencyAt(vibrato, 0.15)).toBeCloseTo(440 * 2 ** (0.5 / 12), 6);
  });
});

describe('renderTone', () => {
  it('lasts the gate plus the release, or until its cutoff', () => {
    expect(toneSeconds(tone())).toBeCloseTo(0.5, 9);
    expect(toneSeconds(tone({ cutoff: 0.25 }))).toBe(0.25);
  });

  it('adds into the buffer at the start index and ends silent', () => {
    const out = new Float32Array(RATE).fill(0.25);
    renderTone(tone(), RATE, out, 1000);
    expect(out[999]).toBe(0.25);
    expect(out[1000]).toBe(0.25);
    expect(Math.max(...out.subarray(1000, 17000))).toBeGreaterThan(0.6);
    expect(out[1000 + Math.ceil(0.5 * RATE)]).toBe(0.25);
  });

  it('fades out quickly at its cutoff', () => {
    const out = new Float32Array(RATE);
    const cutoff = 0.1;
    renderTone(tone({ cutoff, wave: 'triangle' }), RATE, out, 0);
    const fadeStart = Math.floor((cutoff - CUTOFF_FADE_SECONDS) * RATE);
    expect(Math.abs(out[fadeStart - 10])).toBeGreaterThan(0);
    expect(out.subarray(Math.ceil(cutoff * RATE)).every((value) => value === 0)).toBe(true);
  });

  it('clips a tone that runs past the buffer end', () => {
    const out = new Float32Array(100);
    renderTone(tone({ wave: 'noise', frequency: 8000 }), RATE, out, 50);
    expect(out.length).toBe(100);
    expect(out.subarray(0, 50).every((value) => value === 0)).toBe(true);
  });

  it('scales by volume and gain', () => {
    const loud = new Float32Array(2000);
    const quiet = new Float32Array(2000);
    renderTone(tone({ wave: 'triangle' }), RATE, loud, 0);
    renderTone(tone({ wave: 'triangle' }), RATE, quiet, 0, 0.5);
    expect(quiet[1500]).toBeCloseTo(loud[1500] / 2, 6);
  });
});
