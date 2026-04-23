import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import {
  placeSquads,
  classifyRooms,
  assignCreatureNames,
} from '../../../src/systems/encounter-placement.ts';
import type { Room, SquadDef, FlatEncounterDef } from '../../../src/systems/encounter-placement.ts';

function makeGrid(rows: number, cols: number, floor: number, wall: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(wall));
}

function carveRoom(grid: number[][], room: Room, floor: number): void {
  for (let y = room.y1; y <= room.y2; y++) {
    for (let x = room.x1; x <= room.x2; x++) {
      grid[y][x] = floor;
    }
  }
}

const FLOOR = 0;
const WALL = 1;

function testRooms(): Room[] {
  return [
    { x1: 2, y1: 2, x2: 6, y2: 6, cx: 4, cy: 4, w: 5, h: 5 },
    { x1: 10, y1: 2, x2: 14, y2: 6, cx: 12, cy: 4, w: 5, h: 5 },
    { x1: 2, y1: 10, x2: 4, y2: 12, cx: 3, cy: 11, w: 3, h: 3 },
    { x1: 10, y1: 10, x2: 16, y2: 16, cx: 13, cy: 13, w: 7, h: 7 },
  ];
}

function testGrid(): number[][] {
  const grid = makeGrid(20, 20, FLOOR, WALL);
  for (const room of testRooms()) carveRoom(grid, room, FLOOR);
  for (let x = 7; x < 10; x++) grid[4][x] = FLOOR;
  for (let y = 7; y < 10; y++) grid[y][3] = FLOOR;
  return grid;
}

// ── 1. Room classification ──

describe('room classification', () => {
  test('classifies rooms by connection count', () => {
    const grid = testGrid();
    const rooms = testRooms();
    const classified = classifyRooms(rooms, grid, FLOOR);
    assert.ok(classified.length === 4);
    for (const r of classified) {
      assert.ok(['dead_end', 'hub', 'normal'].includes(r.type));
    }
  });
});

// ── 2. Squad placement ──

describe('squad placement', () => {
  test('places squad creatures in rooms', () => {
    const grid = testGrid();
    const rooms = testRooms();
    const squads: SquadDef[] = [{
      squad: 'patrol',
      creatures: ['goblin', 'goblin'],
      count: 1,
      placement: 'room_center',
    }];
    const placed = placeSquads(squads, rooms, grid, FLOOR, { x: 4, y: 4 }, { x: 13, y: 13 });
    assert.ok(placed.length >= 2);
    assert.equal(placed[0].creature, 'goblin');
    assert.ok(placed[0].group.startsWith('squad_'));
  });

  test('multiple squad copies are placed', () => {
    const grid = testGrid();
    const rooms = testRooms();
    const squads: SquadDef[] = [{
      squad: 'patrol',
      creatures: ['goblin'],
      count: 3,
    }];
    const placed = placeSquads(squads, rooms, grid, FLOOR, { x: 4, y: 4 });
    assert.ok(placed.length >= 2);
  });

  test('squad creatures share same group', () => {
    const grid = testGrid();
    const rooms = testRooms();
    const squads: SquadDef[] = [{
      squad: 'camp',
      creatures: ['goblin', 'goblin', 'goblin_shaman'],
      count: 1,
    }];
    const placed = placeSquads(squads, rooms, grid, FLOOR, { x: 4, y: 4 });
    const groups = new Set(placed.map(p => p.group));
    assert.equal(groups.size, 1);
  });

  test('object-form creatures preserve name and hidden', () => {
    const grid = testGrid();
    const rooms = testRooms();
    const squads: SquadDef[] = [{
      squad: 'ambush',
      creatures: [
        { creature: 'goblin_trapper', hidden: true },
        { creature: 'spider', name: 'Big Spider' },
      ],
      count: 1,
    }];
    const placed = placeSquads(squads, rooms, grid, FLOOR, { x: 4, y: 4 });
    const trapper = placed.find(p => p.creature === 'goblin_trapper');
    const spider = placed.find(p => p.creature === 'spider');
    assert.ok(trapper);
    assert.equal(trapper!.hidden, true);
    assert.ok(spider);
    assert.equal(spider!.name, 'Big Spider');
  });

  test('flat encounters still work', () => {
    const grid = testGrid();
    const rooms = testRooms();
    const flats: FlatEncounterDef[] = [
      { creature: 'wolf', count: 2 },
    ];
    const placed = placeSquads(flats, rooms, grid, FLOOR, { x: 4, y: 4 });
    assert.ok(placed.length >= 1);
    assert.equal(placed[0].creature, 'wolf');
  });

  test('flat encounters with explicit coords use them', () => {
    const grid = testGrid();
    const rooms = testRooms();
    const flats: FlatEncounterDef[] = [
      { creature: 'wolf', x: 12, y: 4 },
    ];
    const placed = placeSquads(flats, rooms, grid, FLOOR, { x: 4, y: 4 });
    assert.equal(placed.length, 1);
    assert.equal(placed[0].tx, 12);
    assert.equal(placed[0].ty, 4);
  });

  test('mixed squads and flats', () => {
    const grid = testGrid();
    const rooms = testRooms();
    const encounters = [
      { squad: 'patrol', creatures: ['goblin', 'goblin'], count: 1 } as SquadDef,
      { creature: 'wolf', count: 1 } as FlatEncounterDef,
    ];
    const placed = placeSquads(encounters, rooms, grid, FLOOR, { x: 4, y: 4 });
    assert.ok(placed.length >= 3);
  });

  test('creatures not placed on player start or stairs', () => {
    const grid = testGrid();
    const rooms = testRooms();
    const squads: SquadDef[] = [{
      squad: 'camp',
      creatures: ['goblin', 'goblin', 'goblin', 'goblin', 'goblin'],
      count: 2,
    }];
    const playerStart = { x: 4, y: 4 };
    const stairsPos = { x: 13, y: 13 };
    const placed = placeSquads(squads, rooms, grid, FLOOR, playerStart, stairsPos);
    for (const p of placed) {
      const key = `${p.tx},${p.ty}`;
      assert.notEqual(key, `${playerStart.x},${playerStart.y}`);
      assert.notEqual(key, `${stairsPos.x},${stairsPos.y}`);
    }
  });
});

// ── 3. Creature naming ──

describe('creature naming', () => {
  test('unique types get no suffix', () => {
    const creatures = [
      { type: 'Goblin Shaman' },
      { type: 'Wolf' },
    ];
    assignCreatureNames(creatures as any);
    assert.equal((creatures[0] as any).displayName, 'Goblin Shaman');
    assert.equal((creatures[1] as any).displayName, 'Wolf');
  });

  test('duplicate types get A/B/C suffixes', () => {
    const creatures = [
      { type: 'Goblin' },
      { type: 'Goblin' },
      { type: 'Goblin' },
    ];
    assignCreatureNames(creatures as any);
    assert.equal((creatures[0] as any).displayName, 'Goblin A');
    assert.equal((creatures[1] as any).displayName, 'Goblin B');
    assert.equal((creatures[2] as any).displayName, 'Goblin C');
  });

  test('explicit name overrides auto-suffix', () => {
    const creatures = [
      { type: 'Goblin', name: 'Captain Skrix' },
      { type: 'Goblin' },
      { type: 'Goblin' },
    ];
    assignCreatureNames(creatures as any);
    assert.equal((creatures[0] as any).displayName, 'Captain Skrix');
    assert.equal((creatures[1] as any).displayName, 'Goblin A');
    assert.equal((creatures[2] as any).displayName, 'Goblin B');
  });

  test('mixed types: only duplicates get suffixes', () => {
    const creatures = [
      { type: 'Goblin' },
      { type: 'Goblin' },
      { type: 'Goblin Shaman' },
      { type: 'Wolf' },
    ];
    assignCreatureNames(creatures as any);
    assert.equal((creatures[0] as any).displayName, 'Goblin A');
    assert.equal((creatures[1] as any).displayName, 'Goblin B');
    assert.equal((creatures[2] as any).displayName, 'Goblin Shaman');
    assert.equal((creatures[3] as any).displayName, 'Wolf');
  });
});
