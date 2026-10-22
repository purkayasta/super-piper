import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import type { GameBridge } from '../../../game-engine/core/game-bridge';
import { GameSessionService } from '../../core/services/game-session.service';
import { GAME_FACTORY, type GameHandle } from '../../core/game-factory.token';
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
        provideRouter([]),
        GameSessionService,
        { provide: GAME_FACTORY, useValue: factory },
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
});
