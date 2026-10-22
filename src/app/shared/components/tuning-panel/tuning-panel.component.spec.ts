import {
  DEFAULT_MOVEMENT,
  type MovementTuning,
} from '../../../../game-engine/configuration/movement.config';
import { TestBed } from '@angular/core/testing';
import { formatTuningAsConfig } from './format-tuning';
import { TuningPanelComponent } from './tuning-panel.component';

interface Stable {
  whenStable(): Promise<unknown>;
}

describe('TuningPanelComponent', () => {
  async function render() {
    const fixture = TestBed.createComponent(TuningPanelComponent);
    const emitted: MovementTuning[] = [];
    fixture.componentInstance.tuningChange.subscribe((tuning) => emitted.push(tuning));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, emitted };
  }

  async function pressF2(fixture: Stable) {
    const event = new KeyboardEvent('keydown', { key: 'F2', code: 'F2', cancelable: true });
    document.dispatchEvent(event);
    await fixture.whenStable();
    return event;
  }

  async function typeValue(fixture: Stable, input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function click(fixture: Stable, element: HTMLElement, action: string) {
    element.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`)!.click();
    await fixture.whenStable();
  }

  const numberInput = (element: HTMLElement, field: string) =>
    element.querySelector<HTMLInputElement>(`input[type="number"][data-field="${field}"]`)!;

  afterEach(() => vi.unstubAllGlobals());

  it('starts closed and toggles with F2, swallowing the browser default', async () => {
    const { fixture, element } = await render();
    expect(element.querySelector('.tuning-panel')).toBeNull();
    const opened = await pressF2(fixture);
    expect(opened.defaultPrevented).toBe(true);
    expect(element.querySelector('.tuning-panel')).not.toBeNull();
    await pressF2(fixture);
    expect(element.querySelector('.tuning-panel')).toBeNull();
  });

  it('emits the full tuning with only walkMaxSpeed changed', async () => {
    const { fixture, element, emitted } = await render();
    await pressF2(fixture);
    await typeValue(fixture, numberInput(element, 'walkMaxSpeed'), '100');
    expect(emitted).toEqual([{ ...DEFAULT_MOVEMENT, walkMaxSpeed: 100 }]);
  });

  it('emits when the range slider moves', async () => {
    const { fixture, element, emitted } = await render();
    await pressF2(fixture);
    const slider = element.querySelector<HTMLInputElement>(
      'input[type="range"][data-field="runMaxSpeed"]',
    )!;
    await typeValue(fixture, slider, '200');
    expect(emitted.at(-1)).toEqual({ ...DEFAULT_MOVEMENT, runMaxSpeed: 200 });
  });

  it('emits the right nested change for a jump-tier edit', async () => {
    const { fixture, element, emitted } = await render();
    await pressF2(fixture);
    await typeValue(fixture, numberInput(element, 'jumpTiers.1.launchSpeed'), '260');
    const tiers = DEFAULT_MOVEMENT.jumpTiers;
    expect(emitted).toEqual([
      {
        ...DEFAULT_MOVEMENT,
        jumpTiers: [tiers[0], { ...tiers[1], launchSpeed: 260 }, tiers[2]],
      },
    ]);
    expect(DEFAULT_MOVEMENT.jumpTiers[1].launchSpeed).toBe(240);
  });

  it('ignores empty entries', async () => {
    const { fixture, element, emitted } = await render();
    await pressF2(fixture);
    await typeValue(fixture, numberInput(element, 'walkMaxSpeed'), '');
    expect(emitted).toEqual([]);
  });

  it('keeps edits across closing and reopening', async () => {
    const { fixture, element } = await render();
    await pressF2(fixture);
    await typeValue(fixture, numberInput(element, 'walkAccel'), '150');
    await pressF2(fixture);
    await pressF2(fixture);
    expect(numberInput(element, 'walkAccel').value).toBe('150');
  });

  it('reset restores the defaults and emits them', async () => {
    const { fixture, element, emitted } = await render();
    await pressF2(fixture);
    await typeValue(fixture, numberInput(element, 'walkMaxSpeed'), '100');
    await click(fixture, element, 'reset');
    expect(emitted.at(-1)).toEqual(DEFAULT_MOVEMENT);
    expect(numberInput(element, 'walkMaxSpeed').value).toBe('93.75');
  });

  it('copies the formatted config to the clipboard', async () => {
    const { fixture, element } = await render();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await pressF2(fixture);
    await click(fixture, element, 'copy');
    expect(writeText).toHaveBeenCalledWith(formatTuningAsConfig(DEFAULT_MOVEMENT));
  });

  it('shows an inline message when the clipboard rejects', async () => {
    const { fixture, element } = await render();
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    await pressF2(fixture);
    await click(fixture, element, 'copy');
    expect(element.querySelector('.tuning-panel__message')?.textContent).toContain('Copy failed');
  });

  it('shows an inline message when the clipboard is unavailable', async () => {
    const { fixture, element } = await render();
    vi.stubGlobal('navigator', {});
    await pressF2(fixture);
    await click(fixture, element, 'copy');
    expect(element.querySelector('.tuning-panel__message')?.textContent).toContain('Copy failed');
  });

  it('ignores keys other than F2', async () => {
    const { fixture, element } = await render();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3', code: 'F3' }));
    await fixture.whenStable();
    expect(element.querySelector('.tuning-panel')).toBeNull();
  });

  it('clamps negative values to zero and zero stays zero', async () => {
    const { fixture, element, emitted } = await render();
    await pressF2(fixture);
    await typeValue(fixture, numberInput(element, 'walkMaxSpeed'), '-5');
    expect(emitted.at(-1)?.walkMaxSpeed).toBe(0);
    await typeValue(fixture, numberInput(element, 'runMaxSpeed'), '0');
    expect(emitted.at(-1)?.runMaxSpeed).toBe(0);
    await typeValue(fixture, numberInput(element, 'jumpTiers.0.launchSpeed'), '-1');
    expect(emitted.at(-1)?.jumpTiers[0].launchSpeed).toBe(0);
  });

  it('floors jump-tier gravities at 1 so Pip can always land', async () => {
    const { fixture, element, emitted } = await render();
    await pressF2(fixture);
    await typeValue(fixture, numberInput(element, 'jumpTiers.0.fallGravity'), '0');
    expect(emitted.at(-1)?.jumpTiers[0].fallGravity).toBe(1);
    await typeValue(fixture, numberInput(element, 'jumpTiers.1.holdGravity'), '-2');
    expect(emitted.at(-1)?.jumpTiers[1].holdGravity).toBe(1);
  });

  it('does not offer maxStepSeconds, which only affects the test harness', async () => {
    const { fixture, element } = await render();
    await pressF2(fixture);
    expect(numberInput(element, 'maxStepSeconds')).toBeNull();
  });

  it('blurs a number input on Enter and Escape', async () => {
    const { fixture, element } = await render();
    document.body.appendChild(element);
    await pressF2(fixture);
    const input = numberInput(element, 'walkMaxSpeed');
    for (const key of ['Enter', 'Escape']) {
      input.focus();
      expect(document.activeElement).toBe(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key, code: key }));
      expect(document.activeElement).not.toBe(input);
    }
    element.remove();
  });

  it('blurs the range slider on change', async () => {
    const { fixture, element } = await render();
    document.body.appendChild(element);
    await pressF2(fixture);
    const slider = element.querySelector<HTMLInputElement>(
      'input[type="range"][data-field="walkMaxSpeed"]',
    )!;
    slider.focus();
    expect(document.activeElement).toBe(slider);
    slider.dispatchEvent(new Event('change'));
    expect(document.activeElement).not.toBe(slider);
    element.remove();
  });

  it('keeps buttons from taking focus on mousedown', async () => {
    const { fixture, element } = await render();
    await pressF2(fixture);
    const event = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
    element.querySelector('button[data-action="copy"]')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('clears the copied message on the next edit', async () => {
    const { fixture, element } = await render();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    await pressF2(fixture);
    await click(fixture, element, 'copy');
    expect(element.querySelector('.tuning-panel__message')).not.toBeNull();
    await typeValue(fixture, numberInput(element, 'walkMaxSpeed'), '100');
    expect(element.querySelector('.tuning-panel__message')).toBeNull();
  });
});
