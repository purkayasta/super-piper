export function stripScreenX(
  viewLeft: number,
  scrollFactor: number,
  driftPx: number,
  stripWidth: number,
): number {
  const scrolled = viewLeft * scrollFactor - driftPx;
  return -(((scrolled % stripWidth) + stripWidth) % stripWidth);
}

export function stripCopiesNeeded(stripWidth: number, viewWidth: number): number {
  return Math.ceil(viewWidth / stripWidth) + 1;
}

export function advanceDrift(
  driftPx: number,
  speedPxPerSecond: number,
  dtSeconds: number,
  stripWidth: number,
): number {
  const next = driftPx + speedPxPerSecond * dtSeconds;
  return ((next % stripWidth) + stripWidth) % stripWidth;
}
