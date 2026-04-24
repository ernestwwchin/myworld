import type { LogicType, LogicDef, ObjectType, ObjectDef } from './types';

export const TILE_BASE = '/assets/vendor/0x72_dungeon/0x72_DungeonTilesetII_v1.7/frames/';
export const CELL_SIZE = 32;

// ── Logic types — what BSP cares about ──

export const LOGIC: Record<LogicType, LogicDef> = {
  walkable: { bsp: 0, color: '#2d6e3f', label: '·', blocked: false },
  blocked:  { bsp: 1, color: '#c0392b', label: '#', blocked: true },
  void:     { bsp: 1, color: '#1a1d24', label: ' ', blocked: true },
  doorable: { bsp: 1, color: '#2980b9', label: 'D', blocked: true },
};

// ── Object types — gameplay content placed on cells ──

export const OBJECTS: Record<ObjectType, ObjectDef> = {
  door:        { sprite: 'doors_leaf_closed', bspOverride: 3, icon: 'D', ascii: 'D' },
  chest:       { sprite: 'chest_full_open_anim_f0', bspOverride: 4, icon: 'C', ascii: 'C' },
  trap:        { sprite: 'floor_spikes_anim_f0', bspOverride: null, icon: 'T', ascii: 'T' },
  column:      { sprite: 'column', bspOverride: null, icon: 'P', ascii: 'P' },
  crate:       { sprite: 'crate', bspOverride: null, icon: 'B', ascii: 'B' },
  stairs:      { sprite: null, bspOverride: 5, icon: '>', ascii: '>' },
  shrine:      { sprite: 'column', bspOverride: null, icon: 'S', ascii: 'S' },
  enemy_spawn: { sprite: null, bspOverride: null, icon: '@', ascii: '@' },
};

// Reverse map: ASCII char → object key
export const ASCII_TO_OBJ: Record<string, ObjectType> = {};
for (const [key, def] of Object.entries(OBJECTS)) {
  ASCII_TO_OBJ[def.ascii] = key as ObjectType;
}

// ── Palette tile lists ──

export const FLOOR_TILES = [
  'floor_1','floor_2','floor_3','floor_4','floor_5','floor_6','floor_7','floor_8',
  'floor_ladder','floor_stairs','floor_spikes_anim_f0','hole','edge_down',
  'column_wall',
];

export const WALL_BASIC = [
  'wall_top_left','wall_top_mid','wall_top_right',
  'wall_left','wall_mid','wall_right',
];

export const WALL_EDGE = [
  'wall_edge_left','wall_edge_right',
  'wall_edge_mid_left','wall_edge_mid_right',
  'wall_edge_top_left','wall_edge_top_right',
  'wall_edge_bottom_left','wall_edge_bottom_right',
  'wall_edge_tshape_left','wall_edge_tshape_right',
  'wall_edge_tshape_bottom_left','wall_edge_tshape_bottom_right',
];

export const WALL_OUTER = [
  'wall_outer_top_left','wall_outer_top_right',
  'wall_outer_mid_left','wall_outer_mid_right',
  'wall_outer_front_left','wall_outer_front_right',
];

export const WALL_DECO = [
  'wall_banner_blue','wall_banner_red','wall_banner_green','wall_banner_yellow',
  'wall_goo','wall_goo_base','wall_hole_1','wall_hole_2',
  'wall_fountain_top_1','wall_fountain_top_2','wall_fountain_top_3',
  'wall_fountain_mid_blue_anim_f0','wall_fountain_mid_red_anim_f0',
  'wall_fountain_basin_blue_anim_f0','wall_fountain_basin_red_anim_f0',
];

export const WALL_TILES = [...WALL_BASIC, ...WALL_EDGE, ...WALL_OUTER];

export const PROP_TILES = [
  'column','skull','hole',
  'button_red_up','button_red_down','button_blue_up','button_blue_down',
  'lever_left','lever_right',
];

export const CHEST_TILES = [
  'chest_empty_open_anim_f0','chest_full_open_anim_f0','chest_mimic_open_anim_f0',
  'chest_empty_open_anim_f1','chest_full_open_anim_f1','chest_mimic_open_anim_f1',
  'chest_empty_open_anim_f2','chest_full_open_anim_f2','chest_mimic_open_anim_f2',
];

export const CONSUMABLE_TILES = [
  'flask_big_red','flask_big_blue','flask_big_green','flask_big_yellow',
  'flask_red','flask_blue','flask_green','flask_yellow',
  'bomb_f0','bomb_f1','bomb_f2',
];

export const CREATURE_TILES = [
  'angel_idle_anim_f0','goblin_idle_anim_f0','imp_idle_anim_f0',
  'skelet_idle_anim_f0','tiny_zombie_idle_anim_f0','zombie_anim_f1',
  'ice_zombie_anim_f0','muddy_anim_f0','swampy_anim_f0','tiny_slug_anim_f0',
];

export const ALL_TILES = [
  ...FLOOR_TILES, ...WALL_TILES, ...WALL_DECO,
  ...PROP_TILES, ...CHEST_TILES, ...CONSUMABLE_TILES, ...CREATURE_TILES,
];

export const PALETTE_MAP: Record<string, string[]> = {
  all: ALL_TILES,
  floor: FLOOR_TILES,
  wall_basic: WALL_BASIC,
  wall_edge: WALL_EDGE,
  wall_outer: WALL_OUTER,
  wall_deco: WALL_DECO,
  prop: PROP_TILES,
  chest: CHEST_TILES,
  consumable: CONSUMABLE_TILES,
  creature: CREATURE_TILES,
};

// ── Stamp preview tile maps (ASCII → frame name) ──

export const STAMP_TILE_MAP: Record<string, string | string[] | null> = {
  '.': ['floor_1','floor_2','floor_3','floor_4','floor_5','floor_6','floor_7','floor_8'],
  'P': 'column',
  'C': 'chest_full_open_anim_f0',
  '@': 'floor_1',
  'T': 'floor_spikes_anim_f0',
  'S': 'column',
  'W': 'floor_1',
  '~': 'hole',
  'G': 'floor_1',
  'B': 'crate',
  'D': 'doors_leaf_closed',
  ' ': null,
};
