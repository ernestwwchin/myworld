import { rng as rngStreams } from '@/rng';

export interface TileConstants {
  FLOOR: number;
  WALL: number;
  STAIRS: number;
  DOOR?: number;
  CHEST?: number;
  WATER?: number;
  GRASS?: number;
  [key: string]: number | undefined;
}

export interface GeneratorCfg {
  type?: string;
  seed?: number;
  cols?: number;
  rows?: number;
  width?: number;
  height?: number;
  fillPct?: number;
  steps?: number;
  depth?: number;
  minLeaf?: number;
  maxLeaf?: number;
  minRoomSize?: number;
  roomPad?: number;
  torches?: number;
  stairs?: boolean;
  chests?: boolean | number;
  doors?: boolean;
  [key: string]: unknown;
}

export interface GenLight { x: number; y: number; radius: number; level: string; }
export interface GenStageSprite { type: string; x: number; y: number; pulse?: boolean; }

export interface GenResult {
  grid: number[][];
  playerStart: { x: number; y: number };
  stairsPos: { x: number; y: number } | null;
  seed: number;
  lights?: GenLight[];
  stageSprites?: GenStageSprite[];
  rooms?: Room[];
}

interface Room {
  x1: number; y1: number; x2: number; y2: number;
  cx: number; cy: number;
  w: number; h: number;
}

function mapRng(): () => number {
  return rngStreams?.map ?? Math.random;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function caStep(grid: number[][], rows: number, cols: number, W: number, F: number): number[][] {
  return grid.map((row, y) =>
    row.map((_, x) => {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) return W;
      let walls = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (grid[y + dy]?.[x + dx] === W) walls++;
        }
      }
      return walls >= 5 ? W : F;
    }),
  );
}

function keepLargestRegion(grid: number[][], rows: number, cols: number, W: number, F: number): number[][] {
  const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
  let bestRegion: { x: number; y: number }[] = [];

  for (let sy = 1; sy < rows - 1; sy++) {
    for (let sx = 1; sx < cols - 1; sx++) {
      if (grid[sy][sx] !== F || visited[sy][sx]) continue;
      const region: { x: number; y: number }[] = [];
      const q: { x: number; y: number }[] = [{ x: sx, y: sy }];
      visited[sy][sx] = 1;
      while (q.length) {
        const { x, y } = q.shift()!;
        region.push({ x, y });
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx; const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          if (visited[ny][nx] || grid[ny][nx] !== F) continue;
          visited[ny][nx] = 1;
          q.push({ x: nx, y: ny });
        }
      }
      if (region.length > bestRegion.length) bestRegion = region;
    }
  }

  const regionSet = new Set(bestRegion.map((p) => p.y * cols + p.x));
  return grid.map((row, y) =>
    row.map((cell, x) => (cell === F && !regionSet.has(y * cols + x) ? W : cell)),
  );
}

function fallback(rows: number, cols: number, tile: TileConstants): GenResult {
  const W = tile.WALL; const F = tile.FLOOR;
  const grid = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) =>
      (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? W : F),
  );
  const cx = Math.floor(cols / 2); const cy = Math.floor(rows / 2);
  grid[cy][cx + 5] = tile.STAIRS;
  return { grid, playerStart: { x: cx - 5, y: cy }, stairsPos: { x: cx + 5, y: cy }, seed: 0 };
}

function cellularAutomata(cfg: GeneratorCfg, tile: TileConstants): GenResult {
  const cols = Number(cfg.cols || cfg.width || 56);
  const rows = Number(cfg.rows || cfg.height || 36);
  const fill = Number(cfg.fillPct || 48) / 100;
  const steps = Number(cfg.steps || 5);
  const seed = Number(cfg.seed || Math.floor(mapRng()() * 0xffffff));

  const r = rng(seed);
  const W = tile.WALL; const F = tile.FLOOR;

  let grid: number[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) =>
      (x === 0 || y === 0 || x === cols - 1 || y === rows - 1)
        ? W
        : (r() < fill ? W : F)),
  );

  for (let s = 0; s < steps; s++) {
    grid = caStep(grid, rows, cols, W, F);
  }

  grid = keepLargestRegion(grid, rows, cols, W, F);

  const floorTiles: { x: number; y: number }[] = [];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] === F) floorTiles.push({ x, y });
    }
  }

  if (floorTiles.length < 2) return fallback(rows, cols, tile);

  const cx = cols / 2; const cy = rows / 2;
  floorTiles.sort((a, b) =>
    (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((b.x - cx) ** 2 + (b.y - cy) ** 2));

  const playerStart = floorTiles[0];
  const stairsPos = floorTiles[floorTiles.length - 1];

  const placeStairs = cfg.stairs !== false;
  if (placeStairs) grid[stairsPos.y][stairsPos.x] = tile.STAIRS;

  const torchCount = Number(cfg.torches ?? Math.floor(floorTiles.length / 40));
  const lights: GenLight[] = [];
  const stageSprites: GenStageSprite[] = [];
  const torchCandidates = floorTiles.filter(({ x, y }) => {
    if (grid[y][x] !== tile.FLOOR) return false;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy]?.[x + dx] === tile.WALL);
  });
  const rng2 = rng(seed ^ 0xabcd);
  torchCandidates.sort(() => rng2() - 0.5);
  const minSpacing = 7;
  for (const c of torchCandidates) {
    if (lights.length >= torchCount) break;
    if (Math.abs(c.x - playerStart.x) + Math.abs(c.y - playerStart.y) < 3) continue;
    if (stairsPos && Math.abs(c.x - stairsPos.x) + Math.abs(c.y - stairsPos.y) < 3) continue;
    if (lights.some((l) => Math.abs(c.x - l.x) + Math.abs(c.y - l.y) < minSpacing)) continue;
    lights.push({ x: c.x, y: c.y, radius: 4, level: 'dim' });
    stageSprites.push({ type: 'torch', x: c.x, y: c.y, pulse: true });
  }

  return { grid, playerStart, stairsPos: placeStairs ? stairsPos : null, seed, lights, stageSprites };
}

function carveCorridor(
  grid: number[][],
  x: number, y: number,
  W: number, F: number,
  doorCandidates: { x: number; y: number }[],
  rooms: Room[],
): void {
  if (y < 1 || y >= grid.length - 1 || x < 1 || x >= grid[0].length - 1) return;
  const wasWall = grid[y][x] === W;
  grid[y][x] = F;
  if (wasWall) {
    const inRoom = rooms.some((r) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2);
    if (!inRoom) doorCandidates.push({ x, y });
  }
}

function bsp(cfg: GeneratorCfg, tile: TileConstants): GenResult {
  const cols = Number(cfg.cols || cfg.width || 56);
  const rows = Number(cfg.rows || cfg.height || 36);
  const depth = Number(cfg.depth || 0);
  const seed = Number(cfg.seed || Math.floor(mapRng()() * 0xffffff));
  const r = rng(seed);

  const baseMinLeaf = 8;
  const baseMaxLeaf = 20;
  const depthScale = Math.min(depth, 10);
  const minLeaf = Number(cfg.minLeaf || Math.max(6, baseMinLeaf - Math.floor(depthScale / 3)));
  const maxLeaf = Number(cfg.maxLeaf || Math.max(14, baseMaxLeaf - Math.floor(depthScale / 2)));
  const minRoomSize = Number(cfg.minRoomSize || 4);
  const roomPad = Number(cfg.roomPad || 1);
  const placeChests = cfg.chests !== false;
  const chestCount = Number(cfg.chests || Math.max(1, Math.floor(1 + depth / 2)));
  const placeDoors = cfg.doors !== false;

  const W = tile.WALL; const F = tile.FLOOR;

  const grid: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => W),
  );

  const leaves: { x: number; y: number; w: number; h: number }[] = [];
  const maxRecurse = 20;
  const splitNode = (x: number, y: number, w: number, h: number, recurseDepth: number): void => {
    if (recurseDepth > maxRecurse) { leaves.push({ x, y, w, h }); return; }

    const canSplitH = h >= minLeaf * 2;
    const canSplitV = w >= minLeaf * 2;

    const mustSplit = w > maxLeaf || h > maxLeaf;
    const wantSplit = canSplitH || canSplitV;
    if (!wantSplit || (!mustSplit && r() >= 0.7)) {
      leaves.push({ x, y, w, h });
      return;
    }

    let splitH: boolean;
    if (canSplitH && canSplitV) {
      if (w / h >= 1.25) splitH = false;
      else if (h / w >= 1.25) splitH = true;
      else splitH = r() < 0.5;
    } else {
      splitH = canSplitH;
    }

    if (splitH) {
      const range = h - minLeaf * 2;
      const split = minLeaf + Math.floor(r() * (range + 1));
      splitNode(x, y, w, split, recurseDepth + 1);
      splitNode(x, y + split, w, h - split, recurseDepth + 1);
    } else {
      const range = w - minLeaf * 2;
      const split = minLeaf + Math.floor(r() * (range + 1));
      splitNode(x, y, split, h, recurseDepth + 1);
      splitNode(x + split, y, w - split, h, recurseDepth + 1);
    }
  };
  splitNode(1, 1, cols - 2, rows - 2, 0);

  const rooms: Room[] = [];
  for (const leaf of leaves) {
    const rw = Math.max(minRoomSize, Math.floor(minRoomSize + r() * (leaf.w - minRoomSize - roomPad * 2)));
    const rh = Math.max(minRoomSize, Math.floor(minRoomSize + r() * (leaf.h - minRoomSize - roomPad * 2)));
    const rx = Math.floor(leaf.x + roomPad + r() * Math.max(0, leaf.w - rw - roomPad * 2));
    const ry = Math.floor(leaf.y + roomPad + r() * Math.max(0, leaf.h - rh - roomPad * 2));

    const x1 = Math.max(1, rx);
    const y1 = Math.max(1, ry);
    const x2 = Math.min(cols - 2, rx + rw - 1);
    const y2 = Math.min(rows - 2, ry + rh - 1);

    if (x2 - x1 < minRoomSize - 1 || y2 - y1 < minRoomSize - 1) continue;

    rooms.push({
      x1, y1, x2, y2,
      cx: Math.floor((x1 + x2) / 2),
      cy: Math.floor((y1 + y2) / 2),
      w: x2 - x1 + 1, h: y2 - y1 + 1,
    });

    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) grid[y][x] = F;
    }
  }

  if (rooms.length < 2) return fallback(rows, cols, tile);

  const connected = new Set<number>([0]);
  const corridors: [number, number][] = [];
  const remaining = new Set(rooms.map((_, i) => i).filter((i) => i > 0));

  while (remaining.size > 0) {
    let bestDist = Infinity; let bestFrom = 0; let bestTo = 0;
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

  const doorCandidates: { x: number; y: number }[] = [];
  for (const [ai, bi] of corridors) {
    const a = rooms[ai]; const b = rooms[bi];
    let cx = a.cx; let cy = a.cy;
    const tx = b.cx; const ty = b.cy;

    const hFirst = r() < 0.5;
    if (hFirst) {
      const xDir = tx > cx ? 1 : -1;
      while (cx !== tx) { carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms); cx += xDir; }
      const yDir = ty > cy ? 1 : -1;
      while (cy !== ty) { carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms); cy += yDir; }
    } else {
      const yDir = ty > cy ? 1 : -1;
      while (cy !== ty) { carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms); cy += yDir; }
      const xDir = tx > cx ? 1 : -1;
      while (cx !== tx) { carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms); cx += xDir; }
    }
    carveCorridor(grid, cx, cy, W, F, doorCandidates, rooms);
  }

  const playerStart = { x: rooms[0].cx, y: rooms[0].cy };

  let farthestIdx = 0; let farthestDist = 0;
  for (let i = 1; i < rooms.length; i++) {
    const d = Math.abs(rooms[i].cx - playerStart.x) + Math.abs(rooms[i].cy - playerStart.y);
    if (d > farthestDist) { farthestDist = d; farthestIdx = i; }
  }

  const placeStairs = cfg.stairs !== false;
  const stairsPos = { x: rooms[farthestIdx].cx, y: rooms[farthestIdx].cy };
  if (placeStairs) grid[stairsPos.y][stairsPos.x] = tile.STAIRS;

  if (placeChests && tile.CHEST != null) {
    const roomCorridorCount = rooms.map(() => 0);
    for (const [ai, bi] of corridors) { roomCorridorCount[ai]++; roomCorridorCount[bi]++; }

    const candidates = rooms
      .map((rm, i) => ({ room: rm, idx: i, conns: roomCorridorCount[i] }))
      .filter((c) => c.idx !== 0 && c.idx !== farthestIdx)
      .sort((a, b) => a.conns - b.conns || (a.room.w * a.room.h) - (b.room.w * b.room.h));

    let placed = 0;
    for (const c of candidates) {
      if (placed >= chestCount) break;
      const rm = c.room;
      const cx = rm.x1 + 1 + Math.floor(r() * Math.max(1, rm.w - 2));
      const cy = rm.y1 + 1 + Math.floor(r() * Math.max(1, rm.h - 2));
      if (grid[cy]?.[cx] === F) {
        grid[cy][cx] = tile.CHEST as number;
        placed++;
      }
    }
  }

  const doors: { x: number; y: number }[] = [];
  if (placeDoors && tile.DOOR != null) {
    for (const { x, y } of doorCandidates) {
      if (grid[y]?.[x] !== F) continue;
      const hWalls = (grid[y]?.[x - 1] === W ? 1 : 0) + (grid[y]?.[x + 1] === W ? 1 : 0);
      const vWalls = (grid[y - 1]?.[x] === W ? 1 : 0) + (grid[y + 1]?.[x] === W ? 1 : 0);
      if (hWalls === 2 || vWalls === 2) {
        if (doors.some((d) => Math.abs(d.x - x) + Math.abs(d.y - y) < 3)) continue;
        grid[y][x] = tile.DOOR as number;
        doors.push({ x, y });
      }
    }
  }

  const floorTiles: { x: number; y: number }[] = [];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] === F) floorTiles.push({ x, y });
    }
  }

  const torchCount = Number(cfg.torches ?? Math.max(rooms.length, Math.floor(floorTiles.length / 45)));
  const lights: GenLight[] = [];
  const stageSprites: GenStageSprite[] = [];
  const torchCandidates = floorTiles.filter(({ x, y }) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy]?.[x + dx] === W));
  const rng2 = rng(seed ^ 0x9e3779b9);
  torchCandidates.sort(() => rng2() - 0.5);
  const minSpacing = 6;
  for (const c of torchCandidates) {
    if (lights.length >= torchCount) break;
    if (Math.abs(c.x - playerStart.x) + Math.abs(c.y - playerStart.y) < 3) continue;
    if (stairsPos && Math.abs(c.x - stairsPos.x) + Math.abs(c.y - stairsPos.y) < 3) continue;
    if (lights.some((l) => Math.abs(c.x - l.x) + Math.abs(c.y - l.y) < minSpacing)) continue;
    lights.push({ x: c.x, y: c.y, radius: 4, level: 'dim' });
    stageSprites.push({ type: 'torch', x: c.x, y: c.y, pulse: true });
  }

  return {
    grid,
    playerStart,
    stairsPos: placeStairs ? stairsPos : null,
    seed,
    lights,
    stageSprites,
    rooms,
  };
}

function randomType(cfg: GeneratorCfg, tile: TileConstants): GenResult {
  const seed = Number(cfg.seed || Math.floor(mapRng()() * 0xffffff));
  const r = rng(seed);
  const pick = r() < 0.5 ? 'cellular_automata' : 'bsp';
  console.log(`[MapGen] random pick: ${pick} (seed=${seed})`);
  return MapGen.generate({ ...cfg, type: pick, seed }, tile);
}

export const MapGen = {
  generate(cfg: GeneratorCfg, tile: TileConstants): GenResult {
    const type = String(cfg.type || 'cellular_automata').toLowerCase();
    if (type === 'cellular_automata' || type === 'cave') return cellularAutomata(cfg, tile);
    if (type === 'bsp' || type === 'rooms') return bsp(cfg, tile);
    if (type === 'random' || type === 'mixed') return randomType(cfg, tile);
    throw new Error(`[MapGen] Unknown generator type: "${type}"`);
  },
  cellularAutomata,
  bsp,
  _rng: rng,
};

if (typeof window !== 'undefined') {
  (window as unknown as { MapGen: typeof MapGen }).MapGen = MapGen;
}
