import {
  DEFAULT_BINDINGS,
  PAD_START,
  createActionState,
  isActionPressed,
  resolveActions,
  type ActionState,
  type GameAction,
  type KeyBindings,
  type PadState,
} from './actions';
import { InputTracker } from './input-tracker';

const CAPTURED_ACTIONS: readonly GameAction[] = ['left', 'right', 'down', 'jump', 'run'];
const STICK_X_AXIS = 0;
const UI_CONTROL_TAGS: ReadonlySet<string> = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'BUTTON',
  'A',
]);

export class DomInput {
  private readonly tracker = new InputTracker();
  private readonly actions = createActionState();
  private readonly padButtons: boolean[] = [];
  private readonly pad: PadState = { axisX: 0, buttons: this.padButtons };
  private readonly capturedCodes: ReadonlySet<string>;
  private view: Window | null = null;
  private padConnected = false;
  private padActive = false;
  private pauseLatched = true;

  constructor(private readonly bindings: KeyBindings = DEFAULT_BINDINGS) {
    this.capturedCodes = new Set(CAPTURED_ACTIONS.flatMap((action) => bindings[action]));
  }

  readonly resolve = (): ActionState =>
    resolveActions(
      this.tracker.pressed,
      this.bindings,
      this.padActive ? this.pad : null,
      this.actions,
    );

  consumePausePress(): boolean {
    const held =
      isActionPressed(this.tracker.pressed, this.bindings, 'pause') ||
      (this.padActive && this.padButtons[PAD_START] === true);
    const pressed = held && !this.pauseLatched;
    this.pauseLatched = held;
    return pressed;
  }

  attach(view: Window): void {
    if (this.view) return;
    this.view = view;
    view.addEventListener('keydown', this.handleKeyDown);
    view.addEventListener('keyup', this.handleKeyUp);
    view.addEventListener('blur', this.releaseAll);
    view.addEventListener('gamepadconnected', this.handleGamepadConnected);
    view.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    view.document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.padConnected = this.anyGamepadConnected();
  }

  detach(): void {
    const view = this.view;
    if (!view) return;
    this.view = null;
    view.removeEventListener('keydown', this.handleKeyDown);
    view.removeEventListener('keyup', this.handleKeyUp);
    view.removeEventListener('blur', this.releaseAll);
    view.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    view.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    view.document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.releaseAll();
  }

  readonly releaseAll = (): void => {
    this.tracker.releaseAll();
    this.padActive = false;
    this.pauseLatched = true;
  };

  pollGamepad(): void {
    if (!this.padConnected || !this.view) return;
    const gamepad = this.firstConnectedGamepad(this.view.navigator.getGamepads());
    if (!gamepad) {
      this.padActive = false;
      return;
    }
    this.pad.axisX = gamepad.axes[STICK_X_AXIS] ?? 0;
    const buttons = gamepad.buttons;
    this.padButtons.length = buttons.length;
    for (let i = 0; i < buttons.length; i++) this.padButtons[i] = buttons[i].pressed;
    this.padActive = true;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (isUiControlTarget(event.target)) return;
    this.tracker.keyDown(event.code);
    if (this.capturedCodes.has(event.code) && !hasShortcutModifier(event)) {
      event.preventDefault();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.tracker.keyUp(event.code);
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.view?.document.visibilityState === 'hidden') this.releaseAll();
  };

  private readonly handleGamepadConnected = (): void => {
    this.padConnected = true;
  };

  private readonly handleGamepadDisconnected = (): void => {
    this.padConnected = this.anyGamepadConnected();
    if (!this.padConnected) this.padActive = false;
  };

  private anyGamepadConnected(): boolean {
    const navigator = this.view?.navigator;
    if (!navigator || typeof navigator.getGamepads !== 'function') return false;
    return this.firstConnectedGamepad(navigator.getGamepads()) !== null;
  }

  private firstConnectedGamepad(gamepads: readonly (Gamepad | null)[]): Gamepad | null {
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (gamepad?.connected) return gamepad;
    }
    return null;
  }
}

function hasShortcutModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

function isUiControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (UI_CONTROL_TAGS.has(target.tagName)) return true;
  if ((target as HTMLElement).isContentEditable === true) return true;
  return isInsideContentEditable(target);
}

function isInsideContentEditable(element: Element): boolean {
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    const value = node.getAttribute('contenteditable');
    if (value !== null) return value !== 'false';
  }
  return false;
}
