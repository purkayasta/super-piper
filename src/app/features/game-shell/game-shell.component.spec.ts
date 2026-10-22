import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import type { GameBridge } from '../../../game-engine/core/game-bridge';
import { GameSessionService } from '../../core/services/game-session.service';
import { GAME_FACTORY, type GameHandle } from '../../core/game-factory.token';
import { GameShellComponent } from './game-shell.component';

describe('GameShellComponent', () => {
  it('destroys the game and disposes the bridge on destroy', async () => {
    const handle: GameHandle = { destroy: vi.fn(), resize: vi.fn() };
    let bridge: GameBridge | undefined;
    const factory = vi.fn((_parent: HTMLElement, gameBridge: GameBridge) => {
      bridge = gameBridge;
      return handle;
    });
    TestBed.configureTestingModule({
      imports: [GameShellComponent],
      providers: [
        provideRouter([]),
        GameSessionService,
        { provide: GAME_FACTORY, useValue: factory },
      ],
    });

    const fixture = TestBed.createComponent(GameShellComponent);
    await fixture.whenStable();
    expect(factory).toHaveBeenCalledTimes(1);

    fixture.destroy();

    expect(handle.destroy).toHaveBeenCalledTimes(1);
    expect(bridge?.listenerCount()).toBe(0);
  });
});
