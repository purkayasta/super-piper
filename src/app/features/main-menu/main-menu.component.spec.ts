import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AudioService } from '../../core/services/audio.service';
import { DEV_TOOLS_ENABLED } from '../../core/utilities/dev-tools';
import { MainMenuComponent } from './main-menu.component';

describe('MainMenuComponent', () => {
  async function render(devTools: boolean): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      imports: [MainMenuComponent],
      providers: [provideRouter([]), { provide: DEV_TOOLS_ENABLED, useValue: devTools }],
    });
    const fixture = TestBed.createComponent(MainMenuComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the title and a Play link to stage 1-1', async () => {
    const element = await render(false);
    expect(element.querySelector('h1')?.textContent).toContain("PIP'S DELIVERY");
    const links = [...element.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/play/1-1']);
  });

  it('also links the test room when dev tools are on', async () => {
    const element = await render(true);
    const links = [...element.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/play/1-1', '/play/test-room']);
  });

  it('starts the menu music and confirms Play with the select sound', async () => {
    TestBed.configureTestingModule({
      imports: [MainMenuComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: DEV_TOOLS_ENABLED, useValue: false },
      ],
    });
    const audio = TestBed.inject(AudioService);
    const playMenuMusic = vi.spyOn(audio, 'playMenuMusic');
    const playSfx = vi.spyOn(audio, 'playSfx');
    const fixture = TestBed.createComponent(MainMenuComponent);
    await fixture.whenStable();
    expect(playMenuMusic).toHaveBeenCalledTimes(1);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a.play')!.click();
    await fixture.whenStable();
    expect(playSfx).toHaveBeenCalledWith('sfx.menu-select');
  });
});
