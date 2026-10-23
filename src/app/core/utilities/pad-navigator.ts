export type MenuIntent = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'start';

export interface PadSnapshot {
  readonly buttons: readonly boolean[];
  readonly axisX: number;
  readonly axisY: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

const BUTTON_INTENTS: readonly (readonly [number, MenuIntent])[] = [
  [0, 'confirm'],
  [1, 'back'],
  [9, 'start'],
];

const DPAD: Readonly<Record<Direction, number>> = { up: 12, down: 13, left: 14, right: 15 };

export const PAD_NAVIGATION = { axisThreshold: 0.5, repeatDelayMs: 350, repeatMs: 140 } as const;

export class PadNavigator {
  private readonly heldButtons = new Set<number>();
  private heldDirection: Direction | null = null;
  private nextRepeatMs = 0;
  private latched = true;
  private directionSuppressed = false;

  reset(): void {
    this.latched = true;
    this.heldDirection = null;
  }

  poll(pad: PadSnapshot | null, nowMs: number): MenuIntent | null {
    if (pad === null) {
      this.heldButtons.clear();
      this.heldDirection = null;
      this.directionSuppressed = false;
      return null;
    }
    const latched = this.latched;
    this.latched = false;
    const buttonIntent = this.pollButtons(pad, latched);
    return buttonIntent ?? this.pollDirection(this.direction(pad), latched, nowMs);
  }

  private pollDirection(
    direction: Direction | null,
    latched: boolean,
    nowMs: number,
  ): Direction | null {
    if (direction !== this.heldDirection) {
      this.heldDirection = direction;
      this.directionSuppressed = latched;
      this.nextRepeatMs = nowMs + PAD_NAVIGATION.repeatDelayMs;
      return latched ? null : direction;
    }
    if (direction === null || this.directionSuppressed || nowMs < this.nextRepeatMs) return null;
    this.nextRepeatMs = nowMs + PAD_NAVIGATION.repeatMs;
    return direction;
  }

  private pollButtons(pad: PadSnapshot, latched: boolean): MenuIntent | null {
    let intent: MenuIntent | null = null;
    for (const [button, buttonIntent] of BUTTON_INTENTS) {
      const pressed = pad.buttons[button] === true;
      const wasHeld = this.heldButtons.has(button);
      if (pressed && !wasHeld) {
        this.heldButtons.add(button);
        if (!latched) intent ??= buttonIntent;
      } else if (!pressed && wasHeld) {
        this.heldButtons.delete(button);
      }
    }
    return intent;
  }

  private direction(pad: PadSnapshot): Direction | null {
    const threshold = PAD_NAVIGATION.axisThreshold;
    if (pad.buttons[DPAD.up] === true || pad.axisY < -threshold) return 'up';
    if (pad.buttons[DPAD.down] === true || pad.axisY > threshold) return 'down';
    if (pad.buttons[DPAD.left] === true || pad.axisX < -threshold) return 'left';
    if (pad.buttons[DPAD.right] === true || pad.axisX > threshold) return 'right';
    return null;
  }
}
