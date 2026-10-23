import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { WORLDS } from '../../../content/manifests/world-manifest';
import type { Progression } from '../models/progression.model';
import { freshSave, type SaveData, type SaveNotice } from '../models/save-data.model';
import type { GameSettings } from '../models/settings.model';
import { restoreSave, type SaveContext } from '../utilities/save-recovery';

export const SAVE_KEYS = {
  primary: 'pip.save',
  backup: 'pip.save.backup',
  corrupt: 'pip.save.corrupt',
} as const;

export const SETTINGS_WRITE_DELAY_MS = 500;

export const SAVE_STORAGE = new InjectionToken<Storage | null>('SAVE_STORAGE', {
  providedIn: 'root',
  factory: () => browserStorage(inject(DOCUMENT).defaultView),
});

export const PREFERS_REDUCED_MOTION = new InjectionToken<boolean>('PREFERS_REDUCED_MOTION', {
  providedIn: 'root',
  factory: () =>
    inject(DOCUMENT).defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
});

const KNOWN_STAGES: ReadonlySet<string> = new Set(
  WORLDS.flatMap((world) => world.stages.map((stage) => stage.stageId)),
);

@Injectable({ providedIn: 'root' })
export class SaveService {
  private readonly storage = inject(SAVE_STORAGE);
  private readonly defaults = freshSave(inject(PREFERS_REDUCED_MOTION));
  private readonly noticeState = signal<SaveNotice | null>(null);
  private readonly dataState = signal<SaveData>(this.defaults);
  private lastGoodText: string | null = null;
  private primaryText: string | null = null;
  private pendingWrite: ReturnType<typeof setTimeout> | null = null;

  readonly data = this.dataState.asReadonly();
  readonly notice = this.noticeState.asReadonly();

  constructor() {
    this.load();
    const view = inject(DOCUMENT).defaultView;
    view?.addEventListener('pagehide', this.flush);
    inject(DestroyRef).onDestroy(() => {
      view?.removeEventListener('pagehide', this.flush);
      this.flush();
    });
  }

  updateProgression(change: (progression: Progression) => Progression): void {
    const current = this.dataState();
    this.dataState.set({ ...current, progression: change(current.progression) });
    this.writeNow();
  }

  updateSettings(settings: GameSettings): void {
    this.dataState.set({ ...this.dataState(), settings });
    this.scheduleWrite();
  }

  eraseProgress(): void {
    const { progression, cosmetics, achievements } = this.defaults;
    this.dataState.set({ ...this.dataState(), progression, cosmetics, achievements });
    this.writeNow();
  }

  dismissNotice(): void {
    this.noticeState.set(null);
  }

  readonly flush = (): void => {
    if (this.pendingWrite === null) return;
    this.writeNow();
  };

  private load(): void {
    if (this.storage === null) {
      this.noticeState.set('storage-unavailable');
      return;
    }
    const primaryText = this.read(SAVE_KEYS.primary);
    this.primaryText = primaryText;
    const backupText = this.read(SAVE_KEYS.backup);
    const context: SaveContext = { defaults: this.defaults, knownStages: KNOWN_STAGES };
    const restored = restoreSave(primaryText, backupText, context);
    this.dataState.set(restored.data);
    this.noticeState.set(restored.notice);
    this.lastGoodText = restored.source === 'backup' ? backupText : null;
    if (restored.source === 'primary') this.lastGoodText = primaryText;
    if (restored.corruptText !== null) this.store(SAVE_KEYS.corrupt, restored.corruptText);
    if (restored.needsWrite) this.writeNow();
  }

  private scheduleWrite(): void {
    if (this.pendingWrite !== null) clearTimeout(this.pendingWrite);
    this.pendingWrite = setTimeout(() => this.writeNow(), SETTINGS_WRITE_DELAY_MS);
  }

  private writeNow(): void {
    if (this.pendingWrite !== null) clearTimeout(this.pendingWrite);
    this.pendingWrite = null;
    if (this.storage === null) return;
    const text = JSON.stringify(this.dataState());
    if (text === this.primaryText) return;
    const backedUp = this.lastGoodText === null || this.store(SAVE_KEYS.backup, this.lastGoodText);
    if (backedUp && this.store(SAVE_KEYS.primary, text)) {
      this.primaryText = text;
      this.lastGoodText = text;
    } else {
      this.noticeState.set('storage-unavailable');
    }
  }

  private read(key: string): string | null {
    try {
      return this.storage!.getItem(key);
    } catch {
      return null;
    }
  }

  private store(key: string, text: string): boolean {
    try {
      this.storage!.setItem(key, text);
      return true;
    } catch {
      return false;
    }
  }
}

function browserStorage(view: Window | null): Storage | null {
  try {
    return view?.localStorage ?? null;
  } catch {
    return null;
  }
}
