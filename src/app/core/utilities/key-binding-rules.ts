import {
  DEFAULT_BINDINGS,
  GAME_ACTIONS,
  type GameAction,
  type KeyBindings,
} from '../../../game-engine/systems/input/actions';

const MAX_KEYS_PER_ACTION = 8;

const RESERVED_CODES: ReadonlySet<string> = new Set([
  'Tab',
  'Backquote',
  'MetaLeft',
  'MetaRight',
  'ContextMenu',
  ...Array.from({ length: 12 }, (_, index) => `F${index + 1}`),
]);

const KEY_LABELS: Readonly<Record<string, string>> = {
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  Space: 'SPACE',
  Escape: 'ESC',
  Enter: 'ENTER',
  Backspace: 'BKSP',
  ShiftLeft: 'L-SHIFT',
  ShiftRight: 'R-SHIFT',
  ControlLeft: 'L-CTRL',
  ControlRight: 'R-CTRL',
  AltLeft: 'L-ALT',
  AltRight: 'R-ALT',
};

export const ACTION_LABELS: Readonly<Record<GameAction, string>> = {
  left: 'Move left',
  right: 'Move right',
  down: 'Crouch',
  jump: 'Jump',
  run: 'Run / throw',
  pause: 'Pause',
};

export function isReservedCode(code: string): boolean {
  return RESERVED_CODES.has(code);
}

export function keyLabel(code: string): string {
  const named = KEY_LABELS[code];
  if (named !== undefined) return named;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6).toUpperCase()}`;
  return code.toUpperCase();
}

export function rebindKey(bindings: KeyBindings, action: GameAction, code: string): KeyBindings {
  const oldPrimary = bindings[action][0];
  if (isReservedCode(code) || code === oldPrimary) return bindings;
  const next = { ...bindings };
  let swapped = false;
  for (const other of GAME_ACTIONS) {
    if (other === action || !bindings[other].includes(code)) continue;
    const remaining = bindings[other].filter((candidate) => candidate !== code);
    if (remaining.length === 0) {
      next[other] = [oldPrimary];
      swapped = true;
    } else {
      next[other] = remaining;
    }
  }
  const rest = bindings[action]
    .slice(1)
    .filter((candidate) => candidate !== code && !(swapped && candidate === oldPrimary));
  next[action] = [code, ...rest];
  return next;
}

export function validateBindings(value: unknown): KeyBindings | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const source = value as Partial<Record<GameAction, unknown>>;
  const result = {} as Record<GameAction, readonly string[]>;
  const used = new Set<string>();
  for (const action of GAME_ACTIONS) {
    const keys = source[action] ?? DEFAULT_BINDINGS[action];
    if (!isKeyList(keys)) return null;
    for (const code of keys) {
      if (used.has(code)) return null;
      used.add(code);
    }
    result[action] = [...keys];
  }
  return result;
}

function isKeyList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_KEYS_PER_ACTION &&
    value.every((code) => typeof code === 'string' && code.length > 0 && !isReservedCode(code))
  );
}
