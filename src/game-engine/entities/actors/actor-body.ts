export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ActorBody extends Box {
  vx: number;
  vy: number;
  onGround: boolean;
  hitLeft: boolean;
  hitRight: boolean;
  hitCeiling: boolean;
}

export type SolidQuery = (column: number, row: number) => boolean;

const EDGE_EPSILON = 1e-6;

export function createBody(width: number, height: number): ActorBody {
  return {
    x: 0,
    y: 0,
    width,
    height,
    vx: 0,
    vy: 0,
    onGround: false,
    hitLeft: false,
    hitRight: false,
    hitCeiling: false,
  };
}

export function placeBody(body: ActorBody, centerX: number, bottomY: number): void {
  body.x = centerX - body.width / 2;
  body.y = bottomY - body.height;
  body.vx = 0;
  body.vy = 0;
  body.onGround = false;
  body.hitLeft = false;
  body.hitRight = false;
  body.hitCeiling = false;
}

export function boxCenterX(box: Box): number {
  return box.x + box.width / 2;
}

export function boxBottom(box: Box): number {
  return box.y + box.height;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function applyGravity(
  body: ActorBody,
  gravity: number,
  maxFallSpeed: number,
  dt: number,
): number {
  const start = body.vy;
  const end = Math.min(maxFallSpeed, start + gravity * dt);
  body.vy = end;
  if (start >= maxFallSpeed) return end * dt;
  const reachTime = (maxFallSpeed - start) / gravity;
  if (reachTime >= dt) return ((start + end) / 2) * dt;
  return ((start + maxFallSpeed) / 2) * reachTime + maxFallSpeed * (dt - reachTime);
}

export function moveThroughTiles(
  body: ActorBody,
  dx: number,
  dy: number,
  tileSize: number,
  isSolid: SolidQuery,
): void {
  body.onGround = false;
  body.hitLeft = false;
  body.hitRight = false;
  body.hitCeiling = false;
  if (dx !== 0) moveHorizontally(body, dx, tileSize, isSolid);
  if (dy !== 0) moveVertically(body, dy, tileSize, isSolid);
}

function moveHorizontally(
  body: ActorBody,
  dx: number,
  tileSize: number,
  isSolid: SolidQuery,
): void {
  body.x += dx;
  const firstRow = Math.floor(body.y / tileSize);
  const lastRow = Math.floor((body.y + body.height - EDGE_EPSILON) / tileSize);
  if (dx > 0) {
    const column = Math.floor((body.x + body.width - EDGE_EPSILON) / tileSize);
    if (!solidInColumn(column, firstRow, lastRow, isSolid)) return;
    body.x = column * tileSize - body.width;
    body.hitRight = true;
    return;
  }
  const column = Math.floor(body.x / tileSize);
  if (!solidInColumn(column, firstRow, lastRow, isSolid)) return;
  body.x = (column + 1) * tileSize;
  body.hitLeft = true;
}

function moveVertically(body: ActorBody, dy: number, tileSize: number, isSolid: SolidQuery): void {
  body.y += dy;
  const firstColumn = Math.floor(body.x / tileSize);
  const lastColumn = Math.floor((body.x + body.width - EDGE_EPSILON) / tileSize);
  if (dy > 0) {
    const row = Math.floor((body.y + body.height - EDGE_EPSILON) / tileSize);
    if (!solidInRow(row, firstColumn, lastColumn, isSolid)) return;
    body.y = row * tileSize - body.height;
    body.vy = 0;
    body.onGround = true;
    return;
  }
  const row = Math.floor(body.y / tileSize);
  if (!solidInRow(row, firstColumn, lastColumn, isSolid)) return;
  body.y = (row + 1) * tileSize;
  body.vy = 0;
  body.hitCeiling = true;
}

function solidInColumn(
  column: number,
  firstRow: number,
  lastRow: number,
  isSolid: SolidQuery,
): boolean {
  for (let row = firstRow; row <= lastRow; row++) if (isSolid(column, row)) return true;
  return false;
}

function solidInRow(
  row: number,
  firstColumn: number,
  lastColumn: number,
  isSolid: SolidQuery,
): boolean {
  for (let column = firstColumn; column <= lastColumn; column++) {
    if (isSolid(column, row)) return true;
  }
  return false;
}
