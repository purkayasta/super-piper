import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AudioService } from '../../core/services/audio.service';
import { SAVE_STORAGE } from '../../core/services/save.service';
import { SettingsService } from '../../core/services/settings.service';
import { MemoryStorage } from '../../core/testing/game-fixtures.test-helpers';
import { PauseMenuComponent } from './pause-menu.component';

describe('PauseMenuComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PauseMenuComponent],
      providers: [{ provide: SAVE_STORAGE, useValue: new MemoryStorage() }],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(PauseMenuComponent);
    fixture.componentRef.setInput('stageLabel', '1-1');
    const events: string[] = [];
    fixture.componentInstance.resumed.subscribe(() => events.push('resume'));
    fixture.componentInstance.restarted.subscribe(() => events.push('restart'));
    fixture.componentInstance.quit.subscribe(() => events.push('quit'));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const button = (id: string) =>
      element.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!;
    return { fixture, element, events, button };
  }

  it('is a labelled dialog naming the stage', async () => {
    const { element } = await render();
    const dialog = element.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('pause-title');
    expect(dialog?.textContent).toContain('WORLD 1-1');
  });

  it('offers resume, restart and the world map', async () => {
    const { events, button } = await render();
    button('resume').click();
    button('restart').click();
    button('quit').click();
    expect(events).toEqual(['resume', 'restart', 'quit']);
  });

  it('resumes on Esc and on the pause binding, but not on Enter', async () => {
    const { events } = await render();
    TestBed.inject(SettingsService).update({
      bindings: { ...TestBed.inject(SettingsService).bindings(), pause: ['Enter', 'KeyP'] },
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', repeat: true }));
    expect(events).toEqual(['resume', 'resume']);
  });

  it('changes music and effects volume, previewing the effects', async () => {
    const audio = TestBed.inject(AudioService);
    const playSfx = vi.spyOn(audio, 'playSfx');
    const { element } = await render();
    const [music, effects] = [...element.querySelectorAll<HTMLInputElement>('input')];
    music.value = '10';
    music.dispatchEvent(new Event('input'));
    effects.value = '40';
    effects.dispatchEvent(new Event('input'));
    effects.dispatchEvent(new Event('change'));
    expect(audio.volumes()).toMatchObject({ music: 0.1, sfx: 0.4 });
    expect(playSfx).toHaveBeenCalledWith('sfx.coin');
  });
});
