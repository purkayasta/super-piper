export interface ActionState {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  run: boolean;
}

export type GameAction = keyof ActionState | 'pause';

export type KeyBindings = Record<GameAction, readonly string[]>;

export const DEFAULT_BINDINGS: KeyBindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ', 'KeyK'],
  run: ['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyJ'],
  pause: ['Escape', 'Enter'],
};

export const GAME_ACTIONS: readonly GameAction[] = [
  'left',
  'right',
  'down',
  'jump',
  'run',
  'pause',
];

export interface PadState {
  axisX: number;
  buttons: readonly boolean[];
}

const AXIS_THRESHOLD = 0.5;
const PAD_JUMP = 0;
const PAD_RUN = 2;
const PAD_DOWN = 13;
const PAD_LEFT = 14;
const PAD_RIGHT = 15;
export const PAD_START = 9;

export function isActionPressed(
  pressed: ReadonlySet<string>,
  bindings: KeyBindings,
  action: GameAction,
): boolean {
  const codes = bindings[action];
  for (let i = 0; i < codes.length; i++) {
    if (pressed.has(codes[i])) {
      return true;
    }
  }
  return false;
}

export function createActionState(): ActionState {
  return { left: false, right: false, down: false, jump: false, run: false };
}

export function resolveActions(
  pressed: ReadonlySet<string>,
  bindings: KeyBindings,
  pad: PadState | null,
  out: ActionState,
): ActionState {
  out.left = isActionPressed(pressed, bindings, 'left');
  out.right = isActionPressed(pressed, bindings, 'right');
  out.down = isActionPressed(pressed, bindings, 'down');
  out.jump = isActionPressed(pressed, bindings, 'jump');
  out.run = isActionPressed(pressed, bindings, 'run');
  if (pad !== null) {
    out.left ||= pad.axisX < -AXIS_THRESHOLD || pad.buttons[PAD_LEFT] === true;
    out.right ||= pad.axisX > AXIS_THRESHOLD || pad.buttons[PAD_RIGHT] === true;
    out.down ||= pad.buttons[PAD_DOWN] === true;
    out.jump ||= pad.buttons[PAD_JUMP] === true;
    out.run ||= pad.buttons[PAD_RUN] === true;
  }
  return out;
}
