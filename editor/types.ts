// ── Tool & Layer types ──

export type ToolType = 'brush' | 'eraser' | 'fill' | 'rectangle' | 'select';
export type LayerType = 'ground' | 'structure' | 'decoration' | 'objects' | 'logic';

export interface LayerState {
  id: LayerType;
  label: string;
  visible: boolean;
  opacity: number;         // 0–1
  locked: boolean;         // logic layer: visibility locked on
}

// ── Cell types ──

/** Visual layers for a single cell */
export interface CellVisuals {
  ground: string | null;
  structure: string | null;
  decoration: string | null;
}

/** A single grid cell in the editor */
export interface Cell {
  logic: LogicType;
  object: ObjectType | null;
  visuals: CellVisuals;
}

export type LogicType = 'walkable' | 'blocked' | 'void';

/** Auto-detected connector edge entry for stamp export */
export type ConnectorType = 'open' | 'doorable';
export interface ConnectorEntry {
  index: number;
  type: ConnectorType;
}
export type VisualLayer = 'ground' | 'structure' | 'decoration';
export type ObjectType = 'door' | 'chest' | 'trap' | 'column' | 'crate' | 'stairs' | 'shrine' | 'enemy_spawn';

export interface LogicDef {
  bsp: number;
  color: string;
  label: string;
  blocked: boolean;
}

export interface ObjectDef {
  sprite: string | null;
  bspOverride: number | null;
  icon: string;
  ascii: string;
}

// ── Selection & clipboard ──

export interface SelectionRect {
  startR: number;
  startC: number;
  endR: number;
  endC: number;
}

export interface Clipboard {
  cells: Cell[][];
  w: number;
  h: number;
}

// ── Undo/Redo ──

export interface HistorySnapshot {
  cells: Cell[][];
  gridW: number;
  gridH: number;
}

// ── Connection point override ──

export type ConnectionSide = 'north' | 'south' | 'west' | 'east';

export interface ConnectOverride {
  side: ConnectionSide;
  index: number;       // position along the edge
  forced: boolean;     // true = force on, false = force off
}

// ── Stamp types ──

export type StampCategory = 'room' | 'corridor' | 'door';

export interface Stamp {
  name: string;
  size: string;
  tags: string[];
  grid: string;
  difficulty: number;
  theme: string;
  category?: StampCategory;
  visualLayers?: Record<string, Partial<CellVisuals>>;
}

export interface StampExport {
  name: string;
  w: number;
  h: number;
  grid: string;
  bspGrid: number[][];
  connectable: { north: number[]; south: number[]; west: number[]; east: number[] };
  connectors?: { north: ConnectorEntry[]; south: ConnectorEntry[]; west: ConnectorEntry[]; east: ConnectorEntry[] };
  spawns?: { x: number; y: number }[];
  stairs?: { x: number; y: number };
  objects?: { type: string; x: number; y: number }[];
  visualLayers?: Record<string, Partial<CellVisuals>>;
}

/** A stamp saved in the local library (localStorage) */
export interface SavedStamp extends StampExport {
  id: string;
  tags: string[];
  difficulty: number;
  theme: string;
  category: StampCategory;
  createdAt: number;
  updatedAt: number;
}

// ── Catalog types ──

/** Tile catalog entry from tiles.json */
export interface TileDef {
  id: string;
  frame: { w: number; h: number };
  mapRole?: string;
  walkable: boolean;
  solid: boolean;
  tags: string[];
  category?: string;
}

/** Sprite entry from sprites.json */
export interface SpriteDef {
  spriteKey: string;
  displayName: string;
  race: string;
  type: string;
  pixelSize: [number, number];
  gridSize: number;
  size: string;
  facing: string;
  animations: string[];
}

/** Animation entry from animations.json */
export interface AnimDef {
  fps: number;
  frameCount: number;
  playOrder: string[];
  loop: boolean;
}
