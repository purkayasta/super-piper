const SHAKE_PATTERN: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 1],
  [0, -1],
  [1, 1],
  [-1, 0],
  [0, 1],
  [1, -1],
  [-1, -1],
];

export interface ShakeRules {
  readonly frameMs: number;
}

export class ScreenShake {
  private amplitude = 0;
  private durationMs = 0;
  private elapsedMs = 0;
  private x = 0;
  private y = 0;

  constructor(
    private readonly enabled: boolean,
    private readonly rules: ShakeRules,
  ) {}

  get active(): boolean {
    return this.elapsedMs < this.durationMs;
  }

  get offsetX(): number {
    return this.x;
  }

  get offsetY(): number {
    return this.y;
  }

  start(amplitudePx: number, durationMs: number): void {
    if (!this.enabled) return;
    if (this.currentAmplitude() >= amplitudePx) return;
    this.amplitude = amplitudePx;
    this.durationMs = durationMs;
    this.elapsedMs = 0;
    this.update();
  }

  step(deltaMs: number): void {
    if (!this.active) return;
    this.elapsedMs += deltaMs;
    this.update();
  }

  private currentAmplitude(): number {
    if (!this.active) return 0;
    return Math.ceil(this.amplitude * (1 - this.elapsedMs / this.durationMs));
  }

  private update(): void {
    const amplitude = this.currentAmplitude();
    if (amplitude === 0) {
      this.x = 0;
      this.y = 0;
      return;
    }
    const [dx, dy] =
      SHAKE_PATTERN[Math.floor(this.elapsedMs / this.rules.frameMs) % SHAKE_PATTERN.length];
    this.x = dx * amplitude;
    this.y = dy * amplitude;
  }
}
