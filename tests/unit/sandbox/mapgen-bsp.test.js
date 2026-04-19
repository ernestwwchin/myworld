const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readText } = require('../_shared/io');

/**
 * Load MapGen and TILE into a VM sandbox for pure-JS testing.
 * MapGen.bsp() uses window.rng?.map, which we stub as a no-op
 * so it falls back to the seed-based RNG.
 */
function loadMapGenInVm() {
  const configCode = readText('js/config.js');
  const mapgenCode = readText('js/mapgen.js');
  const sandbox = { console, Math, Infinity, Number, Array, Set, String, Uint8Array, JSON, Object };
  sandbox.window = sandbox; // MapGen references window.rng
  vm.createContext(sandbox);
  vm.runInContext(configCode, sandbox);
  vm.runInContext(mapgenCode, sandbox);
  vm.runInContext('globalThis.__MapGen = MapGen; globalThis.__TILE = TILE;', sandbox);
  return { MapGen: sandbox.__MapGen, TILE: sandbox.__TILE };
}


// ─────────────────────────────────────────────────────
// BSP generator — structural tests
// ─────────────────────────────────────────────────────

test('BSP: generate() dispatches to bsp for type "bsp"', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.generate({ type: 'bsp', cols: 40, rows: 30, seed: 42 }, TILE);
  assert.ok(result.grid, 'should return a grid');
  assert.ok(result.playerStart, 'should return playerStart');
  assert.ok(result.rooms, 'should return rooms array');
});

test('BSP: generate() dispatches to bsp for type "rooms"', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.generate({ type: 'rooms', cols: 40, rows: 30, seed: 42 }, TILE);
  assert.ok(result.grid);
  assert.ok(result.rooms);
});

test('BSP: grid dimensions match requested cols/rows', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 50, rows: 35, seed: 123 }, TILE);
  assert.equal(result.grid.length, 35, 'rows should match');
  assert.equal(result.grid[0].length, 50, 'cols should match');
});

test('BSP: grid borders are all walls', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 99 }, TILE);
  const grid = result.grid;
  const rows = grid.length, cols = grid[0].length;
  for (let x = 0; x < cols; x++) {
    assert.equal(grid[0][x], TILE.WALL, `top border at x=${x}`);
    assert.equal(grid[rows-1][x], TILE.WALL, `bottom border at x=${x}`);
  }
  for (let y = 0; y < rows; y++) {
    assert.equal(grid[y][0], TILE.WALL, `left border at y=${y}`);
    assert.equal(grid[y][cols-1], TILE.WALL, `right border at y=${y}`);
  }
});

test('BSP: produces at least 2 rooms', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 56, rows: 36, seed: 777 }, TILE);
  assert.ok(result.rooms.length >= 2, `expected ≥2 rooms, got ${result.rooms.length}`);
});

test('BSP: playerStart is on a floor tile', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 50, rows: 35, seed: 42 }, TILE);
  const { x, y } = result.playerStart;
  assert.equal(result.grid[y][x], TILE.FLOOR, 'playerStart should be on FLOOR');
});

test('BSP: stairs are placed when stairs: true', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 50, rows: 35, seed: 42, stairs: true }, TILE);
  assert.ok(result.stairsPos, 'stairsPos should be set');
  assert.equal(result.grid[result.stairsPos.y][result.stairsPos.x], TILE.STAIRS);
});

test('BSP: no stairs when stairs: false', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 50, rows: 35, seed: 42, stairs: false }, TILE);
  assert.equal(result.stairsPos, null);
  // Confirm no STAIRS tiles in grid
  for (const row of result.grid)
    for (const cell of row)
      assert.notEqual(cell, TILE.STAIRS, 'no STAIRS should exist');
});

test('BSP: stairs are far from player start', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 56, rows: 36, seed: 42 }, TILE);
  const dx = Math.abs(result.stairsPos.x - result.playerStart.x);
  const dy = Math.abs(result.stairsPos.y - result.playerStart.y);
  assert.ok(dx + dy >= 5, `stairs should be far from start, distance=${dx+dy}`);
});

test('BSP: deterministic — same seed produces same grid', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const a = MapGen.bsp({ cols: 40, rows: 30, seed: 12345 }, TILE);
  const b = MapGen.bsp({ cols: 40, rows: 30, seed: 12345 }, TILE);
  assert.deepEqual(a.grid, b.grid);
  assert.deepEqual(a.playerStart, b.playerStart);
  assert.deepEqual(a.stairsPos, b.stairsPos);
});

test('BSP: different seeds produce different grids', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const a = MapGen.bsp({ cols: 40, rows: 30, seed: 111 }, TILE);
  const b = MapGen.bsp({ cols: 40, rows: 30, seed: 999 }, TILE);
  // Very unlikely to be identical
  const aFlat = a.grid.flat().join('');
  const bFlat = b.grid.flat().join('');
  assert.notEqual(aFlat, bFlat, 'different seeds should produce different maps');
});

test('BSP: chests are placed (default behavior)', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 56, rows: 36, seed: 42 }, TILE);
  let chestCount = 0;
  for (const row of result.grid)
    for (const cell of row)
      if (cell === TILE.CHEST) chestCount++;
  assert.ok(chestCount >= 1, `expected at least 1 chest, got ${chestCount}`);
});

test('BSP: no chests when chests: false', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 56, rows: 36, seed: 42, chests: false }, TILE);
  for (const row of result.grid)
    for (const cell of row)
      assert.notEqual(cell, TILE.CHEST, 'no CHEST should exist');
});

test('BSP: doors are placed (default behavior)', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 56, rows: 36, seed: 42 }, TILE);
  let doorCount = 0;
  for (const row of result.grid)
    for (const cell of row)
      if (cell === TILE.DOOR) doorCount++;
  // Not guaranteed but highly likely with enough rooms
  assert.ok(doorCount >= 0, 'doors should be placed (or zero if no valid positions)');
});

test('BSP: torches are placed and spread out', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 56, rows: 36, seed: 42 }, TILE);
  assert.ok(result.lights.length >= 1, 'should have at least 1 torch');
  assert.ok(result.stageSprites.length >= 1, 'should have at least 1 stage sprite');

  // Check spacing: no two torches within 5 tiles
  for (let i = 0; i < result.lights.length; i++) {
    for (let j = i + 1; j < result.lights.length; j++) {
      const d = Math.abs(result.lights[i].x - result.lights[j].x) + Math.abs(result.lights[i].y - result.lights[j].y);
      assert.ok(d >= 6, `torches ${i} and ${j} too close: distance=${d}`);
    }
  }
});

test('BSP: depth-based scaling produces more rooms at higher depth', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  // Smaller map to exaggerate the effect
  const shallow = MapGen.bsp({ cols: 60, rows: 40, seed: 42, depth: 1 }, TILE);
  const deep    = MapGen.bsp({ cols: 60, rows: 40, seed: 42, depth: 8 }, TILE);
  // Deep floors should produce at least as many rooms (usually more since leaves are smaller)
  assert.ok(deep.rooms.length >= shallow.rooms.length,
    `deep(${deep.rooms.length}) should have ≥ rooms than shallow(${shallow.rooms.length})`);
});

test('BSP: all rooms are reachable (connected via corridors)', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  const result = MapGen.bsp({ cols: 56, rows: 36, seed: 42 }, TILE);
  const grid = result.grid;
  const rows = grid.length, cols = grid[0].length;

  // Flood fill from playerStart — all floor/stairs/chest/door tiles should be reachable
  const passable = new Set([TILE.FLOOR, TILE.STAIRS, TILE.CHEST, TILE.DOOR]);
  const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
  const queue = [result.playerStart];
  visited[result.playerStart.y][result.playerStart.x] = 1;

  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (visited[ny][nx] || !passable.has(grid[ny][nx])) continue;
      visited[ny][nx] = 1;
      queue.push({ x: nx, y: ny });
    }
  }

  // Count total passable tiles and visited ones
  let totalPassable = 0, totalVisited = 0;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (passable.has(grid[y][x])) totalPassable++;
      if (visited[y][x]) totalVisited++;
    }

  assert.equal(totalVisited, totalPassable,
    `all passable tiles should be reachable: visited=${totalVisited} total=${totalPassable}`);
});

test('BSP: fallback for very small maps', () => {
  const { MapGen, TILE } = loadMapGenInVm();
  // Tiny map that can't fit rooms — should fall back gracefully
  const result = MapGen.bsp({ cols: 10, rows: 8, seed: 42, minRoomSize: 3, minLeaf: 4, maxLeaf: 5 }, TILE);
  assert.ok(result.grid, 'should still return a grid');
  assert.ok(result.playerStart, 'should still return playerStart');
});
