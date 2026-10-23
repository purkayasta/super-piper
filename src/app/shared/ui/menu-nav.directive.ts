import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';
import { Sfx } from '../../../content/audio/sound-ids';
import { AudioService } from '../../core/services/audio.service';
import { GamepadMenuService } from '../../core/services/gamepad-menu.service';
import type { MenuIntent } from '../../core/utilities/pad-navigator';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [data-nav]';
const ACTIVATION_KEYS: ReadonlySet<string> = new Set(['Enter', 'Space', 'NumpadEnter']);

@Directive({
  selector: '[appMenuNav]',
  host: {
    '(keydown)': 'handleKey($event)',
  },
})
export class MenuNavDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly audio = inject(AudioService);

  readonly navAutofocus = input(true);
  readonly startAction = input<'confirm' | 'back'>('confirm');
  readonly menuBack = output<void>();

  constructor() {
    const unregister = inject(GamepadMenuService).register(this);
    inject(DestroyRef).onDestroy(unregister);
    afterNextRender(() => {
      if (this.navAutofocus()) this.focusDefault();
    });
  }

  handleIntent(intent: MenuIntent): void {
    switch (intent) {
      case 'up':
        this.move(-1);
        break;
      case 'down':
        this.move(1);
        break;
      case 'left':
      case 'right':
        if (!this.stepRange(intent === 'left' ? -1 : 1)) this.move(intent === 'left' ? -1 : 1);
        break;
      case 'confirm':
        this.activate();
        break;
      case 'back':
        this.menuBack.emit();
        break;
      case 'start':
        if (this.startAction() === 'back') this.menuBack.emit();
        else this.activate();
        break;
    }
  }

  focusDefault(): void {
    const preferred = this.host.querySelector<HTMLElement>('[data-nav-default]');
    (preferred ?? this.focusables()[0])?.focus();
  }

  protected handleKey(event: KeyboardEvent): void {
    if (event.repeat && ACTIVATION_KEYS.has(event.code)) {
      event.preventDefault();
      return;
    }
    const onRange = isRange(event.target);
    switch (event.code) {
      case 'ArrowUp':
        this.moveFromKey(event, -1);
        break;
      case 'ArrowDown':
        this.moveFromKey(event, 1);
        break;
      case 'ArrowLeft':
        if (!onRange) this.moveFromKey(event, -1);
        break;
      case 'ArrowRight':
        if (!onRange) this.moveFromKey(event, 1);
        break;
      case 'Escape':
        event.preventDefault();
        this.menuBack.emit();
        break;
    }
  }

  private moveFromKey(event: KeyboardEvent, step: number): void {
    event.preventDefault();
    this.move(step);
  }

  private move(step: number): void {
    const items = this.focusables();
    if (items.length === 0) return;
    const current = items.indexOf(this.host.ownerDocument.activeElement as HTMLElement);
    const next = current < 0 ? 0 : (current + step + items.length) % items.length;
    if (next === current) return;
    items[next].focus();
    this.audio.playSfx(Sfx.menuMove);
  }

  private activate(): void {
    const active = this.host.ownerDocument.activeElement;
    if (active instanceof HTMLElement && this.host.contains(active) && !isRange(active)) {
      active.click();
    } else {
      this.focusDefault();
    }
  }

  private stepRange(step: number): boolean {
    const active = this.host.ownerDocument.activeElement;
    if (!isRange(active) || !this.host.contains(active)) return false;
    if (step < 0) active.stepDown();
    else active.stepUp();
    active.dispatchEvent(new Event('input', { bubbles: true }));
    active.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  private focusables(): HTMLElement[] {
    return [...this.host.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => element.closest('[appMenuNav]') === this.host || element === this.host,
    );
  }
}

function isRange(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement && target.type === 'range';
}
