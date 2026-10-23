import { describe, expect, it } from 'vitest';
import { ROOK_KING, ROOK_STONE } from '../../configuration/boss.config';
import { RookKing, type RookKingEvents, type RookMode, type RookWorld } from './rook-king';
import { RookStone, stoneLaunch } from './rook-stone';

const TILE = 16;
const FLOOR_ROW = 13;
const GATE_COLUMN = 26;
const DT = 1 / 120;

const WORLD: RookWorld = {
  isSolid: (column, row) => row >= FLOOR_ROW || column === GATE_COLUMN,
  tileSize: TILE,
  levelHeightPx: 240,
};

interface Recorder extends RookKingEvents {
  readonly log: string[];
}

function recorder(): Recorder {
  const log: string[] = [];
  return { log, landed: () => log.push('landed'), throwStone: () => log.push('throw') };
}

function kingInArena(): RookKing {
  const king = new RookKing(ROOK_KING);
  king.place(320, FLOOR_ROW * TILE, 0, GATE_COLUMN * TILE);
  return king;
}

function runUntil(
  king: RookKing,
  events: Recorder,
  done: (king: RookKing) => boolean,
  pipX = 100,
  maxSeconds = 10,
): number {
  for (let i = 0; i < maxSeconds / DT; i++) {
    if (done(king)) return i * DT;
    king.step(DT, WORLD, pipX, events);
  }
  throw new Error(`king never reached the condition (mode ${king.mode})`);
}

function modesOver(king: RookKing, events: Recorder, seconds: number): RookMode[] {
  const modes: RookMode[] = [];
  for (let i = 0; i < seconds / DT; i++) {
    king.step(DT, WORLD, 100, events);
    if (modes.at(-1) !== king.mode) modes.push(king.mode);
  }
  return modes;
}

describe('RookKing', () => {
  it('waits, harmless, until the fight wakes him', () => {
    const king = kingInArena();
    const events = recorder();
    for (let i = 0; i < 240; i++) king.step(DT, WORLD, 100, events);
    expect(king.mode).toBe('dormant');
    expect(king.harmful).toBe(false);
    king.wake();
    expect(king.mode).toBe('intro');
    expect(king.harmful).toBe(false);
  });

  it('loops pace, hop, pace, throw, pace, throw, pace, hop with a telegraph before each attack', () => {
    const king = kingInArena();
    const events = recorder();
    king.wake();
    const modes = modesOver(king, events, 9);
    expect(modes.slice(0, 12)).toEqual([
      'intro',
      'pace',
      'crouch',
      'hop',
      'pace',
      'windup',
      'throw',
      'pace',
      'windup',
      'throw',
      'pace',
      'crouch',
    ]);
    expect(events.log.slice(0, 3)).toEqual(['landed', 'throw', 'throw']);
  });

  it('crouches for the full telegraph before leaving the ground', () => {
    const king = kingInArena();
    const events = recorder();
    king.wake();
    runUntil(king, events, (k) => k.mode === 'crouch');
    const groundY = king.body.y;
    const crouchSeconds = runUntil(king, events, (k) => k.mode === 'hop');
    expect(crouchSeconds * 1000).toBeGreaterThanOrEqual(ROOK_KING.hopCrouchMs - 1);
    expect(king.body.y).toBe(groundY);
    expect(king.telegraphing).toBe(false);
  });

  it('winds up visibly before every throw', () => {
    const king = kingInArena();
    const events = recorder();
    king.wake();
    runUntil(king, events, (k) => k.mode === 'windup');
    expect(king.telegraphing).toBe(true);
    const windupSeconds = runUntil(king, events, () => events.log.includes('throw'));
    expect(windupSeconds * 1000).toBeGreaterThanOrEqual(ROOK_KING.throwWindupMs - 1);
  });

  it('hops toward Pip and lands back on the floor', () => {
    const king = kingInArena();
    const events = recorder();
    king.wake();
    const startX = king.centerX;
    runUntil(king, events, () => events.log.includes('landed'), 100);
    expect(king.centerX).toBeLessThan(startX);
    expect(king.body.y + king.body.height).toBe(FLOOR_ROW * TILE);
  });

  it('flinches away from a hit and cannot be hurt again until it ends', () => {
    const king = kingInArena();
    const events = recorder();
    king.wake();
    runUntil(king, events, (k) => k.mode === 'pace');
    expect(king.damage(ROOK_KING.stompDamage, king.centerX - 8)).toBe('hurt');
    expect(king.health).toBe(ROOK_KING.health - ROOK_KING.stompDamage);
    expect(king.harmful).toBe(false);
    expect(king.damage(ROOK_KING.stompDamage, king.centerX - 8)).toBe('ignored');
    const before = king.centerX;
    king.step(DT, WORLD, 100, events);
    expect(king.centerX).toBeGreaterThan(before);
    runUntil(king, events, (k) => k.mode === 'pace');
    expect(king.harmful).toBe(true);
  });

  it('gets quicker and throws twice once he is at half health', () => {
    const king = kingInArena();
    const events = recorder();
    king.wake();
    runUntil(king, events, (k) => k.mode === 'pace');
    king.damage(4, 0);
    expect(king.angry).toBe(true);
    runUntil(king, events, (k) => k.mode === 'windup');
    const windup = runUntil(king, events, () => events.log.includes('throw'));
    expect(windup * 1000).toBeLessThan(ROOK_KING.throwWindupMs);
    runUntil(king, events, (k) => k.mode === 'pace');
    expect(events.log.filter((entry) => entry === 'throw')).toHaveLength(2);
  });

  it('falls out of the castle after the last hit', () => {
    const king = kingInArena();
    const events = recorder();
    king.wake();
    runUntil(king, events, (k) => k.mode === 'pace');
    king.health = ROOK_KING.stompDamage;
    expect(king.damage(ROOK_KING.stompDamage, 0)).toBe('defeated');
    expect(king.present).toBe(false);
    runUntil(king, events, (k) => k.mode === 'falling');
    runUntil(king, events, (k) => k.mode === 'gone');
  });

  it('never leaves the arena', () => {
    const king = kingInArena();
    const events = recorder();
    king.wake();
    for (let i = 0; i < 20 / DT; i++) {
      king.step(DT, WORLD, i % 2400 < 1200 ? 0 : 1000, events);
      expect(king.body.x).toBeGreaterThanOrEqual(0);
      expect(king.body.x + king.body.width).toBeLessThanOrEqual(GATE_COLUMN * TILE);
    }
  });
});

describe('RookStone', () => {
  it('arcs to land where Pip stood, with a capped speed', () => {
    const { vx, vy } = stoneLaunch(300, 228, ROOK_STONE);
    expect(vx).toBeCloseTo(-80, 9);
    expect(vy).toBeLessThan(0);
    expect(stoneLaunch(300, -1000, ROOK_STONE).vx).toBe(-ROOK_STONE.maxSpeedX);
  });

  it('bursts when it reaches the floor', () => {
    const stone = new RookStone(ROOK_STONE);
    stone.launch(300, 180, 228);
    let outcome = stone.step(DT, WORLD);
    for (let i = 0; i < 600 && outcome === 'flying'; i++) outcome = stone.step(DT, WORLD);
    expect(outcome).toBe('burst');
    expect(stone.body.x + stone.body.width / 2).toBeLessThan(300);
  });
});
