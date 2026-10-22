import { DEFAULT_MOVEMENT, MovementTuning } from '../../configuration/movement.config';
import { ActionState } from '../../systems/input/actions';
import { Contacts, PlayerController } from './player-controller';

const MAX_SIMULATED_SECONDS = 10;

export interface JumpOptions {
  runUpSeconds: number;
  run: boolean;
  holdJumpSeconds: number;
}

export interface JumpResult {
  apex: number;
  distance: number;
}

export function actions(overrides: Partial<ActionState> = {}): ActionState {
  return { left: false, right: false, down: false, jump: false, run: false, ...overrides };
}

export function contacts(overrides: Partial<Contacts> = {}): Contacts {
  return {
    onGround: false,
    hitCeiling: false,
    hitWallLeft: false,
    hitWallRight: false,
    ...overrides,
  };
}

function flatGroundContacts(y: number, vy: number): Contacts {
  return contacts({ onGround: y >= 0 && vy >= 0 });
}

export function simulate(
  hz: number,
  seconds: number,
  actionsAt: (t: number) => ActionState,
  contactsAt?: (t: number, y: number) => Contacts,
): PlayerController {
  const controller = new PlayerController(DEFAULT_MOVEMENT);
  const dt = 1 / hz;
  const steps = Math.round(seconds * hz);
  let y = 0;
  for (let i = 0; i < steps; i++) {
    const t = i / hz;
    const stepContacts = contactsAt ? contactsAt(t, y) : flatGroundContacts(y, controller.vy);
    controller.step(actionsAt(t), stepContacts, dt);
    y = Math.min(y + controller.bodyVy * dt, 0);
  }
  return controller;
}

export function simulateJump(
  hz: number,
  opts: JumpOptions,
  tuning: MovementTuning = DEFAULT_MOVEMENT,
): JumpResult {
  const controller = new PlayerController(tuning);
  const dt = 1 / hz;
  const runUpSteps = Math.round(opts.runUpSeconds * hz);
  const holdSteps = Math.max(1, Math.round(opts.holdJumpSeconds * hz));
  const right = opts.runUpSeconds > 0;
  const maxSteps = Math.round(MAX_SIMULATED_SECONDS * hz);
  let x = 0;
  let y = 0;
  let takeoffX = 0;
  let minY = 0;
  for (let i = 0; i < maxSteps; i++) {
    const jumping = i >= runUpSteps && i < runUpSteps + holdSteps;
    if (i === runUpSteps) takeoffX = x;
    controller.step(
      actions({ right, run: opts.run, jump: jumping }),
      flatGroundContacts(y, controller.vy),
      dt,
    );
    const nextX = x + controller.bodyVx * dt;
    const nextY = y + controller.bodyVy * dt;
    if (i > runUpSteps && y < 0 && nextY >= 0) {
      const fraction = -y / (nextY - y);
      return { apex: -minY, distance: x + fraction * (nextX - x) - takeoffX };
    }
    x = nextX;
    y = Math.min(nextY, 0);
    minY = Math.min(minY, y);
  }
  throw new Error(`jump did not land within ${MAX_SIMULATED_SECONDS}s at ${hz}Hz`);
}
