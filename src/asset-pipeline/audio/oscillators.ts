const TRIANGLE_STEPS = 32;
const TRIANGLE_LEVELS = 15;
const LFSR_SEED = 1;
const LFSR_TOP_BIT = 14;
const LONG_TAP = 1;
const SHORT_TAP = 6;

export function polyBlep(phase: number, phaseStep: number): number {
  if (phase < phaseStep) {
    const t = phase / phaseStep;
    return t + t - t * t - 1;
  }
  if (phase > 1 - phaseStep) {
    const t = (phase - 1) / phaseStep;
    return t * t + t + t + 1;
  }
  return 0;
}

export class PulseOscillator {
  private phase = 0;

  next(frequency: number, duty: number, sampleRate: number): number {
    const step = Math.min(0.5, frequency / sampleRate);
    const phase = this.phase;
    let value = phase < duty ? 1 : -1;
    value += polyBlep(phase, step);
    let fallPhase = phase - duty;
    if (fallPhase < 0) fallPhase += 1;
    value -= polyBlep(fallPhase, step);
    this.phase = phase + step;
    if (this.phase >= 1) this.phase -= 1;
    return value - (2 * duty - 1);
  }
}

export class TriangleOscillator {
  private phase = 0;

  next(frequency: number, sampleRate: number): number {
    const index = Math.floor(this.phase * TRIANGLE_STEPS);
    const level = index < TRIANGLE_STEPS / 2 ? TRIANGLE_LEVELS - index : index - TRIANGLE_STEPS / 2;
    this.phase += frequency / sampleRate;
    this.phase -= Math.floor(this.phase);
    return (level / TRIANGLE_LEVELS) * 2 - 1;
  }
}

export class NoiseGenerator {
  private register = LFSR_SEED;
  private clockPhase = 0;

  next(clockHz: number, sampleRate: number, shortMode: boolean): number {
    this.clockPhase += clockHz / sampleRate;
    const tap = shortMode ? SHORT_TAP : LONG_TAP;
    while (this.clockPhase >= 1) {
      this.clockPhase -= 1;
      const feedback = (this.register ^ (this.register >> tap)) & 1;
      this.register = (this.register >> 1) | (feedback << LFSR_TOP_BIT);
    }
    return this.register & 1 ? -1 : 1;
  }
}
