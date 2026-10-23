export const SCORE_DIGITS = 6;
export const COIN_DIGITS = 2;
export const TIME_DIGITS = 3;

export function padCounter(value: number, digits: number): string {
  const whole = Math.max(0, Math.floor(value));
  const ceiling = 10 ** digits - 1;
  return String(Math.min(whole, ceiling)).padStart(digits, '0');
}
