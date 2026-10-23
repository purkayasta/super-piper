import type { PowerForm } from '../../core/game-events';

export function nextCrouching(
  crouching: boolean,
  form: PowerForm,
  downHeld: boolean,
  grounded: boolean,
  hasHeadroom: boolean,
): boolean {
  if (form === 'small') return false;
  if (!crouching) return downHeld && grounded;
  return downHeld || !hasHeadroom;
}
