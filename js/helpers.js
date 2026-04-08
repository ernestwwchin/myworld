// ═══════════════════════════════════════════════════════
// helpers.js — Pathfinding, line-of-sight, FOV, etc.
// ═══════════════════════════════════════════════════════

function isWallCell(cell) {
  return cell === TILE.WALL || cell === '#';
}

// Legacy: MAP no longer holds DOOR values after entity init.
// Kept for backward compat with any external callers.
function isDoorCell(cell) {
  return cell === TILE.DOOR || cell === 'D';
}

// 8-way directions: cardinals first (preferred for tied paths), then diagonals
const DIRS8 = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1},{x:1,y:1}];
// 4-way directions (kept for room-topology flood fill which should stay 4-way)
const DIRS4 = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];

function bfs(sx, sy, ex, ey, blockedFn) {
  if (blockedFn(ex, ey)) return [];
  const vis = Array.from({length:ROWS}, () => Array(COLS).fill(false));
  const par = Array.from({length:ROWS}, () => Array(COLS).fill(null));
  const q   = [{x:sx, y:sy}];
  vis[sy][sx] = true;
  while (q.length) {
    const c = q.shift();
    if (c.x===ex && c.y===ey) {
      const path = []; let n = {x:ex,y:ey};
      while (n) { path.unshift(n); n = par[n.y][n.x]; }
      return path.slice(1);
    }
    for (const d of DIRS8) {
      const nx=c.x+d.x, ny=c.y+d.y;
      if (nx<0||ny<0||nx>=COLS||ny>=ROWS||vis[ny][nx]) continue;
      if (blockedFn(nx, ny)) continue;
      // Diagonal: skip if both cardinal neighbours are blocked (corner cut)
      if (d.x !== 0 && d.y !== 0 && blockedFn(nx, c.y) && blockedFn(c.x, ny)) continue;
      vis[ny][nx] = true; par[ny][nx] = c; q.push({x:nx,y:ny});
    }
  }
  return [];
}

// Only block walls + locked/closed entities (used for pathfinding routing)
function wallBlk(x, y) {
  if (isWallCell(MAP[y][x])) return true;
  // Entity movement blocking (closed doors, etc.) via global callback
  if (typeof window._tileBlocksMovement === 'function' && window._tileBlocksMovement(x, y)) return true;
  return false;
}

// ── Line of Sight (Bresenham) ─────────────────────────
// Checks walls (MAP) and entity sight-blocking (global callback).
function hasLOS(x0, y0, x1, y1) {
  let dx=Math.abs(x1-x0), dy=Math.abs(y1-y0);
  let sx=x0<x1?1:-1, sy=y0<y1?1:-1, err=dx-dy;
  let cx=x0, cy=y0, first=true;
  while (true) {
    if (cx===x1 && cy===y1) return true;
    if (!first) {
      if (isWallCell(MAP[cy][cx])) return false;
      // Entity sight blocking (doors, etc.) via global callback
      if (typeof window._tileBlocksSight === 'function' && window._tileBlocksSight(cx, cy)) return false;
    }
    first = false;
    const e2 = 2*err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 <  dx) { err += dx; cy += sy; }
  }
}

// ── Field of View cone check ─────────────────────────
function inFOV(enemy, tx, ty) {
  const dx = tx - enemy.tx, dy = ty - enemy.ty;
  if (dx===0 && dy===0) return true;
  let diff = Math.atan2(dy, dx)*180/Math.PI - enemy.facing;
  while (diff >  180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff) <= enemy.fov / 2;
}

// ── Same open area check (flood fill, capped) ────────
function sameOpenArea(x0, y0, x1, y1, maxD) {
  if (Math.abs(x1-x0)+Math.abs(y1-y0) > maxD*2) return false;
  const vis = new Set(), key = (x,y) => x+','+y;
  const q = [{x:x0,y:y0,d:0}];
  vis.add(key(x0,y0));
  const dirs = DIRS4; // room area check stays 4-way
  while (q.length) {
    const c = q.shift();
    if (c.x===x1 && c.y===y1) return true;
    if (c.d >= maxD) continue;
    for (const d of dirs) {
      const nx=c.x+d.x, ny=c.y+d.y, k=key(nx,ny);
      if (vis.has(k)) continue;
      if (nx<0||ny<0||nx>=COLS||ny>=ROWS) continue;
      if (isWallCell(MAP[ny][nx])) continue;
      vis.add(k); q.push({x:nx,y:ny,d:c.d+1});
    }
  }
  return false;
}

// ── Room topology (room + side-room via doors) ─────
let _roomTopoCache = null;

function _buildRoomTopology() {
  const roomByKey = new Map();
  const doorToRooms = new Map();
  const sideByRoom = new Map();
  let nextRoomId = 1;
  const dirs = DIRS4;
  const key = (x, y) => x + ',' + y;

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const isWall = (x, y) => isWallCell(MAP[y][x]);
  const isDoor = (x, y) => isDoorCell(MAP[y][x]);
  const isRoomFloor = (x, y) => !isWall(x, y) && !isDoor(x, y);

  // Label each contiguous non-door walkable area as a room.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isRoomFloor(x, y)) continue;
      const startKey = key(x, y);
      if (roomByKey.has(startKey)) continue;

      const roomId = nextRoomId++;
      const q = [{ x, y }];
      roomByKey.set(startKey, roomId);

      while (q.length) {
        const c = q.shift();
        for (const d of dirs) {
          const nx = c.x + d.x, ny = c.y + d.y;
          if (!inBounds(nx, ny) || !isRoomFloor(nx, ny)) continue;
          const nk = key(nx, ny);
          if (roomByKey.has(nk)) continue;
          roomByKey.set(nk, roomId);
          q.push({ x: nx, y: ny });
        }
      }
    }
  }

  // Connect adjacent rooms through each door tile.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isDoor(x, y)) continue;
      const roomSet = new Set();
      for (const d of dirs) {
        const nx = x + d.x, ny = y + d.y;
        if (!inBounds(nx, ny)) continue;
        const rid = roomByKey.get(key(nx, ny));
        if (rid) roomSet.add(rid);
      }
      const rooms = [...roomSet];
      if (!rooms.length) continue;

      doorToRooms.set(key(x, y), rooms);
      for (const a of rooms) {
        if (!sideByRoom.has(a)) sideByRoom.set(a, new Set());
        for (const b of rooms) {
          if (a !== b) sideByRoom.get(a).add(b);
        }
      }
    }
  }

  _roomTopoCache = { roomByKey, doorToRooms, sideByRoom };
  return _roomTopoCache;
}

function _getRoomTopology() {
  if (_roomTopoCache) return _roomTopoCache;
  return _buildRoomTopology();
}

function roomIdAt(x, y) {
  const topo = _getRoomTopology();
  const k = x + ',' + y;
  if (topo.roomByKey.has(k)) return topo.roomByKey.get(k);

  // If tile is a door, attach it to one of its adjacent rooms.
  const dr = topo.doorToRooms.get(k);
  return dr && dr.length ? dr[0] : null;
}

function sameRoom(x0, y0, x1, y1) {
  const r0 = roomIdAt(x0, y0);
  const r1 = roomIdAt(x1, y1);
  return r0 !== null && r1 !== null && r0 === r1;
}

function sideRoom(x0, y0, x1, y1) {
  const r0 = roomIdAt(x0, y0);
  const r1 = roomIdAt(x1, y1);
  if (r0 === null || r1 === null || r0 === r1) return false;
  const topo = _getRoomTopology();
  const adj = topo.sideByRoom.get(r0);
  return !!(adj && adj.has(r1));
}

// ── Snap pixel position to nearest valid tile ────────
function snapToTile(px, py) {
  let tx = Math.max(0, Math.min(COLS-1, Math.round((px - S/2) / S)));
  let ty = Math.max(0, Math.min(ROWS-1, Math.round((py - S/2) / S)));
  if (isWallCell(MAP[ty][tx])) {
    tx = Math.max(0, Math.min(COLS-1, Math.floor((px - S/2) / S)));
    ty = Math.max(0, Math.min(ROWS-1, Math.floor((py - S/2) / S)));
  }
  return { x:tx, y:ty };
}
