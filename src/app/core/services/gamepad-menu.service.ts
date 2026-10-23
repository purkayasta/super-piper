import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { PadNavigator, type MenuIntent, type PadSnapshot } from '../utilities/pad-navigator';

export interface MenuIntentTarget {
  handleIntent(intent: MenuIntent): void;
}

const STICK_X = 0;
const STICK_Y = 1;

@Injectable({ providedIn: 'root' })
export class GamepadMenuService {
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly navigator = new PadNavigator();
  private readonly targets: MenuIntentTarget[] = [];
  private readonly buttons: boolean[] = [];
  private readonly snapshot = { buttons: this.buttons, axisX: 0, axisY: 0 };
  private frame = 0;

  constructor() {
    this.view?.addEventListener('gamepadconnected', this.startPolling);
    inject(DestroyRef).onDestroy(() => {
      this.view?.removeEventListener('gamepadconnected', this.startPolling);
      this.stopPolling();
    });
  }

  register(target: MenuIntentTarget): () => void {
    this.targets.push(target);
    this.navigator.reset();
    this.startPolling();
    return () => {
      const index = this.targets.indexOf(target);
      if (index >= 0) this.targets.splice(index, 1);
      this.navigator.reset();
      if (this.targets.length === 0) this.stopPolling();
    };
  }

  private readonly startPolling = (): void => {
    if (this.frame !== 0 || this.targets.length === 0 || !this.anyPadConnected()) return;
    this.frame = this.view!.requestAnimationFrame(this.poll);
  };

  private stopPolling(): void {
    if (this.frame !== 0) this.view?.cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private readonly poll = (nowMs: number): void => {
    this.frame = 0;
    const target = this.targets[this.targets.length - 1];
    if (target === undefined) return;
    const pad = this.readPad();
    if (pad === null) {
      this.navigator.poll(null, nowMs);
      return;
    }
    const intent = this.navigator.poll(pad, nowMs);
    if (intent !== null) target.handleIntent(intent);
    this.frame = this.view!.requestAnimationFrame(this.poll);
  };

  private readPad(): PadSnapshot | null {
    const pads = this.view?.navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad?.connected) continue;
      this.buttons.length = pad.buttons.length;
      for (let i = 0; i < pad.buttons.length; i++) this.buttons[i] = pad.buttons[i].pressed;
      this.snapshot.axisX = pad.axes[STICK_X] ?? 0;
      this.snapshot.axisY = pad.axes[STICK_Y] ?? 0;
      return this.snapshot;
    }
    return null;
  }

  private anyPadConnected(): boolean {
    const pads = this.view?.navigator.getGamepads?.() ?? [];
    for (const pad of pads) if (pad?.connected) return true;
    return false;
  }
}
