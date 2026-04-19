// ═══════════════════════════════════════════════════════
// mapgen.js — Procedural map generators
// Called by ModLoader when a stage declares `generator:`
// instead of a static `grid:`.
// ═══════════════════════════════════════════════════════

const MapGen = {

  /**
   * Entry point. Dispatches to the correct generator based on cfg.type.
   * Returns a plain numeric grid (array of arrays of TILE constants).
   *
   * @param {object} cfg  - generator config from stage.yaml
   * @param {object} tile - TILE constants { FLOOR, WALL, STAIRS, ... }
   * @returns {{ grid: number[][], playerStart: {x,y}, stairsPos: {x,y}|null, seed: number }}
   */
  generate(cfg, tile) {
    const type = String(cfg.type || 'cellular_automata').toLowerCase();
    if (type === 'cellular_automata' || type === 'cave') {
      return this.cellularAutomata(cfg, tile);
    }
    if (type === 'bsp' || type === 'rooms') {
      return this.bsp(cfg, tile);
    }
    if (type === 'random' || type === 'mixed') {
      return this._randomType(cfg, tile);
    }
    throw new Error(`[MapGen] Unknown generator type: "${type}"`);
  },

  /**
   * Randomly pick between cellular_automata and bsp using the map seed.
   * Deterministic: same seed always picks the same style.
   */
  _randomType(cfg, tile) {
    const _mapRng = window.rng?.map ?? Math.random;
    const seed = Number(cfg.seed || Math.floor(_mapRng() * 0xFFFFFF));
    const rng = this._rng(seed);
    const pick = rng() < 0.5 ? 'cellular_automata' : 'bsp';
    console.log(`[MapGen] random pick: ${pick} (seed=${seed})`);
    return this.generate({ ...cfg, type: pick, seed }, tile);
  },

  // ─────────────────────────────────────────────────────
  // CELLULAR AUTOMATA — organic cave-like maps
  // ─────────────────────────────────────────────────────
  cellularAutomata(cfg, tile) {
    const cols   = Number(cfg.cols   || cfg.width  || 56);
    const rows   = Number(cfg.rows   || cfg.height || 36);
    const fill   = Number(cfg.fillPct || 48) / 100;  // % of cells start as wall
    const steps  = Number(cfg.steps  || 5);
    // If an explicit seed is provided in config use it; otherwise draw from the
    // dedicated map RNG stream so procedural maps are deterministic without
    // consuming from the logic stream (which would shift dice/loot rolls).
    const _mapRng = window.rng?.map ?? Math.random;
    const seed   = Number(cfg.seed   || Math.floor(_mapRng() * 0xFFFFFF));

    const rng = this._rng(seed);
    const W = tile.WALL, F = tile.FLOOR;

    // 1. Random fill
    let grid = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) =>
        (x === 0 || y === 0 || x === cols - 1 || y === rows - 1)
          ? W  // always wall at border
          : (rng() < fill ? W : F)
      )
    );

    // 2. Smooth with CA rules
    for (let s = 0; s < steps; s++) {
      grid = this._caStep(grid, rows, cols, W, F);
    }

    // 3. Keep only the largest connected floor region (flood fill)
    grid = this._keepLargestRegion(grid, rows, cols, W, F);

    // 4. Find all floor tiles, pick player start and stairs
    const floorTiles = [];
    for (let y = 1; y < rows - 1; y++)
      for (let x = 1; x < cols - 1; x++)
        if (grid[y][x] === F) floorTiles.push({ x, y });

    if (floorTiles.length < 2) {
      // Degenerate map — fallback to a minimal open room
      return this._fallback(rows, cols, tile);
    }

    // Sort by distance from center to pick far-apart points
    const cx = cols / 2, cy = rows / 2;
    floorTiles.sort((a, b) =>
      (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((b.x - cx) ** 2 + (b.y - cy) ** 2)
    );

    const playerStart = floorTiles[0];                    // closest to center
    const stairsPos   = floorTiles[floorTiles.length - 1]; // farthest from center

    // 5. Place stairs if requested
    const placeStairs = cfg.stairs !== false;
    if (placeStairs) grid[stairsPos.y][stairsPos.x] = tile.STAIRS;

    // 6. Auto-place torches — find floor tiles adjacent to a wall, spread them out
    const torchCount = Number(cfg.torches ?? Math.floor(floorTiles.length / 40));
    const lights = [], stageSprites = [];
    const torchCandidates = floorTiles.filter(({ x, y }) => {
      if (grid[y][x] !== tile.FLOOR) return false; // skip stairs/etc
      // Must have at least one wall neighbour (natural torch placement on a wall)
      return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => grid[y+dy]?.[x+dx] === tile.WALL);
    });
    // Shuffle deterministically then pick spread-out torches
    const rng2 = this._rng(seed ^ 0xABCD);
    torchCandidates.sort(() => rng2() - 0.5);
    const minSpacing = 7;
    for (const c of torchCandidates) {
      if (lights.length >= torchCount) break;
      // Skip if too close to player start or stairs
      if (Math.abs(c.x - playerStart.x) + Math.abs(c.y - playerStart.y) < 3) continue;
      if (stairsPos && Math.abs(c.x - stairsPos.x) + Math.abs(c.y - stairsPos.y) < 3) continue;
      // Skip if too close to another torch
      if (lights.some(l => Math.abs(c.x - l.x) + Math.abs(c.y - l.y) < minSpacing)) continue;
      lights.push({ x: c.x, y: c.y, radius: 4, level: 'dim' });
      stageSprites.push({ type: 'torch', x: c.x, y: c.y, pulse: true });
    }

    return { grid, playerStart, stairsPos: placeStairs ? stairsPos : null, seed, lights, stageSprites };
  },

  // ─────────────────────────────────────────────────────
  // BSP (Binary Space Partition) — room + corridor maps
  // ─────────────────────────────────────────────────────
  bsp(cfg, tile) {
    const cols   = Number(cfg.cols   || cfg.width  || 56);
    const rows   = Number(cfg.rows   || cfg.height || 36);
    const depth  = Number(cfg.depth  || 0);
    const _mapRng = window.rng?.map ?? Math.random;
    const seed   = Number(cfg.seed   || Math.floor(_mapRng() * 0xFFFFFF));
    const rng    = this._rng(seed);

    // Depth-based scaling: deeper floors → more rooms (smaller leaves)
    // Users can override via minLeaf / maxLeaf in the generator config.
    const baseMinLeaf = 8;
    const baseMaxLeaf = 20;
    const depthScale  = Math.min(depth, 10);
    const minLeaf = Number(cfg.minLeaf || Math.max(6,  baseMinLeaf - Math.floor(depthScale / 3)));
    const maxLeaf = Number(cfg.maxLeaf || Math.max(14, baseMaxLeaf - Math.floor(depthScale / 2)));
    const minRoomSize = Number(cfg.minRoomSize || 4);
    const roomPad     = Number(cfg.roomPad || 1);    // wall padding around rooms
    const placeChests = cfg.chests !== false;
    const chestCount  = Number(cfg.chests || Math.max(1, Math.floor(1 + depth / 2)));
    const placeDoors  = cfg.doors !== false;

    const W = tile.WALL, F = tile.FLOOR;

    // 1. Init grid as all walls
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => W)
    );

    // 2. BSP split
    const leaves = [];
    const maxRecurse = 20;
    const splitNode = (x, y, w, h, recurseDepth) => {
      if (recurseDepth > maxRecurse) { leaves.push({ x, y, w, h }); return; }

      const canSplitH = h >= minLeaf * 2;
      const canSplitV = w >= minLeaf * 2;

      // Decide whether to split
      const mustSplit = w > maxLeaf || h > maxLeaf;
      const wantSplit = canSplitH || canSplitV;
      if (!wantSplit || (!mustSplit && rng() >= 0.7)) {
        leaves.push({ x, y, w, h });
        return;
      }

      // Pick split direction
      let splitH;
      if (canSplitH && canSplitV) {
        if (w / h >= 1.25) splitH = false;
        else if (h / w >= 1.25) splitH = true;
        else splitH = rng() < 0.5;
      } else {
        splitH = canSplitH;
      }

      if (splitH) {
        const range = h - minLeaf * 2;
        const split = minLeaf + Math.floor(rng() * (range + 1));
        splitNode(x, y, w, split, recurseDepth + 1);
        splitNode(x, y + split, w, h - split, recurseDepth + 1);
      } else {
        const range = w - minLeaf * 2;
        const split = minLeaf + Math.floor(rng() * (range + 1));
        splitNode(x, y, split, h, recurseDepth + 1);
        splitNode(x + split, y, w - split, h, recurseDepth + 1);
      }
    };
    splitNode(1, 1, cols - 2, rows - 2, 0);

    // 3. Create a room inside each leaf
    const rooms = [];
    for (const leaf of leaves) {
      const rw = Math.max(minRoomSize, Math.floor(minRoomSize + rng() * (leaf.w - minRoomSize - roomPad * 2)));
      const rh = Math.max(minRoomSize, Math.floor(minRoomSize + rng() * (leaf.h - minRoomSize - roomPad * 2)));
      const rx = Math.floor(leaf.x + roomPad + rng() * Math.max(0, leaf.w - rw - roomPad * 2));
      const ry = Math.floor(leaf.y + roomPad + rng() * Math.max(0, leaf.h - rh - roomPad * 2));

      // Clamp to grid bounds
      const x1 = Math.max(1, rx);
      const y1 = Math.max(1, ry);
      const x2 = Math.min(cols - 2, rx + rw - 1);
      const y2 = Math.min(rows - 2, ry + rh - 1);

      if (x2 - x1 < minRoomSize - 1 || y2 - y1 < minRoomSize - 1) continue;

      rooms.push({ x1, y1, x2, y2,
        cx: Math.floor((x1 + x2) / 2),
        cy: Math.floor((y1 + y2) / 2),
        w: x2 - x1 + 1, h: y2 - y1 + 1
      });

      // Carve room
      for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
          grid[y][x] = F;
    }

    if (rooms.length < 2) {
      return this._fallback(rows, cols, tile);
    }

    // 4. Connect rooms with L-shaped corridors (MST-like: connect each room to nearest unconnected)
    const connected = new Set([0]);
    const corridors = [];
    const remaining = new Set(rooms.map((_, i) => i).filter(i => i > 0));

    while (remaining.size > 0) {
      let bestDist = Infinity, bestFrom = 0, bestTo = 0;
      for (const ci of connected) {
        for (const ri of remaining) {
          const d = Math.abs(rooms[ci].cx - rooms[ri].cx) + Math.abs(rooms[ci].cy - rooms[ri].cy);
          if (d < bestDist) { bestDist = d; bestFrom = ci; bestTo = ri; }
        }
      }
      connected.add(bestTo);
      remaining.delete(bestTo);
      corridors.push([bestFrom, bestTo]);
    }

    // Carve corridors
    const doorCandidates = [];
    for (const [ai, bi] of corridors) {
      const a = rooms[ai], b = rooms[bi];
      let cx = a.cx, cy = a.cy;
      const tx = b.cx, ty = b.cy;

      // L-shaped: go horizontal first or vertical first (random)
      const hFirst = rng() < 0.5;
      if (hFirst) {
        // Horizontal leg
        const xDir = tx > cx ? 1 : -1;
        while (cx !== tx) { this._carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms); cx += xDir; }
        // Vertical leg
        const yDir = ty > cy ? 1 : -1;
        while (cy !== ty) { this._carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms); cy += yDir; }
      } else {
        // Vertical leg
        const yDir = ty > cy ? 1 : -1;
        while (cy !== ty) { this._carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms); cy += yDir; }
        // Horizontal leg
        const xDir = tx > cx ? 1 : -1;
        while (cx !== tx) { this._carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms); cx += xDir; }
      }
      // Carve final tile
      this._carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms);
    }

    // 5. Pick player start (center of first room) and stairs (center of farthest room)
    const playerStart = { x: rooms[0].cx, y: rooms[0].cy };

    // Find room farthest from player start (by Manhattan distance)
    let farthestIdx = 0, farthestDist = 0;
    for (let i = 1; i < rooms.length; i++) {
      const d = Math.abs(rooms[i].cx - playerStart.x) + Math.abs(rooms[i].cy - playerStart.y);
      if (d > farthestDist) { farthestDist = d; farthestIdx = i; }
    }

    const placeStairs = cfg.stairs !== false;
    const stairsPos = { x: rooms[farthestIdx].cx, y: rooms[farthestIdx].cy };
    if (placeStairs) grid[stairsPos.y][stairsPos.x] = tile.STAIRS;

    // 6. Place chests in dead-end / small rooms (not start or stairs room)
    const chestsPlaced = [];
    if (placeChests && tile.CHEST != null) {
      // Rank rooms by connectivity (fewest corridors → most isolated)
      const roomCorridorCount = rooms.map(() => 0);
      for (const [ai, bi] of corridors) { roomCorridorCount[ai]++; roomCorridorCount[bi]++; }

      const candidates = rooms
        .map((r, i) => ({ room: r, idx: i, conns: roomCorridorCount[i] }))
        .filter(c => c.idx !== 0 && c.idx !== farthestIdx)
        .sort((a, b) => a.conns - b.conns || (a.room.w * a.room.h) - (b.room.w * b.room.h));

      let placed = 0;
      for (const c of candidates) {
        if (placed >= chestCount) break;
        // Place chest in a corner of the room
        const r = c.room;
        const cx = r.x1 + 1 + Math.floor(rng() * Math.max(1, r.w - 2));
        const cy = r.y1 + 1 + Math.floor(rng() * Math.max(1, r.h - 2));
        if (grid[cy]?.[cx] === F) {
          grid[cy][cx] = tile.CHEST;
          chestsPlaced.push({ x: cx, y: cy });
          placed++;
        }
      }
    }

    // 7. Place doors at corridor-room junctions
    const doors = [];
    if (placeDoors && tile.DOOR != null) {
      // Filter valid door candidates: corridor tiles that border exactly 2 walls on opposite sides
      for (const { x, y } of doorCandidates) {
        if (grid[y]?.[x] !== F) continue;
        // Check if this is a "doorway" (wall on both sides horizontally or vertically)
        const hWalls = (grid[y]?.[x-1] === W ? 1 : 0) + (grid[y]?.[x+1] === W ? 1 : 0);
        const vWalls = (grid[y-1]?.[x] === W ? 1 : 0) + (grid[y+1]?.[x] === W ? 1 : 0);
        if (hWalls === 2 || vWalls === 2) {
          // Don't place doors too close to each other
          if (doors.some(d => Math.abs(d.x - x) + Math.abs(d.y - y) < 3)) continue;
          grid[y][x] = tile.DOOR;
          doors.push({ x, y });
        }
      }
    }

    // 8. Auto-place torches in rooms (wall-adjacent floor tiles, spread out)
    const floorTiles = [];
    for (let y = 1; y < rows - 1; y++)
      for (let x = 1; x < cols - 1; x++)
        if (grid[y][x] === F) floorTiles.push({ x, y });

    const torchCount = Number(cfg.torches ?? Math.max(rooms.length, Math.floor(floorTiles.length / 45)));
    const lights = [], stageSprites = [];
    const torchCandidates = floorTiles.filter(({ x, y }) => {
      // Must have at least one wall neighbour
      return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => grid[y+dy]?.[x+dx] === W);
    });
    const rng2 = this._rng(seed ^ 0x9E3779B9);
    torchCandidates.sort(() => rng2() - 0.5);
    const minSpacing = 6;
    for (const c of torchCandidates) {
      if (lights.length >= torchCount) break;
      if (Math.abs(c.x - playerStart.x) + Math.abs(c.y - playerStart.y) < 3) continue;
      if (stairsPos && Math.abs(c.x - stairsPos.x) + Math.abs(c.y - stairsPos.y) < 3) continue;
      if (lights.some(l => Math.abs(c.x - l.x) + Math.abs(c.y - l.y) < minSpacing)) continue;
      lights.push({ x: c.x, y: c.y, radius: 4, level: 'dim' });
      stageSprites.push({ type: 'torch', x: c.x, y: c.y, pulse: true });
    }

    return {
      grid, playerStart,
      stairsPos: placeStairs ? stairsPos : null,
      seed, lights, stageSprites,
      rooms,  // expose for debugging / encounter placement
    };
  },

  /** Carve a single corridor tile; track transitions from wall→floor for door candidates */
  _carveCorridor(grid, x, y, W, F, doorCandidates, rooms) {
    if (y < 1 || y >= grid.length - 1 || x < 1 || x >= grid[0].length - 1) return;
    const wasWall = grid[y][x] === W;
    grid[y][x] = F;
    // If this tile is at the edge of a room, it's a door candidate
    if (wasWall) {
      const inRoom = rooms.some(r => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2);
      if (!inRoom) doorCandidates.push({ x, y });
    }
  },



  // ─────────────────────────────────────────────────────
  // INTERNALS
  // ─────────────────────────────────────────────────────

  /** One CA smoothing step: a cell becomes wall if ≥5 of its 8 neighbours are walls */
  _caStep(grid, rows, cols, W, F) {
    return grid.map((row, y) =>
      row.map((_, x) => {
        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) return W;
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (grid[y + dy]?.[x + dx] === W) walls++;
        return walls >= 5 ? W : F;
      })
    );
  },

  /** Flood fill — keep only the largest connected floor region, fill rest with walls */
  _keepLargestRegion(grid, rows, cols, W, F) {
    const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
    let bestRegion = [];

    for (let sy = 1; sy < rows - 1; sy++) {
      for (let sx = 1; sx < cols - 1; sx++) {
        if (grid[sy][sx] !== F || visited[sy][sx]) continue;
        // BFS
        const region = [];
        const q = [{ x: sx, y: sy }];
        visited[sy][sx] = 1;
        while (q.length) {
          const { x, y } = q.shift();
          region.push({ x, y });
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            if (visited[ny][nx] || grid[ny][nx] !== F) continue;
            visited[ny][nx] = 1;
            q.push({ x: nx, y: ny });
          }
        }
        if (region.length > bestRegion.length) bestRegion = region;
      }
    }

    // Fill everything that isn't in bestRegion with wall
    const regionSet = new Set(bestRegion.map(p => p.y * cols + p.x));
    return grid.map((row, y) =>
      row.map((cell, x) =>
        (cell === F && !regionSet.has(y * cols + x)) ? W : cell
      )
    );
  },

  /** Minimal open room fallback for degenerate maps */
  _fallback(rows, cols, tile) {
    const W = tile.WALL, F = tile.FLOOR;
    const grid = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) =>
        (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? W : F
      )
    );
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    grid[cy][cx + 5] = tile.STAIRS;
    return { grid, playerStart: { x: cx - 5, y: cy }, stairsPos: { x: cx + 5, y: cy }, seed: 0 };
  },

  /** Simple mulberry32 PRNG — deterministic, seedable */
  _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

};
