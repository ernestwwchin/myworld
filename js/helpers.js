// ═══════════════════════════════════════════════════════
// helpers.js — Pathfinding, line-of-sight, FOV, etc.
// ═══════════════════════════════════════════════════════

function bfs(sx, sy, ex, ey, blockedFn) {
  if (blockedFn(ex, ey)) return [];
  const vis = Array.from({length:ROWS}, () => Array(COLS).fill(false));
  const par = Array.from({length:ROWS}, () => Array(COLS).fill(null));
  const q   = [{x:sx, y:sy}];
  vis[sy][sx] = true;
  const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
  while (q.length) {
    const c = q.shift();
    if (c.x===ex && c.y===ey) {
      const path = []; let n = {x:ex,y:ey};
      while (n) { path.unshift(n); n = par[n.y][n.x]; }
      return path.slice(1);
    }
    for (const d of dirs) {
      const nx=c.x+d.x, ny=c.y+d.y;
      if (nx<0||ny<0||nx>=COLS||ny>=ROWS||vis[ny][nx]) continue;
      if (blockedFn(nx, ny)) continue;
      vis[ny][nx] = true; par[ny][nx] = c; q.push({x:nx,y:ny});
    }
  }
  return [];
}

// Only block walls (used for pathfinding routing)
function wallBlk(x, y) { return MAP[y][x] === TILE.WALL; }

// ── Line of Sight (Bresenham) ─────────────────────────
function hasLOS(x0, y0, x1, y1) {
  let dx=Math.abs(x1-x0), dy=Math.abs(y1-y0);
  let sx=x0<x1?1:-1, sy=y0<y1?1:-1, err=dx-dy;
  let cx=x0, cy=y0, first=true;
  while (true) {
    if (cx===x1 && cy===y1) return true;
    if (!first && MAP[cy][cx]===TILE.WALL) return false;
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
  const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
  while (q.length) {
    const c = q.shift();
    if (c.x===x1 && c.y===y1) return true;
    if (c.d >= maxD) continue;
    for (const d of dirs) {
      const nx=c.x+d.x, ny=c.y+d.y, k=key(nx,ny);
      if (vis.has(k)) continue;
      if (nx<0||ny<0||nx>=COLS||ny>=ROWS) continue;
      if (MAP[ny][nx]===TILE.WALL) continue;
      vis.add(k); q.push({x:nx,y:ny,d:c.d+1});
    }
  }
  return false;
}

// ── Snap pixel position to nearest valid tile ────────
function snapToTile(px, py) {
  let tx = Math.max(0, Math.min(COLS-1, Math.round((px - S/2) / S)));
  let ty = Math.max(0, Math.min(ROWS-1, Math.round((py - S/2) / S)));
  if (MAP[ty][tx] === TILE.WALL) {
    tx = Math.max(0, Math.min(COLS-1, Math.floor((px - S/2) / S)));
    ty = Math.max(0, Math.min(ROWS-1, Math.floor((py - S/2) / S)));
  }
  return { x:tx, y:ty };
}
