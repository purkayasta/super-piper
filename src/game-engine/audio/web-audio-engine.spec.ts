import { describe, expect, it, vi } from 'vitest';
import type { SoundId } from '../../content/audio/sound-ids';
import { DEFAULT_VOLUMES } from './volume';
import { WebAudioEngine, musicToRelease, type AudioEnvironment } from './web-audio-engine';

const BUFFER_SECONDS = 2;

class FakeParam {
  value = 1;
  readonly targets: number[] = [];
  setTargetAtTime(value: number): void {
    this.targets.push(value);
  }
  setValueAtTime(value: number): void {
    this.value = value;
    this.targets.push(value);
  }
  cancelScheduledValues(): void {}
}

class FakeNode {
  connect(): void {}
  disconnect(): void {}
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}

class FakeSource extends FakeNode {
  buffer: { duration: number } | null = null;
  loop = false;
  onended: (() => void) | null = null;
  startedWith: [number, number | undefined] | null = null;
  stoppedAt: number | null = null;
  start(when = 0, offset?: number): void {
    this.startedWith = [when, offset];
  }
  stop(when = 0): void {
    this.stoppedAt = when;
  }
}

class FakeContext {
  state: AudioContextState = 'suspended';
  currentTime = 0;
  readonly sampleRate = 48000;
  readonly destination = new FakeNode();
  onstatechange: (() => void) | null = null;
  readonly sources: FakeSource[] = [];
  readonly gains: FakeGain[] = [];
  decodes = 0;

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createBufferSource(): FakeSource {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createBuffer(): { duration: number } {
    return { duration: 0 };
  }
  decodeAudioData(): Promise<{ duration: number }> {
    this.decodes++;
    return Promise.resolve({ duration: BUFFER_SECONDS });
  }
  resume(): Promise<void> {
    this.setState('running');
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.setState('suspended');
    return Promise.resolve();
  }
  close(): Promise<void> {
    this.setState('closed');
    return Promise.resolve();
  }
  playedBuffers(): FakeSource[] {
    return this.sources.filter((source) => source.buffer !== null && source.buffer.duration > 0);
  }
  private setState(state: AudioContextState): void {
    this.state = state;
    this.onstatechange?.();
  }
}

class FakeEvents {
  private readonly listeners = new Map<string, Set<() => void>>();
  hidden = false;
  addEventListener(type: string, listener: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }
  dispatch(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }
  count(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

interface Rig {
  engine: WebAudioEngine;
  context: FakeContext;
  gestures: FakeEvents;
  visibility: FakeEvents;
  contextsCreated: () => number;
  fetched: string[];
}

function rig(activated = false): Rig {
  const context = new FakeContext();
  const gestures = new FakeEvents();
  const visibility = new FakeEvents();
  const fetched: string[] = [];
  let created = 0;
  const environment: AudioEnvironment = {
    createContext: () => {
      created++;
      return context as unknown as AudioContext;
    },
    fetchBytes: (path) => {
      fetched.push(path);
      return Promise.resolve(new ArrayBuffer(8));
    },
    soundPath: (id) => `audio/${id}.flac`,
    hasUserActivation: () => activated,
    gestures,
    visibility,
  };
  const engine = new WebAudioEngine(environment);
  return { engine, context, gestures, visibility, contextsCreated: () => created, fetched };
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function unlockedRig(ids: readonly SoundId[]): Promise<Rig> {
  const setup = rig(true);
  await setup.context.resume();
  setup.engine.prepare(ids);
  await settle();
  return setup;
}

describe('WebAudioEngine unlock', () => {
  it('creates no context before a user gesture, but starts fetching', async () => {
    const { engine, contextsCreated, fetched, context } = rig();
    engine.prepare(['music.menu', 'sfx.coin']);
    engine.playMusic('music.menu');
    engine.playSfx('sfx.coin');
    await settle();
    expect(contextsCreated()).toBe(0);
    expect(fetched).toEqual(['audio/music.menu.flac', 'audio/sfx.coin.flac']);
    expect(context.decodes).toBe(0);
  });

  it('unlocks on the first gesture, decodes and starts the wanted music', async () => {
    const { engine, context, gestures } = rig();
    engine.prepare(['music.menu']);
    engine.playMusic('music.menu');
    gestures.dispatch('keydown');
    expect(context.state).toBe('running');
    await settle();
    expect(context.decodes).toBe(1);
    expect(engine.currentMusic).toBe('music.menu');
    expect(gestures.count('keydown')).toBe(0);
    expect(gestures.count('pointerdown')).toBe(0);
  });

  it('creates the context straight away after an earlier activation', () => {
    const { contextsCreated } = rig(true);
    expect(contextsCreated()).toBe(1);
  });

  it('suspends while the page is hidden and resumes when shown', async () => {
    const { context, visibility } = await unlockedRig([]);
    visibility.hidden = true;
    visibility.dispatch('visibilitychange');
    expect(context.state).toBe('suspended');
    visibility.hidden = false;
    visibility.dispatch('visibilitychange');
    expect(context.state).toBe('running');
  });
});

describe('WebAudioEngine music', () => {
  it('does not restart the track already playing', async () => {
    const { engine, context } = await unlockedRig(['music.overworld']);
    engine.playMusic('music.overworld');
    engine.playMusic('music.overworld');
    expect(context.playedBuffers()).toHaveLength(1);
    expect(context.playedBuffers()[0].loop).toBe(true);
  });

  it('fades the old track out when switching and plays one-shots without looping', async () => {
    const { engine, context } = await unlockedRig(['music.overworld', 'music.stage-clear']);
    engine.playMusic('music.overworld');
    context.currentTime = 1;
    engine.playMusic('music.stage-clear');
    const [first, second] = context.playedBuffers();
    expect(first.stoppedAt).toBeGreaterThan(1);
    expect(second.loop).toBe(false);
    expect(engine.currentMusic).toBe('music.stage-clear');
  });

  it('pauses and resumes from the same point in the loop', async () => {
    const { engine, context } = await unlockedRig(['music.overworld']);
    engine.playMusic('music.overworld');
    context.currentTime = 3.5;
    engine.pauseMusic();
    expect(engine.currentMusic).toBeNull();
    context.currentTime = 10;
    engine.resumeMusic();
    const resumed = context.playedBuffers().at(-1)!;
    expect(resumed.startedWith).toEqual([10, 1.5]);
  });

  it('starts silent and plays nothing for a null track', async () => {
    const { engine, context } = await unlockedRig(['music.overworld']);
    engine.playMusic('music.overworld');
    engine.playMusic(null);
    expect(engine.currentMusic).toBeNull();
    expect(context.playedBuffers()[0].stoppedAt).not.toBeNull();
  });

  it('starts a track once its decode finishes', async () => {
    const { engine, context } = await unlockedRig([]);
    engine.playMusic('music.star');
    expect(engine.currentMusic).toBeNull();
    engine.prepare(['music.star']);
    await settle();
    expect(engine.currentMusic).toBe('music.star');
    expect(context.playedBuffers()).toHaveLength(1);
  });
});

describe('WebAudioEngine sound effects', () => {
  it('drops effects that are not decoded yet', async () => {
    const { engine, context } = await unlockedRig([]);
    engine.playSfx('sfx.coin');
    expect(context.playedBuffers()).toHaveLength(0);
  });

  it("steals a sound's oldest voice at its limit, with a short fade", async () => {
    const { engine, context } = await unlockedRig(['sfx.jump-small']);
    engine.playSfx('sfx.jump-small');
    context.currentTime = 0.1;
    engine.playSfx('sfx.jump-small');
    const [first, second] = context.playedBuffers();
    expect(first.stoppedAt).toBeCloseTo(0.105, 6);
    expect(second.stoppedAt).toBeNull();
  });

  it('frees a voice when its sound ends', async () => {
    const { engine, context } = await unlockedRig(['sfx.jump-small']);
    engine.playSfx('sfx.jump-small');
    context.playedBuffers()[0].onended?.();
    engine.playSfx('sfx.jump-small');
    expect(context.playedBuffers()[0].stoppedAt).toBeNull();
  });

  it('stops every sound at once', async () => {
    const { engine, context } = await unlockedRig(['sfx.coin', 'music.menu']);
    engine.playMusic('music.menu');
    engine.playSfx('sfx.coin');
    engine.stopAll();
    expect(context.playedBuffers().every((source) => source.stoppedAt !== null)).toBe(true);
    expect(engine.currentMusic).toBeNull();
  });
});

describe('WebAudioEngine volumes', () => {
  it('routes master, music and SFX volumes to their buses on a squared curve', () => {
    const { engine, context } = rig(true);
    const [master, music, sfx] = context.gains;
    expect([master.gain.value, music.gain.value, sfx.gain.value]).toEqual([
      DEFAULT_VOLUMES.master ** 2,
      DEFAULT_VOLUMES.music ** 2,
      DEFAULT_VOLUMES.sfx ** 2,
    ]);
    engine.setVolumes({ master: 1, music: 0.5, sfx: 0 });
    expect(master.gain.targets.at(-1)).toBe(1);
    expect(music.gain.targets.at(-1)).toBe(0.25);
    expect(sfx.gain.targets.at(-1)).toBe(0);
  });

  it('remembers volumes set before the context exists', () => {
    const { engine, context, gestures } = rig();
    engine.setVolumes({ master: 0.5, music: 1, sfx: 1 });
    gestures.dispatch('pointerdown');
    expect(context.gains[0].gain.value).toBe(0.25);
  });
});

describe('WebAudioEngine lifetime', () => {
  it('closes the context and removes its listeners on dispose', () => {
    const { engine, context, gestures, visibility } = rig(true);
    const close = vi.spyOn(context, 'close');
    engine.dispose();
    expect(close).toHaveBeenCalled();
    expect(gestures.count('keydown')).toBe(0);
    expect(visibility.count('visibilitychange')).toBe(0);
  });
});

describe('musicToRelease', () => {
  it("releases other stages' music when a stage is prepared", () => {
    const decoded: SoundId[] = [
      'music.overworld',
      'music.overworld-hurry',
      'music.menu',
      'music.star',
      'sfx.coin',
    ];
    expect(musicToRelease(decoded, ['music.underground', 'music.underground-hurry'])).toEqual([
      'music.overworld',
      'music.overworld-hurry',
    ]);
  });

  it('keeps everything when only shared sounds are prepared', () => {
    expect(musicToRelease(['music.overworld'], ['music.menu', 'sfx.menu-move'])).toEqual([]);
  });
});
