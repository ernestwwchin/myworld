export interface Room {
  x1: number; y1: number; x2: number; y2: number;
  cx: number; cy: number;
  w: number; h: number;
}

export type PlacementHint =
  | 'room_near_stairs'
  | 'room_center'
  | 'room_dead_end'
  | 'corridor'
  | 'any';

export interface SquadDef {
  squad?: string;
  creatures: Array<string | { creature: string; name?: string; hidden?: boolean }>;
  count?: number;
  placement?: PlacementHint;
  ai?: Record<string, unknown>;
}

export interface FlatEncounterDef {
  creature: string;
  count?: number;
  x?: number;
  y?: number;
  name?: string;
  group?: string;
  ai?: Record<string, unknown>;
  hidden?: boolean;
}

export interface PlacedCreature {
  creature: string;
  tx: number;
  ty: number;
  name?: string;
  group: string;
  ai?: Record<string, unknown>;
  hidden?: boolean;
}

interface RoomInfo extends Room {
  type: 'dead_end' | 'hub' | 'normal';
  connections: number;
  occupied: boolean;
}

export function classifyRooms(
  rooms: Room[],
  grid: number[][],
  floorTile: number,
  stairsPos?: { x: number; y: number } | null,
): RoomInfo[] {
  return rooms.map(room => {
    let connections = 0;
    for (let x = room.x1 - 1; x <= room.x2 + 1; x++) {
      for (const y of [room.y1 - 1, room.y2 + 1]) {
        if (y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0)) {
          if (grid[y]?.[x] === floorTile) connections++;
        }
      }
    }
    for (let y = room.y1; y <= room.y2; y++) {
      for (const x of [room.x1 - 1, room.x2 + 1]) {
        if (y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0)) {
          if (grid[y]?.[x] === floorTile) connections++;
        }
      }
    }

    const type: RoomInfo['type'] = connections <= 2 ? 'dead_end' : connections >= 5 ? 'hub' : 'normal';
    return { ...room, type, connections, occupied: false };
  });
}

function distToStairs(room: Room, stairsPos?: { x: number; y: number } | null): number {
  if (!stairsPos) return Infinity;
  return Math.abs(room.cx - stairsPos.x) + Math.abs(room.cy - stairsPos.y);
}

function pickRoom(
  rooms: RoomInfo[],
  hint: PlacementHint,
  playerStart: { x: number; y: number },
  stairsPos?: { x: number; y: number } | null,
  minPlayerDist = 6,
): RoomInfo | null {
  const available = rooms.filter(r => {
    if (r.occupied) return false;
    const dist = Math.abs(r.cx - playerStart.x) + Math.abs(r.cy - playerStart.y);
    return dist >= minPlayerDist;
  });
  if (!available.length) return rooms.find(r => !r.occupied) ?? null;

  switch (hint) {
    case 'room_near_stairs':
      return available.sort((a, b) => distToStairs(a, stairsPos) - distToStairs(b, stairsPos))[0] ?? null;
    case 'room_dead_end': {
      const de = available.filter(r => r.type === 'dead_end');
      return de[0] ?? available[0] ?? null;
    }
    case 'room_center': {
      const big = [...available].sort((a, b) => (b.w * b.h) - (a.w * a.h));
      return big[0] ?? null;
    }
    default:
      return available[Math.floor(Math.random() * available.length)] ?? null;
  }
}

function floorTilesInRoom(room: Room, grid: number[][], floorTile: number): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  for (let y = room.y1; y <= room.y2; y++) {
    for (let x = room.x1; x <= room.x2; x++) {
      if (grid[y]?.[x] === floorTile) tiles.push({ x, y });
    }
  }
  return tiles;
}

function pickTilesNearCenter(
  tiles: { x: number; y: number }[],
  center: { x: number; y: number },
  count: number,
  used: Set<string>,
): { x: number; y: number }[] {
  const sorted = tiles
    .filter(t => !used.has(`${t.x},${t.y}`))
    .sort((a, b) =>
      (Math.abs(a.x - center.x) + Math.abs(a.y - center.y)) -
      (Math.abs(b.x - center.x) + Math.abs(b.y - center.y))
    );
  const result: { x: number; y: number }[] = [];
  for (const t of sorted) {
    if (result.length >= count) break;
    result.push(t);
    used.add(`${t.x},${t.y}`);
  }
  return result;
}

export function placeSquads(
  encounters: Array<SquadDef | FlatEncounterDef>,
  rooms: Room[],
  grid: number[][],
  floorTile: number,
  playerStart: { x: number; y: number },
  stairsPos?: { x: number; y: number } | null,
): PlacedCreature[] {
  const classified = classifyRooms(rooms, grid, floorTile, stairsPos);
  const placed: PlacedCreature[] = [];
  const usedTiles = new Set<string>();
  usedTiles.add(`${playerStart.x},${playerStart.y}`);
  if (stairsPos) usedTiles.add(`${stairsPos.x},${stairsPos.y}`);

  let squadIdx = 0;

  const squads: Array<SquadDef & { _index: number }> = [];
  const flats: FlatEncounterDef[] = [];

  for (const enc of encounters) {
    if ('squad' in enc || ('creatures' in enc && Array.isArray((enc as SquadDef).creatures))) {
      squads.push({ ...(enc as SquadDef), _index: squadIdx++ });
    } else {
      flats.push(enc as FlatEncounterDef);
    }
  }

  const priorityOrder: PlacementHint[] = ['room_near_stairs', 'room_center', 'room_dead_end', 'corridor', 'any'];
  squads.sort((a, b) => {
    const ai = priorityOrder.indexOf(a.placement ?? 'any');
    const bi = priorityOrder.indexOf(b.placement ?? 'any');
    return ai - bi;
  });

  for (const squad of squads) {
    const copies = squad.count ?? 1;
    for (let c = 0; c < copies; c++) {
      const room = pickRoom(classified, squad.placement ?? 'any', playerStart, stairsPos);
      if (!room) continue;
      room.occupied = true;
      const groupId = `squad_${squad._index}_${c}`;
      const tiles = floorTilesInRoom(room, grid, floorTile);
      const creatures = squad.creatures.map(c =>
        typeof c === 'string' ? { creature: c } : c
      );
      const positions = pickTilesNearCenter(tiles, { x: room.cx, y: room.cy }, creatures.length, usedTiles);

      for (let i = 0; i < creatures.length; i++) {
        const def = creatures[i];
        const pos = positions[i];
        if (!pos) continue;
        placed.push({
          creature: def.creature,
          tx: pos.x,
          ty: pos.y,
          name: def.name,
          group: groupId,
          ai: squad.ai,
          hidden: def.hidden,
        });
      }
    }
  }

  for (const flat of flats) {
    const count = flat.count ?? 1;
    for (let i = 0; i < count; i++) {
      if (flat.x !== undefined && flat.y !== undefined) {
        placed.push({
          creature: flat.creature,
          tx: flat.x,
          ty: flat.y,
          name: flat.name,
          group: flat.group ?? `flat_${placed.length}`,
          ai: flat.ai,
          hidden: flat.hidden,
        });
      } else {
        const room = pickRoom(classified, 'any', playerStart, stairsPos, 4);
        if (!room) continue;
        const tiles = floorTilesInRoom(room, grid, floorTile);
        const pos = pickTilesNearCenter(tiles, { x: room.cx, y: room.cy }, 1, usedTiles);
        if (!pos.length) continue;
        placed.push({
          creature: flat.creature,
          tx: pos[0].x,
          ty: pos[0].y,
          name: flat.name,
          group: flat.group ?? `flat_${placed.length}`,
          ai: flat.ai,
          hidden: flat.hidden,
        });
      }
    }
  }

  return placed;
}

export function assignCreatureNames(
  creatures: Array<{ type?: string; displayName?: string; name?: string }>,
): void {
  const typeCounts: Record<string, number> = {};
  const typeTotal: Record<string, number> = {};

  for (const c of creatures) {
    if (c.name) continue;
    const t = c.type || 'Unknown';
    typeTotal[t] = (typeTotal[t] || 0) + 1;
  }

  for (const c of creatures) {
    if (c.name) {
      c.displayName = c.name;
      continue;
    }
    const t = c.type || 'Unknown';
    if (typeTotal[t] <= 1) {
      c.displayName = t;
      continue;
    }
    typeCounts[t] = (typeCounts[t] || 0) + 1;
    c.displayName = `${t} ${String.fromCharCode(64 + typeCounts[t])}`;
  }
}
