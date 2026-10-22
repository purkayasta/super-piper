export function nextCameraScrollX(
  currentViewLeft: number,
  playerX: number,
  viewWidth: number,
  levelWidth: number,
  leadFraction: number,
): number {
  const target = playerX - viewWidth * leadFraction;
  const maxViewLeft = Math.max(0, levelWidth - viewWidth);
  return Math.min(maxViewLeft, Math.max(currentViewLeft, target));
}

export function clampToCameraLeft(playerLeft: number, viewLeft: number): number {
  return Math.max(playerLeft, viewLeft);
}
