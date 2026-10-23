import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AudioService } from '../../core/services/audio.service';
import { SAVE_KEYS, SAVE_STORAGE } from '../../core/services/save.service';
import { MemoryStorage } from '../../core/testing/game-fixtures.test-helpers';
import { DEV_TOOLS_ENABLED } from '../../core/utilities/dev-tools';
import { MainMenuComponent } from './main-menu.component';

describe('MainMenuComponent', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  async function render(devTools: boolean): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      imports: [MainMenuComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: DEV_TOOLS_ENABLED, useValue: devTools },
        { provide: SAVE_STORAGE, useValue: storage },
      ],
    });
    const fixture = TestBed.createComponent(MainMenuComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function links(element: HTMLElement): (string | null)[] {
    return [...element.querySelectorAll('a')].map((link) => link.getAttribute('href'));
  }

  it('shows the title, Play to the world map and Settings', async () => {
    const element = await render(false);
    expect(element.querySelector('h1')?.textContent).toContain("PIP'S DELIVERY");
    expect(links(element)).toEqual(['/map', '/settings']);
  });

  it('also links the test room when dev tools are on', async () => {
    expect(links(await render(true))).toEqual(['/map', '/settings', '/play/test-room']);
  });

  it('shows the rank, stars and coin balance from the save', async () => {
    storage.setItem(
      SAVE_KEYS.primary,
      JSON.stringify({ schemaVersion: 1, progression: { coins: 42, xp: 600 } }),
    );
    const status = (await render(false)).querySelector('[data-testid="menu-status"]');
    expect(status?.textContent).toContain('Junior Courier');
    expect(status?.textContent).toContain('0/12');
    expect(status?.textContent).toContain('42');
  });

  it('explains a recovered save until the player dismisses it', async () => {
    storage.setItem(SAVE_KEYS.primary, 'broken');
    const fixture = TestBed.configureTestingModule({
      imports: [MainMenuComponent],
      providers: [
        provideRouter([]),
        { provide: DEV_TOOLS_ENABLED, useValue: false },
        { provide: SAVE_STORAGE, useValue: storage },
      ],
    }).createComponent(MainMenuComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('damaged');
    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('starts the menu music and confirms Play with the select sound', async () => {
    TestBed.configureTestingModule({
      imports: [MainMenuComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: DEV_TOOLS_ENABLED, useValue: false },
        { provide: SAVE_STORAGE, useValue: storage },
      ],
    });
    const audio = TestBed.inject(AudioService);
    const playMenuMusic = vi.spyOn(audio, 'playMenuMusic');
    const playSfx = vi.spyOn(audio, 'playSfx');
    const fixture = TestBed.createComponent(MainMenuComponent);
    await fixture.whenStable();
    expect(playMenuMusic).toHaveBeenCalledTimes(1);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a.primary')!.click();
    await fixture.whenStable();
    expect(playSfx).toHaveBeenCalledWith('sfx.menu-select');
  });

  it('moves focus with the arrow keys and plays the move sound', async () => {
    const element = await render(false);
    const playSfx = vi.spyOn(TestBed.inject(AudioService), 'playSfx');
    const [play, settings] = [...element.querySelectorAll<HTMLAnchorElement>('a')];
    document.body.append(element);
    play.focus();
    play.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(settings);
    expect(playSfx).toHaveBeenCalledWith('sfx.menu-move');
    element.remove();
  });
});
