import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GameSessionService } from '../../core/services/game-session.service';
import { DEV_TOOLS_ENABLED } from '../../core/utilities/dev-tools';
import type { MovementTuning } from '../../../game-engine/configuration/movement.config';
import { DevOverlayComponent } from '../../shared/components/dev-overlay/dev-overlay.component';
import { TuningPanelComponent } from '../../shared/components/tuning-panel/tuning-panel.component';
import { HudComponent } from './hud/hud.component';

@Component({
  imports: [RouterLink, DevOverlayComponent, TuningPanelComponent, HudComponent],
  selector: 'app-game-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './game-shell.component.css',
  templateUrl: './game-shell.component.html',
})
export class GameShellComponent {
  private readonly session = inject(GameSessionService);
  private readonly document = inject(DOCUMENT);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  private readonly stageId = inject(ActivatedRoute).snapshot.paramMap.get('stageId') ?? '';

  protected readonly devTools = inject(DEV_TOOLS_ENABLED);
  protected readonly perf = this.session.perf;
  protected readonly hud = this.session.hud;
  protected readonly stageLabel = this.session.stageLabel;
  protected readonly loaded = this.session.loaded;
  protected readonly stageResult = this.session.stageResult;
  protected readonly loadPercent = computed(() => Math.round(this.session.loadProgress() * 100));

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const hostElement = this.host().nativeElement;
      this.session.attach(hostElement, {
        quality: 'high',
        devTools: this.devTools,
        initialStageId: this.stageId,
      });
      this.observeResize(hostElement, destroyRef);
    });

    destroyRef.onDestroy(() => this.session.detach());
  }

  protected applyTuning(tuning: MovementTuning): void {
    this.session.send({ type: 'applyTuning', tuning });
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
