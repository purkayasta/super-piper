import { TestBed } from '@angular/core/testing';
import type { HudState } from '../../../../game-engine/core/game-events';
import { HudComponent } from './hud.component';

const STATE: HudState = { score: 1200, coins: 7, timeLeft: 382, lives: 3, power: 'small' };

describe('HudComponent', () => {
  async function render(hud: HudState | null, stageLabel = '1-1') {
    const fixture = TestBed.createComponent(HudComponent);
    fixture.componentRef.setInput('hud', hud);
    fixture.componentRef.setInput('stageLabel', stageLabel);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function text(element: HTMLElement, testId: string): string | undefined {
    return element.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();
  }

  it('renders nothing until the first HUD state arrives', async () => {
    const element = await render(null);
    expect(element.querySelector('.hud')).toBeNull();
  });

  it('shows zero-padded score, coins and time with the world and lives', async () => {
    const element = await render(STATE);
    expect(text(element, 'hud-score')).toBe('001200');
    expect(text(element, 'hud-coins')).toBe('×07');
    expect(text(element, 'hud-world')).toBe('1-1');
    expect(text(element, 'hud-time')).toBe('382');
    expect(text(element, 'hud-lives')).toBe('×3');
  });

  it('updates when a new state is pushed', async () => {
    const fixture = TestBed.createComponent(HudComponent);
    fixture.componentRef.setInput('hud', STATE);
    await fixture.whenStable();
    fixture.componentRef.setInput('hud', { ...STATE, coins: 8 });
    await fixture.whenStable();
    expect(text(fixture.nativeElement, 'hud-coins')).toBe('×08');
  });
});
