import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject } from '@angular/core';
import { DEFAULT_BINDINGS, type GameAction } from '../../../game-engine/systems/input/actions';
import { gameplaySettings } from '../models/settings.model';
import { rebindKey } from '../utilities/key-binding-rules';
import { mergeSettings, sameSettings, type SettingsPatch } from '../utilities/settings-rules';
import { SaveService } from './save.service';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly save = inject(SaveService);

  readonly settings = computed(() => this.save.data().settings);
  readonly volumes = computed(() => this.settings().volumes);
  readonly bindings = computed(() => this.settings().bindings);
  readonly gameplay = computed(() => gameplaySettings(this.settings()));

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect(() => root.toggleAttribute('data-reduced-motion', this.settings().reducedMotion));
  }

  update(patch: SettingsPatch): void {
    const current = this.settings();
    const next = mergeSettings(current, patch);
    if (sameSettings(current, next)) return;
    this.save.updateSettings(next);
  }

  rebind(action: GameAction, code: string): void {
    this.update({ bindings: rebindKey(this.bindings(), action, code) });
  }

  resetBindings(): void {
    this.update({ bindings: DEFAULT_BINDINGS });
  }
}
