import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { DEFAULT_VOLUMES } from '../../../game-engine/audio/volume';
import { AudioService } from '../../core/services/audio.service';
import { SAVE_STORAGE, SaveService } from '../../core/services/save.service';
import { SettingsService } from '../../core/services/settings.service';
import { MemoryStorage, stageResult } from '../../core/testing/game-fixtures.test-helpers';
import { ProgressionService } from '../../core/services/progression.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: SAVE_STORAGE, useValue: new MemoryStorage() },
      ],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const byTestId = <T extends HTMLElement>(id: string) =>
      element.querySelector<T>(`[data-testid="${id}"]`)!;
    return { fixture, element, byTestId };
  }

  it('binds the three volume sliders to the audio settings', async () => {
    const { fixture, element } = await render();
    const audio = element.querySelector('[aria-labelledby="audio-heading"]')!;
    const sliders = [...audio.querySelectorAll<HTMLInputElement>('input[type="range"]')];
    expect(sliders.map((slider) => Number(slider.value) / 100)).toEqual([
      DEFAULT_VOLUMES.master,
      DEFAULT_VOLUMES.music,
      DEFAULT_VOLUMES.sfx,
    ]);
    sliders[1].value = '25';
    sliders[1].dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(TestBed.inject(AudioService).volumes().music).toBe(0.25);
  });

  it('previews the effects volume when the slider is released', async () => {
    const playSfx = vi.spyOn(TestBed.inject(AudioService), 'playSfx');
    const { element } = await render();
    const effects = element.querySelectorAll<HTMLInputElement>('input[type="range"]')[2];
    effects.dispatchEvent(new Event('change'));
    expect(playSfx).toHaveBeenCalledWith('sfx.coin');
  });

  it('switches quality and the motion toggles', async () => {
    const { fixture, byTestId } = await render();
    byTestId('quality-low').click();
    byTestId('reduced-motion').click();
    byTestId('screen-shake').click();
    await fixture.whenStable();
    expect(TestBed.inject(SettingsService).settings()).toMatchObject({
      quality: 'low',
      reducedMotion: true,
      screenShake: false,
    });
    expect(byTestId('quality-low').getAttribute('aria-pressed')).toBe('true');
    expect(byTestId('quality-high').getAttribute('aria-pressed')).toBe('false');
  });

  it('saves jump and directional turning sensitivity from the sliders', async () => {
    const { fixture, byTestId } = await render();
    const jump = byTestId('jump-sensitivity') as HTMLInputElement;
    const left = byTestId('left-sensitivity') as HTMLInputElement;
    const right = byTestId('right-sensitivity') as HTMLInputElement;
    jump.value = '125';
    left.value = '75';
    right.value = '140';
    jump.dispatchEvent(new Event('input'));
    left.dispatchEvent(new Event('input'));
    right.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(TestBed.inject(SettingsService).settings()).toMatchObject({
      jumpSensitivity: 1.25,
      leftSensitivity: 0.75,
      rightSensitivity: 1.4,
    });
  });

  it('rebinds a key from the next key press, and Esc cancels', async () => {
    const { fixture, byTestId } = await render();
    byTestId('rebind-jump').click();
    await fixture.whenStable();
    expect(byTestId('rebind-jump').textContent).toContain('Press a key');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL' }));
    await fixture.whenStable();
    expect(byTestId('keys-jump').textContent).toContain('L');
    expect(TestBed.inject(SettingsService).bindings().jump[0]).toBe('KeyL');

    byTestId('rebind-run').click();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
    expect(TestBed.inject(SettingsService).bindings().run).not.toContain('KeyM');

    byTestId('reset-keys').click();
    expect(TestBed.inject(SettingsService).bindings().jump[0]).toBe('Space');
  });

  it('erases progress only after confirmation', async () => {
    TestBed.inject(ProgressionService).recordClear(stageResult({ coinsCollected: 12 }));
    const { fixture, byTestId } = await render();
    byTestId('erase').click();
    await fixture.whenStable();
    expect(TestBed.inject(SaveService).data().progression.coins).toBe(12);
    byTestId('confirm-erase').click();
    expect(TestBed.inject(SaveService).data().progression.coins).toBe(0);
  });
});
