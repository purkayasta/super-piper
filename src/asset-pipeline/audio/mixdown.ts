const PCM16_BITS = 16;

export function foldLoop(buffer: Float32Array, loopSamples: number): Float32Array {
  const folded = new Float32Array(loopSamples);
  for (let i = 0; i < buffer.length; i++) folded[i % loopSamples] += buffer[i];
  return folded;
}

export function highPass(
  buffer: Float32Array,
  sampleRate: number,
  cutoffHz: number,
  circular: boolean,
): void {
  const pole = Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
  let previousInput = circular ? buffer[buffer.length - 1] : 0;
  let previousOutput = 0;
  if (circular) {
    for (let i = 0; i < buffer.length; i++) {
      previousOutput = buffer[i] - previousInput + pole * previousOutput;
      previousInput = buffer[i];
    }
  }
  for (let i = 0; i < buffer.length; i++) {
    const input = buffer[i];
    previousOutput = input - previousInput + pole * previousOutput;
    previousInput = input;
    buffer[i] = previousOutput;
  }
}

export function lowPass(
  buffer: Float32Array,
  sampleRate: number,
  cutoffHz: number,
  circular: boolean,
): void {
  const coefficient = 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
  let state = 0;
  if (circular) {
    for (let i = 0; i < buffer.length; i++) state += coefficient * (buffer[i] - state);
  }
  for (let i = 0; i < buffer.length; i++) {
    state += coefficient * (buffer[i] - state);
    buffer[i] = state;
  }
}

export function peakOf(buffer: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) peak = Math.max(peak, Math.abs(buffer[i]));
  return peak;
}

export function normalizePeak(buffer: Float32Array, target: number): number {
  const peak = peakOf(buffer);
  if (peak === 0) return 1;
  const gain = target / peak;
  for (let i = 0; i < buffer.length; i++) buffer[i] *= gain;
  return gain;
}

export function fadeOut(buffer: Float32Array, samples: number): void {
  const count = Math.min(samples, buffer.length);
  for (let i = 0; i < count; i++) buffer[buffer.length - 1 - i] *= i / count;
}

export function toPcm16(buffer: Float32Array, bits: number = PCM16_BITS): Int16Array {
  const scale = 2 ** (bits - 1) - 1;
  const step = 2 ** (PCM16_BITS - bits);
  const pcm = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    pcm[i] = Math.round(Math.max(-1, Math.min(1, buffer[i])) * scale) * step;
  }
  return pcm;
}
