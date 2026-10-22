import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  isDevMode,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameSessionService } from '../../core/services/game-session.service';
import { isDevToolsEnabled } from '../../core/utilities/dev-tools';
import { DevOverlayComponent } from '../../shared/components/dev-overlay/dev-overlay.component';

@Component({
  imports: [RouterLink, DevOverlayComponent],
  selector: 'app-game-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './game-shell.component.css',
  templateUrl: './game-shell.component.html',
})
export class GameShellComponent {
  private readonly session = inject(GameSessionService);
  private readonly document = inject(DOCUMENT);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  protected readonly devTools = isDevToolsEnabled(this.document.location.search, !isDevMode());
  protected readonly perf = this.session.perf;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const hostElement = this.host().nativeElement;
      this.session.attach(hostElement, { quality: 'high', devTools: this.devTools });
      this.observeResize(hostElement, destroyRef);
    });

    destroyRef.onDestroy(() => this.session.detach());
  }

  private observeResize(hostElement: HTMLElement, destroyRef: DestroyRef): void {
    const view = this.document.defaultView;
    if (!view) return;
    let pendingFrame = 0;
    const scheduleResize = (): void => {
      if (pendingFrame) return;
      pendingFrame = view.requestAnimationFrame(() => {
        pendingFrame = 0;
        this.session.resize(
          hostElement.clientWidth,
          hostElement.clientHeight,
          view.devicePixelRatio || 1,
        );
      });
    };
    const observer = new view.ResizeObserver(scheduleResize);
    observer.observe(hostElement);
    const stopWatchingResolution = this.watchResolution(view, scheduleResize);
    destroyRef.onDestroy(() => {
      observer.disconnect();
      stopWatchingResolution();
      view.cancelAnimationFrame(pendingFrame);
    });
  }

  private watchResolution(view: Window, onChange: () => void): () => void {
    let resolutionQuery: MediaQueryList | undefined;
    const handleChange = (): void => {
      listenAtCurrentResolution();
      onChange();
    };
    const listenAtCurrentResolution = (): void => {
      resolutionQuery?.removeEventListener('change', handleChange);
      resolutionQuery = view.matchMedia(`(resolution: ${view.devicePixelRatio || 1}dppx)`);
      resolutionQuery.addEventListener('change', handleChange);
    };
    listenAtCurrentResolution();
    return () => resolutionQuery?.removeEventListener('change', handleChange);
  }
}
