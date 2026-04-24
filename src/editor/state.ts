import type { Cell, LogicType, ObjectType, VisualLayer, CellVisuals } from './types';
import { FLOOR_TILES, LOGIC, OBJECTS } from './data';

// ── Reactive editor state ──
// All mutable state lives here. Renderers and event handlers read/write via this module.

export let gridW = 12;
export let gridH = 12;
export let cells: Cell[][] = []; // mutable — reassigned by initGrid / loadStamp
export let selectedCell: { r: number; c: number } | null = null;
export let paintLogic: LogicType = 'walkable';
export let paintObject: ObjectType | '' = '';
export let selectedSprite: string | null = null;
export let activeVisualLayer: VisualLayer = 'ground';
export let stampName = 'Untitled';
export let lastLoadedStamp: import('./types').Stamp | null = null;

// ── Setters (keep assignments centralized) ──

export function setCells(c: Cell[][]) { cells = c; }
export function setGridSize(w: number, h: number) { gridW = w; gridH = h; }
export function setSelectedCell(cell: { r: number; c: number } | null) { selectedCell = cell; }
export function setPaintLogic(logic: LogicType) { paintLogic = logic; }
export function setPaintObject(obj: ObjectType | '') { paintObject = obj; }
export function setSelectedSprite(sprite: string | null) { selectedSprite = sprite; }
export function setActiveVisualLayer(layer: VisualLayer) { activeVisualLayer = layer; }
export function setStampName(name: string) { stampName = name; }
export function setLastLoadedStamp(stamp: import('./types').Stamp | null) { lastLoadedStamp = stamp; }

// ── Cell factory ──

export function makeCell(logic: LogicType = 'walkable', object: ObjectType | null = null, visuals?: CellVisuals): Cell {
  return {
    logic,
    object,
    visuals: visuals ?? { ground: null, structure: null, decoration: null },
  };
}

// ── Grid initialization ──

export function initGrid(): void {
  cells = [];
  selectedCell = null;
  for (let r = 0; r < gridH; r++) {
    cells[r] = [];
    for (let c = 0; c < gridW; c++) {
      if (r <= 1 || r >= gridH - 2 || c <= 1 || c >= gridW - 2)
        cells[r][c] = makeCell('blocked');
      else
        cells[r][c] = makeCell('walkable');
    }
  }
  autoFillVisuals();
}

// ── Auto-fill visuals from logic (one-time, on stamp load / init only) ──

export function autoFillVisuals(): void {
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const cell = cells[r][c];
      if (cell.visuals.ground || cell.visuals.structure) continue;
      if (cell.logic === 'void') continue;

      cell.visuals.ground = FLOOR_TILES[(r * 7 + c * 13) % FLOOR_TILES.length];
      if (cell.logic === 'blocked' || cell.logic === 'doorable') {
        cell.visuals.structure = autoTileWall(r, c);
      }
    }
  }
}

// ── Autotile wall selection based on cardinal neighbors ──

export function autoTileWall(r: number, c: number): string {
  const isOpen = (rr: number, cc: number) => {
    if (rr < 0 || rr >= gridH || cc < 0 || cc >= gridW) return false;
    return cells[rr][cc].logic === 'walkable';
  };
  const fS = isOpen(r + 1, c);
  const fN = isOpen(r - 1, c);
  const fW = isOpen(r, c - 1);
  const fE = isOpen(r, c + 1);
  if (fS) return 'wall_mid';
  if (fN) return 'wall_top_mid';
  if (fW) return 'wall_right';
  if (fE) return 'wall_left';
  return 'wall_top_mid';
}

// ── Resolve object sprite ──

export function resolveObjSprite(r: number, c: number): string | null {
  const obj = cells[r][c].object;
  if (!obj) return null;
  return OBJECTS[obj]?.sprite ?? null;
}

// ── Resize grid (preserving existing cells) ──

export function resizeGrid(newW: number, newH: number): void {
  const oldCells = cells;
  const oldW = gridW, oldH = gridH;
  gridW = newW;
  gridH = newH;
  cells = [];
  selectedCell = null;
  for (let r = 0; r < gridH; r++) {
    cells[r] = [];
    for (let c = 0; c < gridW; c++) {
      if (r < oldH && c < oldW) {
        cells[r][c] = oldCells[r][c];
      } else if (r <= 1 || r >= gridH - 2 || c <= 1 || c >= gridW - 2) {
        cells[r][c] = makeCell('blocked');
      } else {
        cells[r][c] = makeCell('walkable');
      }
    }
  }
}
