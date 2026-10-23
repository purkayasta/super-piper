const FREE = -1;

export class VoicePool {
  private readonly owners: (string | null)[];
  private readonly startedAt: number[];
  private readonly endsAt: number[];
  private lastClaimStole = false;

  constructor(readonly capacity: number) {
    this.owners = new Array<string | null>(capacity).fill(null);
    this.startedAt = new Array<number>(capacity).fill(0);
    this.endsAt = new Array<number>(capacity).fill(FREE);
  }

  get stole(): boolean {
    return this.lastClaimStole;
  }

  activeCount(sound: string, now: number): number {
    let count = 0;
    for (let slot = 0; slot < this.capacity; slot++) {
      if (this.owners[slot] === sound && this.endsAt[slot] > now) count++;
    }
    return count;
  }

  claim(sound: string, limit: number, now: number, duration: number): number {
    const slot =
      this.activeCount(sound, now) >= limit
        ? this.oldest(sound, now)
        : (this.firstFree(now) ?? this.oldest(null, now));
    this.lastClaimStole = this.endsAt[slot] > now;
    this.owners[slot] = sound;
    this.startedAt[slot] = now;
    this.endsAt[slot] = now + duration;
    return slot;
  }

  release(slot: number): void {
    this.owners[slot] = null;
    this.endsAt[slot] = FREE;
  }

  releaseAll(): void {
    for (let slot = 0; slot < this.capacity; slot++) this.release(slot);
  }

  private firstFree(now: number): number | null {
    for (let slot = 0; slot < this.capacity; slot++) if (this.endsAt[slot] <= now) return slot;
    return null;
  }

  private oldest(sound: string | null, now: number): number {
    let oldest = 0;
    let oldestStart = Infinity;
    for (let slot = 0; slot < this.capacity; slot++) {
      if (this.endsAt[slot] <= now) continue;
      if (sound !== null && this.owners[slot] !== sound) continue;
      if (this.startedAt[slot] < oldestStart) {
        oldestStart = this.startedAt[slot];
        oldest = slot;
      }
    }
    return oldest;
  }
}
