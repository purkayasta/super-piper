import type { EnemySpawn } from '../../world/level-format';

export class SpawnSchedule {
  private cursor = 0;

  constructor(private readonly spawns: readonly EnemySpawn[]) {}

  get remaining(): number {
    return this.spawns.length - this.cursor;
  }

  skipBefore(column: number): void {
    while (this.cursor < this.spawns.length && this.spawns[this.cursor].column < column) {
      this.cursor++;
    }
  }

  nextDue(lastAwakeColumn: number): EnemySpawn | null {
    if (this.cursor >= this.spawns.length) return null;
    const next = this.spawns[this.cursor];
    return next.column <= lastAwakeColumn ? next : null;
  }

  consume(): void {
    if (this.cursor < this.spawns.length) this.cursor++;
  }
}
