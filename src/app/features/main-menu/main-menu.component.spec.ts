import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainMenuComponent } from './main-menu.component';

describe('MainMenuComponent', () => {
  it('shows the title and a Play link to the test room stage', async () => {
    TestBed.configureTestingModule({
      imports: [MainMenuComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(MainMenuComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain("PIP'S DELIVERY");
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/play/test-room');
  });
});
