import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
