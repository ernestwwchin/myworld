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
    throw new Error(`[MapGen] Unknown generator type: "${type}"`);
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
