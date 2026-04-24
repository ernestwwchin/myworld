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

export type LogicType = 'walkable' | 'blocked' | 'void' | 'doorable';
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

export interface Stamp {
  name: string;
  size: string;
  tags: string[];
  grid: string;
  difficulty: number;
  theme: string;
  visualLayers?: Record<string, Partial<CellVisuals>>;
}

export interface StampExport {
  name: string;
  w: number;
  h: number;
  grid: string;
  bspGrid: number[][];
  connectable: { north: number[]; south: number[]; west: number[]; east: number[] };
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
  createdAt: number;
  updatedAt: number;
}

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
