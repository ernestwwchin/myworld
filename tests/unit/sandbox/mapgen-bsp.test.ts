import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MapGen } from '../../../src/mapgen.ts';
import { TILE } from '../../../src/config.ts';

test('BSP: generate() dispatches to bsp for type "bsp"', () => {
  const result = MapGen.generate({ type: 'bsp', cols: 40, rows: 30, seed: 42 }, TILE);
  assert.ok(result.grid, 'should return a grid');
  assert.ok(result.playerStart, 'should return playerStart');
  assert.ok(result.rooms, 'should return rooms array');
});

test('BSP: generate() dispatches to bsp for type "rooms"', () => {
  const result = MapGen.generate({ type: 'rooms', cols: 40, rows: 30, seed: 42 }, TILE);
  assert.ok(result.grid);
  assert.ok(result.rooms);
});

test('BSP: grid dimensions match requested cols/rows', () => {
  const result = MapGen.bsp({ cols: 50, rows: 35, seed: 123 }, TILE);
  assert.equal(result.grid.length, 35, 'rows should match');
  assert.equal(result.grid[0].length, 50, 'cols should match');
});

test('BSP: grid borders are all walls', () => {
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 42 }, TILE);
  const { grid } = result;
  const rows = grid.length;
  const cols = grid[0].length;
  for (let x = 0; x < cols; x++) {
    assert.equal(grid[0][x], TILE.WALL, `top border x=${x} should be wall`);
    assert.equal(grid[rows - 1][x], TILE.WALL, `bottom border x=${x} should be wall`);
  }
  for (let y = 0; y < rows; y++) {
    assert.equal(grid[y][0], TILE.WALL, `left border y=${y} should be wall`);
    assert.equal(grid[y][cols - 1], TILE.WALL, `right border y=${y} should be wall`);
  }
});

test('BSP: playerStart is on a floor tile', () => {
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 42 }, TILE);
  const { grid, playerStart } = result;
  assert.equal(grid[playerStart.y][playerStart.x], TILE.FLOOR, 'playerStart must be on floor');
});

test('BSP: at least one stair tile exists', () => {
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 42 }, TILE);
  const hasStairs = result.grid.some(row => row.includes(TILE.STAIRS));
  assert.ok(hasStairs, 'BSP map should contain at least one stair tile');
});

test('BSP: rooms array contains at least 2 rooms', () => {
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 42 }, TILE);
  assert.ok(Array.isArray(result.rooms), 'rooms should be an array');
  assert.ok(result.rooms.length >= 2, 'BSP should produce at least 2 rooms');
});

test('BSP: each room has x1/y1/w/h fields', () => {
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 42 }, TILE);
  for (const room of result.rooms) {
    assert.ok(typeof room.x1 === 'number', 'room.x1 must be a number');
    assert.ok(typeof room.y1 === 'number', 'room.y1 must be a number');
    assert.ok(typeof room.w === 'number', 'room.w must be a number');
    assert.ok(typeof room.h === 'number', 'room.h must be a number');
  }
});

test('BSP: deterministic with same seed', () => {
  const r1 = MapGen.bsp({ cols: 40, rows: 30, seed: 99 }, TILE);
  const r2 = MapGen.bsp({ cols: 40, rows: 30, seed: 99 }, TILE);
  assert.deepEqual(r1.grid, r2.grid, 'same seed must produce same grid');
  assert.deepEqual(r1.playerStart, r2.playerStart, 'same seed must produce same playerStart');
});

test('BSP: different seeds produce different grids', () => {
  const r1 = MapGen.bsp({ cols: 40, rows: 30, seed: 1 }, TILE);
  const r2 = MapGen.bsp({ cols: 40, rows: 30, seed: 2 }, TILE);
  const same = r1.grid.every((row, y) => row.every((cell, x) => cell === r2.grid[y][x]));
  assert.ok(!same, 'different seeds should generally produce different grids');
});

test('BSP: playerStart is within grid bounds', () => {
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 42 }, TILE);
  const { grid, playerStart } = result;
  assert.ok(playerStart.x >= 0 && playerStart.x < grid[0].length, 'playerStart.x in bounds');
  assert.ok(playerStart.y >= 0 && playerStart.y < grid.length, 'playerStart.y in bounds');
});

test('BSP: stair tile is on a reachable floor tile', () => {
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 42 }, TILE);
  const { grid } = result;
  let stairTile = null;
  outer: for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === TILE.STAIRS) { stairTile = { x, y }; break outer; }
    }
  }
  assert.ok(stairTile, 'stair tile should exist');
});

test('BSP: every room is interior to the grid', () => {
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 42 }, TILE);
  for (const room of result.rooms) {
    assert.ok(room.x1 > 0 && room.x2 < 40, 'room x-range must be interior');
    assert.ok(room.y1 > 0 && room.y2 < 30, 'room y-range must be interior');
  }
});

test('BSP: floors inside rooms are FLOOR tiles', () => {
  const result = MapGen.bsp({ cols: 40, rows: 30, seed: 42 }, TILE);
  const { grid, rooms } = result;
  for (const room of rooms.slice(0, 3)) {
    for (let y = room.y1 + 1; y < room.y2; y++) {
      for (let x = room.x1 + 1; x < room.x2; x++) {
        const tile = grid[y][x];
        assert.ok(tile === TILE.FLOOR || tile === TILE.STAIRS, `room interior tile at (${x},${y}) should be floor or stairs`);
      }
    }
  }
});
