import { TestBed } from '@angular/core/testing';
import { SAVE_STORAGE } from '../../core/services/save.service';
import { MemoryStorage, stageResult } from '../../core/testing/game-fixtures.test-helpers';
import { EMPTY_PROGRESSION, type ClearReport } from '../../core/models/progression.model';
import { applyClear } from '../../core/utilities/progression-rules';
import { ResultsComponent } from './results.component';

function reportFor(xp = 0): ClearReport {
  const progression = { ...EMPTY_PROGRESSION, xp };
  return applyClear(
    progression,
    stageResult({ score: 8400, timeUsed: 140, coinsCollected: 21 }),
    150,
  ).report;
}

describe('ResultsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ResultsComponent],
      providers: [{ provide: SAVE_STORAGE, useValue: new MemoryStorage() }],
    });
  });

  async function render(report: ClearReport, canContinue = false) {
    const fixture = TestBed.createComponent(ResultsComponent);
    fixture.componentRef.setInput('report', report);
    fixture.componentRef.setInput('stageTitle', 'Parcel Path');
    fixture.componentRef.setInput('canContinue', canContinue);
    const events: string[] = [];
    fixture.componentInstance.next.subscribe(() => events.push('next'));
    fixture.componentInstance.replay.subscribe(() => events.push('replay'));
    fixture.componentInstance.map.subscribe(() => events.push('map'));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const text = (id: string) => element.querySelector(`[data-testid="${id}"]`)?.textContent ?? '';
    return { element, events, text };
  }

  it('shows the stars, score, time against target, Postmarks, coins and XP', async () => {
    const { element, text } = await render(reportFor());
    expect(element.querySelector('app-star-row')?.getAttribute('aria-label')).toBe('2 of 3 stars');
    expect(text('results-score')).toContain('008400');
    expect(text('results-score')).toContain('BEST');
    expect(text('results-time')).toContain('140 / 150');
    expect(text('results-postmarks')).toContain('1/3');
    expect(text('results-coins')).toContain('+21');
    expect(text('results-xp')).toContain('+484');
  });

  it('announces a rank-up', async () => {
    const { element } = await render(reportFor(400));
    expect(element.textContent).toContain('RANK UP');
    expect(element.textContent).toContain('Junior Courier');
  });

  it('offers the next stage only when it can be played', async () => {
    const closed = await render(reportFor());
    expect(closed.element.querySelector('[data-testid="next-stage"]')).toBeNull();
    const open = await render(reportFor(), true);
    open.element.querySelector<HTMLButtonElement>('[data-testid="next-stage"]')!.click();
    open.element.querySelector<HTMLButtonElement>('[data-testid="replay"]')!.click();
    open.element.querySelector<HTMLButtonElement>('[data-testid="results-map"]')!.click();
    expect(open.events).toEqual(['next', 'replay', 'map']);
  });
});
