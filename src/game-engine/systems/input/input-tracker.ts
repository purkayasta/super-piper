export class InputTracker {
  private readonly keys = new Set<string>();

  readonly pressed: ReadonlySet<string> = this.keys;

  keyDown(code: string): void {
    this.keys.add(code);
  }

  keyUp(code: string): void {
    this.keys.delete(code);
  }

  releaseAll(): void {
    this.keys.clear();
  }
}
