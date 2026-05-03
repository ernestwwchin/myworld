import type { Cell, LogicType, ObjectType, VisualLayer, CellVisuals, ToolType, LayerType, LayerState, SelectionRect, Clipboard, HistorySnapshot, ConnectOverride } from './types';
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
export let selectedSprites: (string | null)[][] | null = null; // multi-tile brush (rows × cols)
export let activeVisualLayer: VisualLayer = 'ground';
export let stampName = 'Untitled';
export let lastLoadedStamp: import('./types').Stamp | null = null;

// ── Tool state ──
export let activeTool: ToolType = 'brush';

// ── Layer state ──
export const DEFAULT_LAYERS: LayerState[] = [
  { id: 'ground',     label: 'Ground',     visible: true, opacity: 1,    locked: false },
  { id: 'structure',  label: 'Structure',  visible: true, opacity: 1,    locked: false },
  { id: 'decoration', label: 'Decoration', visible: true, opacity: 1,    locked: false },
  { id: 'objects',    label: 'Objects',     visible: true, opacity: 1,    locked: false },
  { id: 'logic',      label: 'Logic',      visible: true, opacity: 0.35, locked: false },
];

export let layers: LayerState[] = DEFAULT_LAYERS.map(l => ({ ...l }));
export let activeLayer: LayerType = 'ground';

// ── Selection & clipboard ──
export let selection: SelectionRect | null = null;
export let clipboard: Clipboard | null = null;

// ── Rectangle tool preview ──
export let rectPreview: SelectionRect | null = null;

// ── Undo/Redo ──
const MAX_HISTORY = 50;
let undoStack: HistorySnapshot[] = [];
let redoStack: HistorySnapshot[] = [];

// ── Connection point overrides ──
export let connectOverrides: ConnectOverride[] = [];

// ── Setters (keep assignments centralized) ──

export function setCells(c: Cell[][]) { cells = c; }
export function setGridSize(w: number, h: number) { gridW = w; gridH = h; }
export function setSelectedCell(cell: { r: number; c: number } | null) { selectedCell = cell; }
export function setPaintLogic(logic: LogicType) { paintLogic = logic; }
export function setPaintObject(obj: ObjectType | '') { paintObject = obj; }
export function setSelectedSprite(sprite: string | null) { selectedSprite = sprite; selectedSprites = null; }
export function setSelectedSprites(sprites: (string | null)[][] | null) {
  selectedSprites = sprites;
  // Also set single sprite to top-left for backward compat
  selectedSprite = sprites?.[0]?.[0] ?? null;
}
export function setActiveVisualLayer(layer: VisualLayer) { activeVisualLayer = layer; }
export function setStampName(name: string) { stampName = name; }
export function setLastLoadedStamp(stamp: import('./types').Stamp | null) { lastLoadedStamp = stamp; }

// ── Tool setters ──
export function setActiveTool(tool: ToolType) { activeTool = tool; }

// ── Layer setters ──
export function setActiveLayer(layer: LayerType) {
  activeLayer = layer;
  // Sync visual layer when switching to a visual layer
  if (layer === 'ground' || layer === 'structure' || layer === 'decoration') {
    activeVisualLayer = layer;
  }
}

export function setLayerVisible(id: LayerType, visible: boolean) {
  const layer = layers.find(l => l.id === id);
  if (layer) layer.visible = visible;
}

export function setLayerOpacity(id: LayerType, opacity: number) {
  const layer = layers.find(l => l.id === id);
  if (layer) layer.opacity = Math.max(0, Math.min(1, opacity));
}

export function getLayer(id: LayerType): LayerState | undefined {
  return layers.find(l => l.id === id);
}

// ── Selection setters ──
export function setSelection(sel: SelectionRect | null) { selection = sel; }
export function setClipboard(cb: Clipboard | null) { clipboard = cb; }
export function setRectPreview(rect: SelectionRect | null) { rectPreview = rect; }

// ── Connection override setters ──
export function setConnectOverrides(overrides: ConnectOverride[]) { connectOverrides = overrides; }
export function toggleConnectOverride(side: ConnectOverride['side'], index: number) {
  const existing = connectOverrides.findIndex(o => o.side === side && o.index === index);
  if (existing >= 0) {
    // Cycle: forced-on → forced-off → remove
    if (connectOverrides[existing].forced) {
      connectOverrides[existing] = { ...connectOverrides[existing], forced: false };
    } else {
      connectOverrides = connectOverrides.filter((_, i) => i !== existing);
    }
  } else {
    connectOverrides = [...connectOverrides, { side, index, forced: true }];
  }
}

// ── Undo/Redo ──

function cloneCells(): Cell[][] {
  return cells.map(row => row.map(cell => ({
    logic: cell.logic,
    object: cell.object,
    visuals: { ...cell.visuals },
  })));
}

export function pushUndo() {
  undoStack.push({ cells: cloneCells(), gridW, gridH });
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
}

export function undo(): boolean {
  if (undoStack.length === 0) return false;
  redoStack.push({ cells: cloneCells(), gridW, gridH });
  const snapshot = undoStack.pop()!;
  cells = snapshot.cells;
  gridW = snapshot.gridW;
  gridH = snapshot.gridH;
  return true;
}

export function redo(): boolean {
  if (redoStack.length === 0) return false;
  undoStack.push({ cells: cloneCells(), gridW, gridH });
  const snapshot = redoStack.pop()!;
  cells = snapshot.cells;
  gridW = snapshot.gridW;
  gridH = snapshot.gridH;
  return true;
}

export function canUndo(): boolean { return undoStack.length > 0; }
export function canRedo(): boolean { return redoStack.length > 0; }
export function clearHistory() { undoStack = []; redoStack = []; }

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
      cells[r][c] = makeCell('void');
    }
  }
}

// ── Auto-fill visuals from logic (one-time, on stamp load / init only) ──

const PLAIN_FLOORS = ['floor_1','floor_2','floor_3','floor_4','floor_5','floor_6','floor_7','floor_8'];

export function autoFillVisuals(): void {
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const cell = cells[r][c];
      if (cell.visuals.ground || cell.visuals.structure) continue;
      if (cell.logic === 'void') continue;

      cell.visuals.ground = PLAIN_FLOORS[(r * 7 + c * 13) % PLAIN_FLOORS.length];
      if (cell.logic === 'blocked') {
        cell.visuals.structure = autoTileWall(r, c);
      }
    }
  }
}

// ── Autotile wall selection based on cardinal neighbors ──

export function autoTileWall(r: number, c: number): string {
  const isOpen = (rr: number, cc: number) => {
    if (rr < 0 || rr >= gridH || cc < 0 || cc >= gridW) return false;
    const l = cells[rr][cc].logic;
    return l === 'walkable';
  };
  const isWall = (rr: number, cc: number) => {
    if (rr < 0 || rr >= gridH || cc < 0 || cc >= gridW) return true;
    const l = cells[rr][cc].logic;
    return l === 'blocked';
  };

  const S = isOpen(r + 1, c);
  const N = isOpen(r - 1, c);
  const W = isOpen(r, c - 1);
  const E = isOpen(r, c + 1);

  // Front-facing wall (south is open floor) — the dark lower portion
  if (S) {
    if (W && E) return 'wall_mid';       // both sides open (shouldn't happen often)
    if (W) return 'wall_right';           // floor to the left, this is right edge
    if (E) return 'wall_left';            // floor to the right, this is left edge
    return 'wall_mid';                    // standard front wall
  }

  // Top of front wall — south neighbor is a wall that faces south
  if (isWall(r + 1, c) && isOpen(r + 2, c)) {
    if (W && E) return 'wall_top_mid';
    if (W) return 'wall_top_right';
    if (E) return 'wall_top_left';
    return 'wall_top_mid';               // standard wall top
  }

  // Side walls (no floor to south, but floor to east/west)
  if (E && !W) return 'wall_left';
  if (W && !E) return 'wall_right';

  // Back edge (floor to north) — usually the top of the room
  if (N) return 'wall_top_mid';

  // Interior wall or fully surrounded — default to top_mid
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
