import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WORLDS, nextStageId } from '../../../content/manifests/world-manifest';
import type { MovementTuning } from '../../../game-engine/configuration/movement.config';
import type { ClearReport } from '../../core/models/progression.model';
import { GameSessionService } from '../../core/services/game-session.service';
import { ProgressionService } from '../../core/services/progression.service';
import { SettingsService } from '../../core/services/settings.service';
import { DEV_TOOLS_ENABLED } from '../../core/utilities/dev-tools';
import { DevOverlayComponent } from '../../shared/components/dev-overlay/dev-overlay.component';
import { TuningPanelComponent } from '../../shared/components/tuning-panel/tuning-panel.component';
import { MenuNavDirective } from '../../shared/ui/menu-nav.directive';
import { PauseMenuComponent } from '../pause-menu/pause-menu.component';
import { ResultsComponent } from '../results/results.component';
import { HudComponent } from './hud/hud.component';

const STAGE_PARAM = 'stageId';

@Component({
  imports: [
    RouterLink,
    DevOverlayComponent,
    TuningPanelComponent,
    HudComponent,
    MenuNavDirective,
    PauseMenuComponent,
    ResultsComponent,
  ],
  selector: 'app-game-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './game-shell.component.css',
  templateUrl: './game-shell.component.html',
})
export class GameShellComponent {
  private readonly session = inject(GameSessionService);
  private readonly settings = inject(SettingsService);
  private readonly progression = inject(ProgressionService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly route = inject(ActivatedRoute);
  private readonly stageId = signal(this.route.snapshot.paramMap.get(STAGE_PARAM) ?? '');
  private attached = false;

  protected readonly devTools = inject(DEV_TOOLS_ENABLED);
  protected readonly perf = this.session.perf;
  protected readonly hud = this.session.hud;
  protected readonly stageLabel = this.session.stageLabel;
  protected readonly loaded = this.session.loaded;
  protected readonly paused = this.session.paused;
  protected readonly canPause = this.session.canPause;
  protected readonly gameOver = this.session.gameOver;
  protected readonly loadError = this.session.loadError;
  protected readonly report = signal<ClearReport | null>(null);
  protected readonly loadPercent = computed(() => Math.round(this.session.loadProgress() * 100));
  protected readonly stageTitle = computed(() => {
    const id = this.stageId();
    for (const world of WORLDS) {
      const stage = world.stages.find((candidate) => candidate.stageId === id);
      if (stage) return stage.title;
    }
    return '';
  });
  protected readonly nextStage = computed(() => {
    const next = nextStageId(this.stageId());
    return next !== null && this.progression.canPlay(next) ? next : null;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.attach();
      this.observeResize(this.host().nativeElement, destroyRef);
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get(STAGE_PARAM) ?? '';
      if (id === this.stageId()) return;
      this.stageId.set(id);
      this.report.set(null);
      if (!this.attached) return;
      this.session.detach();
      this.attach();
    });

    effect(() => {
      const result = this.session.stageResult();
      untracked(() =>
        this.report.set(result === null ? null : this.progression.recordClear(result)),
      );
    });

    effect(() => {
      if (this.loaded() && !this.paused()) untracked(() => this.focusGame());
    });

    this.pauseWhenHidden(destroyRef);
    destroyRef.onDestroy(() => this.session.detach());
  }

  protected pause(): void {
    this.session.requestPause();
  }

  protected resume(): void {
    this.session.resume();
  }

  protected restart(): void {
    this.report.set(null);
    this.session.restart();
  }

  protected quitToMap(): void {
    void this.router.navigateByUrl('/map');
  }

  protected playNext(): void {
    const next = this.nextStage();
    if (next !== null) void this.router.navigate(['/play', next]);
  }

  protected applyTuning(tuning: MovementTuning): void {
    this.session.send({ type: 'applyTuning', tuning });
  }

  private attach(): void {
    this.attached = true;
    this.session.attach(this.host().nativeElement, {
      devTools: this.devTools,
      initialStageId: this.stageId(),
      settings: this.settings.gameplay(),
      bindings: this.settings.bindings(),
    });
  }

  private focusGame(): void {
    const active = this.document.activeElement;
    if (active instanceof HTMLElement && active !== this.document.body) active.blur();
    this.host().nativeElement.focus({ preventScroll: true });
  }

  private pauseWhenHidden(destroyRef: DestroyRef): void {
    const handleVisibility = (): void => {
      if (this.document.visibilityState === 'hidden') this.session.requestPause();
    };
    this.document.addEventListener('visibilitychange', handleVisibility);
    destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', handleVisibility),
    );
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
