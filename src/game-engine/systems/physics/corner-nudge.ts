export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function cornerNudge(
  box: Rect,
  dy: number,
  isSolidTile: (tx: number, ty: number) => boolean,
  tileSize: number,
  maxNudgePx: number,
): number {
  if (dy >= 0) {
    return 0;
  }
  const headRow = Math.floor((box.y + dy) / tileSize);
  const left = box.x;
  const right = box.x + box.width;
  const leftCol = Math.floor(left / tileSize);
  const rightCol = Math.floor((right - 1) / tileSize);
  const leftSolid = isSolidTile(leftCol, headRow);
  const rightSolid = isSolidTile(rightCol, headRow);
  if (leftSolid === rightSolid) {
    return 0;
  }
  if (leftSolid) {
    const overlap = (leftCol + 1) * tileSize - left;
    return overlap <= maxNudgePx ? overlap : 0;
  }
  const overlap = right - rightCol * tileSize;
  return overlap <= maxNudgePx ? -overlap : 0;
}
