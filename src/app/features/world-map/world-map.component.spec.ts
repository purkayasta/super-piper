import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ProgressionService } from '../../core/services/progression.service';
import { SAVE_STORAGE } from '../../core/services/save.service';
import { MemoryStorage, stageResult } from '../../core/testing/game-fixtures.test-helpers';
import { WorldMapComponent } from './world-map.component';

describe('WorldMapComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WorldMapComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: SAVE_STORAGE, useValue: new MemoryStorage() },
      ],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(WorldMapComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const node = (stageId: string) =>
      element.querySelector<HTMLButtonElement>(`[data-testid="node-${stageId}"]`)!;
    const details = () => element.querySelector('[data-testid="stage-details"]')!;
    return { fixture, element, node, details };
  }

  it('shows all four World 1 stages with 1-1 open and the rest locked', async () => {
    const { node } = await render();
    expect(node('1-1').className).toContain('open');
    for (const stageId of ['1-2', '1-3', '1-4']) {
      expect(node(stageId).textContent).toContain('LOCKED');
    }
  });

  it('describes the selected stage and starts it', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { element, details } = await render();
    expect(details().textContent).toContain('Parcel Path');
    expect(details().textContent).toContain('Use 150 time or less');
    element.querySelector<HTMLButtonElement>('[data-testid="play-stage"]')!.click();
    expect(navigate).toHaveBeenCalledWith(['/play', '1-1']);
  });

  it('selects a locked stage on the first click and explains it', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { fixture, node, details } = await render();
    node('1-3').click();
    await fixture.whenStable();
    expect(details().textContent).toContain('Locked');
    node('1-3').click();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows progress after a clear and opens the next built stage', async () => {
    TestBed.inject(ProgressionService).recordClear(
      stageResult({ score: 15000, timeUsed: 99, postmarksCollected: [0, 1, 2] }),
    );
    const { fixture, node, details } = await render();
    expect(node('1-1').querySelector('app-star-row')?.getAttribute('aria-label')).toBe(
      '3 of 3 stars',
    );
    expect(node('1-2').className).toContain('open');
    node('1-1').click();
    await fixture.whenStable();
    expect(details().textContent).toContain('015000');
    expect(details().textContent).toContain('099');
  });
});
