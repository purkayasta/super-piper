import { TestBed } from '@angular/core/testing';
import type { PerfSample } from '../../../../game-engine/core/game-events';
import { DevOverlayComponent } from './dev-overlay.component';

const sample: PerfSample = {
  fps: 59.9412,
  avgFrameMs: 16.6833,
  p95FrameMs: 17.2,
  longFrames: 1,
  refreshHz: 144,
  physicsHz: 144,
  activeBodies: 5,
};

describe('DevOverlayComponent', () => {
  async function render(value: PerfSample | null) {
    const fixture = TestBed.createComponent(DevOverlayComponent);
    fixture.componentRef.setInput('sample', value);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows a dash while there is no sample', async () => {
    const { element } = await render(null);
    expect(element.textContent).toContain('—');
  });

  it('shows fps to one decimal, frame times to two and counts as integers', async () => {
    const { element } = await render(sample);
    const values = Array.from(element.querySelectorAll('dd'), (cell) => cell.textContent?.trim());
    expect(values).toEqual(['59.9', '16.68', '17.20', '1', '144', '144', '5']);
  });

  it('toggles visibility with the backtick key', async () => {
    const { fixture, element } = await render(sample);
    expect(element.querySelector('.dev-overlay')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`', code: 'Backquote' }));
    await fixture.whenStable();
    expect(element.querySelector('.dev-overlay')).toBeNull();
  });

  it('ignores other keys', async () => {
    const { fixture, element } = await render(sample);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await fixture.whenStable();
    expect(element.querySelector('.dev-overlay')).not.toBeNull();
  });
});
