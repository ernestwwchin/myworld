import { TILE, S, MAP, mapState, type TileSymbol } from '@/config';

export function isWallCell(cell: TileSymbol | undefined): boolean {
  return cell === TILE.WALL || cell === '#';
}

export function isDoorCell(cell: TileSymbol | undefined): boolean {
  return cell === TILE.DOOR || cell === 'D';
}

export function withHotbar<T>(callback: (h: unknown) => T): T | undefined {
  const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
  if (!w || typeof w.Hotbar === 'undefined') return undefined;
  return callback(w.Hotbar);
}

export function withSidePanel<T>(callback: (p: unknown) => T): T | undefined {
  const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
  if (!w || typeof w.SidePanel === 'undefined') return undefined;
  return callback(w.SidePanel);
}

export function withCombatLog<T>(callback: (l: unknown) => T): T | undefined {
  const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
  if (!w || typeof w.CombatLog === 'undefined') return undefined;
  return callback(w.CombatLog);
}

export interface Dir { x: number; y: number; }

export const DIRS8: Dir[] = [
  { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
  { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
];

export const DIRS4: Dir[] = [
  { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
];

export type BlockedFn = (x: number, y: number) => boolean;

export function bfs(
  sx: number, sy: number,
  ex: number, ey: number,
  blockedFn: BlockedFn,
): { x: number; y: number }[] {
  if (blockedFn(ex, ey)) return [];
  const ROWS = mapState.rows;
  const COLS = mapState.cols;
  const vis = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const par: ({ x: number; y: number } | null)[][] = Array.from(
    { length: ROWS },
    () => Array(COLS).fill(null),
  );
  const q: { x: number; y: number }[] = [{ x: sx, y: sy }];
  vis[sy][sx] = true;
  while (q.length) {
    const c = q.shift()!;
    if (c.x === ex && c.y === ey) {
      const path: { x: number; y: number }[] = [];
      let n: { x: number; y: number } | null = { x: ex, y: ey };
      while (n) {
        path.unshift(n);
        n = par[n.y][n.x];
      }
      return path.slice(1);
    }
    for (const d of DIRS8) {
      const nx = c.x + d.x;
      const ny = c.y + d.y;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || vis[ny][nx]) continue;
      if (blockedFn(nx, ny)) continue;
      if (d.x !== 0 && d.y !== 0 && blockedFn(nx, c.y) && blockedFn(c.x, ny)) continue;
      vis[ny][nx] = true;
      par[ny][nx] = c;
      q.push({ x: nx, y: ny });
    }
  }
  return [];
}

export function wallBlk(x: number, y: number): boolean {
  if (isWallCell(MAP[y]?.[x])) return true;
  const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
  const tileBlocksMovement = w?._tileBlocksMovement as ((x: number, y: number) => boolean) | undefined;
  if (typeof tileBlocksMovement === 'function' && tileBlocksMovement(x, y)) return true;
  return false;
}

export function hasLOS(x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;
  let first = true;
  const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
  const tileBlocksSight = w?._tileBlocksSight as ((x: number, y: number) => boolean) | undefined;
  for (;;) {
    if (cx === x1 && cy === y1) return true;
    if (!first) {
      if (isWallCell(MAP[cy]?.[cx])) return false;
      if (typeof tileBlocksSight === 'function' && tileBlocksSight(cx, cy)) return false;
    }
    first = false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
}

export function lineTiles(
  x0: number, y0: number,
  x1: number, y1: number,
): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    tiles.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return tiles;
}

export function stringPull(
  path: { x: number; y: number }[],
  start: { x: number; y: number },
): { x: number; y: number }[] {
  if (path.length <= 2) return path;
  const pts = [start, ...path];
  const result: { x: number; y: number }[] = [];
  let i = 0;
  while (i < pts.length - 1) {
    let best = i + 1;
    for (let j = pts.length - 1; j > i + 1; j--) {
      if (!hasLOS(pts[i].x, pts[i].y, pts[j].x, pts[j].y)) continue;
      const line = lineTiles(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
      let valid = true;
      for (let k = 1; k < line.length; k++) {
        const ddx = line[k].x - line[k - 1].x;
        const ddy = line[k].y - line[k - 1].y;
        if (ddx !== 0 && ddy !== 0) {
          const cx = MAP?.[line[k - 1].y]?.[line[k - 1].x + ddx];
          const cy = MAP?.[line[k - 1].y + ddy]?.[line[k - 1].x];
          if (isWallCell(cx) && isWallCell(cy)) { valid = false; break; }
        }
      }
      if (valid) { best = j; break; }
    }
    const line = lineTiles(pts[i].x, pts[i].y, pts[best].x, pts[best].y);
    for (let k = 1; k < line.length; k++) result.push(line[k]);
    i = best;
  }
  return result;
}

export interface EnemyFOVShape {
  tx: number; ty: number;
  facing: number; fov: number;
}

export function inFOV(enemy: EnemyFOVShape, tx: number, ty: number): boolean {
  const dx = tx - enemy.tx;
  const dy = ty - enemy.ty;
  if (dx === 0 && dy === 0) return true;
  let diff = Math.atan2(dy, dx) * 180 / Math.PI - enemy.facing;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff) <= enemy.fov / 2;
}

export function sameOpenArea(
  x0: number, y0: number,
  x1: number, y1: number,
  maxD: number,
): boolean {
  if (Math.abs(x1 - x0) + Math.abs(y1 - y0) > maxD * 2) return false;
  const ROWS = mapState.rows;
  const COLS = mapState.cols;
  const vis = new Set<string>();
  const key = (x: number, y: number) => x + ',' + y;
  const q: { x: number; y: number; d: number }[] = [{ x: x0, y: y0, d: 0 }];
  vis.add(key(x0, y0));
  const dirs = DIRS4;
  while (q.length) {
    const c = q.shift()!;
    if (c.x === x1 && c.y === y1) return true;
    if (c.d >= maxD) continue;
    for (const d of dirs) {
      const nx = c.x + d.x;
      const ny = c.y + d.y;
      const k = key(nx, ny);
      if (vis.has(k)) continue;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (isWallCell(MAP[ny][nx])) continue;
      vis.add(k);
      q.push({ x: nx, y: ny, d: c.d + 1 });
    }
  }
  return false;
}

interface RoomTopology {
  roomByKey: Map<string, number>;
  doorToRooms: Map<string, number[]>;
  sideByRoom: Map<number, Set<number>>;
}

let _roomTopoCache: RoomTopology | null = null;

export function _resetRoomTopologyCache(): void {
  _roomTopoCache = null;
}

function _buildRoomTopology(): RoomTopology {
  const roomByKey = new Map<string, number>();
  const doorToRooms = new Map<string, number[]>();
  const sideByRoom = new Map<number, Set<number>>();
  let nextRoomId = 1;
  const dirs = DIRS4;
  const key = (x: number, y: number) => x + ',' + y;

  const ROWS = mapState.rows;
  const COLS = mapState.cols;
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const isWall = (x: number, y: number) => isWallCell(MAP[y][x]);
  const isDoor = (x: number, y: number) => isDoorCell(MAP[y][x]);
  const isRoomFloor = (x: number, y: number) => !isWall(x, y) && !isDoor(x, y);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isRoomFloor(x, y)) continue;
      const startKey = key(x, y);
      if (roomByKey.has(startKey)) continue;

      const roomId = nextRoomId++;
      const q: { x: number; y: number }[] = [{ x, y }];
      roomByKey.set(startKey, roomId);

      while (q.length) {
        const c = q.shift()!;
        for (const d of dirs) {
          const nx = c.x + d.x;
          const ny = c.y + d.y;
          if (!inBounds(nx, ny) || !isRoomFloor(nx, ny)) continue;
          const nk = key(nx, ny);
          if (roomByKey.has(nk)) continue;
          roomByKey.set(nk, roomId);
          q.push({ x: nx, y: ny });
        }
      }
    }
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isDoor(x, y)) continue;
      const roomSet = new Set<number>();
      for (const d of dirs) {
        const nx = x + d.x;
        const ny = y + d.y;
        if (!inBounds(nx, ny)) continue;
        const rid = roomByKey.get(key(nx, ny));
        if (rid) roomSet.add(rid);
      }
      const rooms = [...roomSet];
      if (!rooms.length) continue;

      doorToRooms.set(key(x, y), rooms);
      for (const a of rooms) {
        if (!sideByRoom.has(a)) sideByRoom.set(a, new Set<number>());
        for (const b of rooms) {
          if (a !== b) sideByRoom.get(a)!.add(b);
        }
      }
    }
  }

  _roomTopoCache = { roomByKey, doorToRooms, sideByRoom };
  return _roomTopoCache;
}

function _getRoomTopology(): RoomTopology {
  if (_roomTopoCache) return _roomTopoCache;
  return _buildRoomTopology();
}

export function roomIdAt(x: number, y: number): number | null {
  const topo = _getRoomTopology();
  const k = x + ',' + y;
  if (topo.roomByKey.has(k)) return topo.roomByKey.get(k)!;

  const dr = topo.doorToRooms.get(k);
  return dr && dr.length ? dr[0] : null;
}

export function sameRoom(x0: number, y0: number, x1: number, y1: number): boolean {
  const r0 = roomIdAt(x0, y0);
  const r1 = roomIdAt(x1, y1);
  return r0 !== null && r1 !== null && r0 === r1;
}

export function sideRoom(x0: number, y0: number, x1: number, y1: number): boolean {
  const r0 = roomIdAt(x0, y0);
  const r1 = roomIdAt(x1, y1);
  if (r0 === null || r1 === null || r0 === r1) return false;
  const topo = _getRoomTopology();
  const adj = topo.sideByRoom.get(r0);
  return !!(adj && adj.has(r1));
}

export function snapToTile(px: number, py: number): { x: number; y: number } {
  const ROWS = mapState.rows;
  const COLS = mapState.cols;
  let tx = Math.max(0, Math.min(COLS - 1, Math.round((px - S / 2) / S)));
  let ty = Math.max(0, Math.min(ROWS - 1, Math.round((py - S / 2) / S)));
  if (isWallCell(MAP[ty][tx])) {
    tx = Math.max(0, Math.min(COLS - 1, Math.floor((px - S / 2) / S)));
    ty = Math.max(0, Math.min(ROWS - 1, Math.floor((py - S / 2) / S)));
  }
  return { x: tx, y: ty };
}

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.isWallCell = isWallCell;
  w.isDoorCell = isDoorCell;
  w.withHotbar = withHotbar;
  w.withSidePanel = withSidePanel;
  w.withCombatLog = withCombatLog;
  w.DIRS8 = DIRS8;
  w.DIRS4 = DIRS4;
  w.bfs = bfs;
  w.wallBlk = wallBlk;
  w.hasLOS = hasLOS;
  w.lineTiles = lineTiles;
  w.stringPull = stringPull;
  w.inFOV = inFOV;
  w.sameOpenArea = sameOpenArea;
  w.roomIdAt = roomIdAt;
  w.sameRoom = sameRoom;
  w.sideRoom = sideRoom;
  w.snapToTile = snapToTile;
}
