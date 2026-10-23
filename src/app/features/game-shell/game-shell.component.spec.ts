import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import type { GameBridge } from '../../../game-engine/core/game-bridge';
import { DEFAULT_BINDINGS } from '../../../game-engine/systems/input/actions';
import { GameSessionService } from '../../core/services/game-session.service';
import { ProgressionService } from '../../core/services/progression.service';
import { PREFERS_REDUCED_MOTION, SAVE_STORAGE } from '../../core/services/save.service';
import { GAME_FACTORY, type GameHandle } from '../../core/game-factory.token';
import { MemoryStorage, stageResult } from '../../core/testing/game-fixtures.test-helpers';
import { DEV_TOOLS_ENABLED } from '../../core/utilities/dev-tools';
import { GameShellComponent } from './game-shell.component';

class FakeResolutionQuery extends EventTarget {
  constructor(readonly media: string) {
    super();
  }
}

class FakeResizeObserver {
  observe(): void {}
  disconnect(): void {}
}

describe('GameShellComponent', () => {
  let handle: GameHandle;
  let bridge: GameBridge | undefined;
  let factory: ReturnType<typeof vi.fn>;
  let resolutionQueries: FakeResolutionQuery[];

  beforeEach(() => {
    handle = { destroy: vi.fn(), resize: vi.fn() };
    bridge = undefined;
    factory = vi.fn((_parent: HTMLElement, gameBridge: GameBridge) => {
      bridge = gameBridge;
      return handle;
    });
    resolutionQueries = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal(
      'matchMedia',
      vi.fn((media: string) => {
        const query = new FakeResolutionQuery(media);
        resolutionQueries.push(query);
        return query;
      }),
    );
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    TestBed.configureTestingModule({
      imports: [GameShellComponent],
      providers: [
        provideRouter([
          { path: 'play/:stageId', component: GameShellComponent },
          { path: '**', children: [] },
        ]),
        GameSessionService,
        { provide: SAVE_STORAGE, useValue: new MemoryStorage() },
        { provide: PREFERS_REDUCED_MOTION, useValue: false },
        { provide: GAME_FACTORY, useValue: factory },
        { provide: DEV_TOOLS_ENABLED, useValue: false },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function renderShell() {
    const fixture = TestBed.createComponent(GameShellComponent);
    await fixture.whenStable();
    return fixture;
  }

  async function renderShellWithLiveUpdates() {
    const fixture = await renderShell();
    // The synchronous requestAnimationFrame stub stalls Angular's zoneless scheduler, so later signal updates never render.
    vi.mocked(window.requestAnimationFrame).mockRestore();
    return fixture;
  }

  it('destroys the game and disposes the bridge on destroy', async () => {
    const fixture = await renderShell();
    expect(factory).toHaveBeenCalledTimes(1);

    fixture.destroy();

    expect(handle.destroy).toHaveBeenCalledTimes(1);
    expect(bridge?.listenerCount()).toBe(0);
  });

  it('resizes and re-arms the resolution query when the pixel ratio changes', async () => {
    await renderShell();
    expect(resolutionQueries.map((query) => query.media)).toEqual(['(resolution: 1dppx)']);
    vi.stubGlobal('devicePixelRatio', 2);

    resolutionQueries[0].dispatchEvent(new Event('change'));

    expect(handle.resize).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 2);
    expect(resolutionQueries.map((query) => query.media)).toEqual([
      '(resolution: 1dppx)',
      '(resolution: 2dppx)',
    ]);
    vi.mocked(handle.resize).mockClear();
    resolutionQueries[0].dispatchEvent(new Event('change'));
    expect(handle.resize).not.toHaveBeenCalled();
  });

  it('stops listening for resolution changes on destroy', async () => {
    const fixture = await renderShell();
    fixture.destroy();

    resolutionQueries[0].dispatchEvent(new Event('change'));

    expect(handle.resize).not.toHaveBeenCalled();
  });

  it('starts the game on the stage named in the route', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/play/test-room', GameShellComponent);
    await harness.fixture.whenStable();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory.mock.calls[0][2]).toEqual({
      devTools: false,
      initialStageId: 'test-room',
      settings: { quality: 'high', reducedMotion: false, screenShake: true },
      bindings: DEFAULT_BINDINGS,
    });
  });

  it('starts a new game when the route moves to another stage', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/play/test-room', GameShellComponent);
    await harness.fixture.whenStable();
    vi.mocked(window.requestAnimationFrame).mockRestore();
    await harness.navigateByUrl('/play/1-1', GameShellComponent);
    await harness.fixture.whenStable();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(handle.destroy).toHaveBeenCalledTimes(1);
    expect(factory.mock.calls[1][2]).toMatchObject({ initialStageId: '1-1' });
  });

  it('shows the dev overlay and passes devTools only when the flag is on', async () => {
    TestBed.overrideProvider(DEV_TOOLS_ENABLED, { useValue: true });
    const fixture = await renderShell();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-dev-overlay')).not.toBeNull();
    expect(factory.mock.calls[0][2]).toMatchObject({ devTools: true });
  });

  it('shows load progress until the stage reports it is loaded', async () => {
    const fixture = await renderShellWithLiveUpdates();
    const element = fixture.nativeElement as HTMLElement;
    bridge!.emit({ type: 'loadProgress', progress: 0.5 });
    await fixture.whenStable();
    expect(element.querySelector('.loading')?.textContent).toContain('LOADING 50%');

    bridge!.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    await fixture.whenStable();
    expect(element.querySelector('.loading')).toBeNull();
  });

  it('renders the HUD from hudChanged events', async () => {
    const fixture = await renderShellWithLiveUpdates();
    bridge!.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    bridge!.emit({
      type: 'hudChanged',
      hud: { score: 400, coins: 2, timeLeft: 398, lives: 3, power: 'small' },
    });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="hud-score"]')?.textContent?.trim()).toBe('000400');
    expect(element.querySelector('[data-testid="hud-world"]')?.textContent?.trim()).toBe('1-1');
  });

  it('records a clear once and shows the results over the finished stage', async () => {
    const recordClear = vi.spyOn(TestBed.inject(ProgressionService), 'recordClear');
    const fixture = await renderShellWithLiveUpdates();
    bridge!.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    bridge!.emit({ type: 'stageComplete', result: stageResult({ score: 5200 }) });
    await fixture.whenStable();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-results')?.textContent).toContain('DELIVERED!');
    expect(element.querySelector('[data-testid="results-score"]')?.textContent).toContain('005200');
    expect(recordClear).toHaveBeenCalledTimes(1);
    expect(handle.destroy).not.toHaveBeenCalled();
    expect(element.querySelector('[data-testid="pause"]')).toBeNull();
  });

  it('replays from the results with a restart', async () => {
    const fixture = await renderShellWithLiveUpdates();
    const commands: unknown[] = [];
    bridge!.onCommand((command) => commands.push(command));
    bridge!.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    bridge!.emit({ type: 'stageComplete', result: stageResult() });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('[data-testid="replay"]')!.click();
    expect(commands).toEqual([{ type: 'restart' }]);
    await fixture.whenStable();
    expect(element.querySelector('app-results')).toBeNull();
  });

  it('pauses from the pause button and resumes the same game', async () => {
    const fixture = await renderShellWithLiveUpdates();
    const commands: unknown[] = [];
    bridge!.onCommand((command) => commands.push(command));
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="pause"]')).toBeNull();
    bridge!.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('[data-testid="pause"]')!.click();
    expect(commands).toEqual([{ type: 'pause' }]);
    expect(element.querySelector('app-pause-menu')).toBeNull();
    bridge!.emit({ type: 'paused' });
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('[data-testid="resume"]')!.click();
    bridge!.emit({ type: 'resumed' });
    await fixture.whenStable();
    expect(commands).toEqual([{ type: 'pause' }, { type: 'resume' }]);
    expect(element.querySelector('app-pause-menu')).toBeNull();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(handle.destroy).not.toHaveBeenCalled();
  });

  it('pauses when the tab is hidden', async () => {
    await renderShellWithLiveUpdates();
    const commands: unknown[] = [];
    bridge!.onCommand((command) => commands.push(command));
    bridge!.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(commands).toEqual([{ type: 'pause' }]);
  });

  it('shows game over with the score, and Retry restarts the stage', async () => {
    const fixture = await renderShellWithLiveUpdates();
    const commands: unknown[] = [];
    bridge!.onCommand((command) => commands.push(command));
    bridge!.emit({ type: 'gameOver', result: stageResult({ score: 3100 }) });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('[aria-labelledby="game-over-title"]');
    expect(dialog?.textContent).toContain('GAME OVER');
    expect(dialog?.textContent).toContain('SCORE 3100');
    (element.querySelector('[data-testid="retry"]') as HTMLButtonElement).click();
    expect(commands).toEqual([{ type: 'restart' }]);
    bridge!.emit({ type: 'loadComplete', stageId: '1-1', stageLabel: '1-1' });
    await fixture.whenStable();
    expect(element.querySelector('[aria-labelledby="game-over-title"]')).toBeNull();
  });

  it('hides the dev overlay when the flag is off', async () => {
    const fixture = await renderShell();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-dev-overlay')).toBeNull();
  });
});
