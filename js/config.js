// ═══════════════════════════════════════════════════════
// config.js — All configurable game data
// Edit this file to change map layout, player, enemies,
// leveling tables, and game constants.
// ═══════════════════════════════════════════════════════

// ── Tile Types ───────────────────────────────────────
const TILE = { FLOOR:0, WALL:1, DOOR:3, CHEST:4, STAIRS:5, WATER:6, GRASS:7 };

// ── Grid & Display ───────────────────────────────────
const S    = 48;  // tile size in pixels
const MODE = { EXPLORE:'explore', COMBAT:'combat' };

// ── Map Layout ───────────────────────────────────────
// Each number corresponds to a TILE type above.
// Modify this 2D array to redesign the dungeon.
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,7,7,0,0,0,0,0,0,1],
  [1,0,0,4,0,0,3,0,0,0,7,7,7,7,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,7,7,6,6,7,7,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,7,6,6,6,6,7,0,0,0,0,1],
  [1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,3,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
const ROWS = MAP.length;
const COLS = MAP[0].length;

// ── DnD 5e XP Thresholds (per level) ────────────────
const DND_XP = [
  0,300,900,2700,6500,14000,23000,34000,
  48000,64000,85000,100000,120000,140000,
  165000,195000,225000,265000,305000,355000
];

// ── Levels that grant Ability Score Improvements ─────
const ASI_LEVELS = new Set([4,8,12,16,19]);

// ── Fighter Class Features by Level ─────────────────
const FIGHTER_FEATURES = {
  1:  ['Second Wind (1d10+level HP)', 'Fighting Style: Dueling (+2 dmg)'],
  2:  ['Action Surge (extra action)'],
  3:  ['Champion Archetype'],
  4:  ['Ability Score Improvement'],
  5:  ['Extra Attack (2 per turn)'],
  6:  ['Ability Score Improvement'],
  7:  ['Remarkable Athlete'],
  8:  ['Ability Score Improvement'],
  9:  ['Indomitable'],
  10: ['Additional Fighting Style'],
  11: ['Extra Attack (3 per turn)'],
  12: ['Ability Score Improvement'],
};

// ── Player Character ─────────────────────────────────
// Edit this object to change starting stats, class features, etc.
const PLAYER_STATS = {
  name:     'Adventurer',
  class:    'Fighter',
  level:    1,
  xp:       0,

  // Ability scores (standard array: 16,14,14,10,12,10)
  str: 16, dex: 14, con: 14,
  int: 10, wis: 12, cha: 10,

  ac:         16,           // Chain mail + shield
  atkDice:    [1, 8, 3],    // 1d8 + STR mod(3). [count, sides, bonus]
  atkRange:   1,            // melee = 1 tile
  profBonus:  2,
  hitDie:     10,           // Fighter d10
  maxHP:      12,           // 1d10 max + CON mod(2)
  savingThrows: new Set(['str','con']),
  features:   [...FIGHTER_FEATURES[1]],
  asiPending: 0,

  // Starting tile position
  startTile: { x:2, y:2 },
};

// ── Enemies ──────────────────────────────────────────
// Official DnD 5e Monster Manual stats
// facing: degrees (0=right, 90=down, 180=left, 270=up)
// fov:    cone width in degrees
// atkDice: [count, sides, bonus]
// group:  enemies with the same group tag alert together
//         null = always solo
const ENEMY_DEFS = [
  {
    tx:8, ty:2, type:'goblin', hp:7, maxHp:7,
    sight:4, spd:2, icon:'👺', facing:180, fov:120, group:'goblins',
    stats:{ str:8, dex:14, con:10, int:10, wis:8, cha:8 },
    ac:15, atkDice:[1,6,-1], atkRange:1, xp:50, cr:'1/4',
  },
  {
    tx:14, ty:3, type:'goblin', hp:7, maxHp:7,
    sight:4, spd:2, icon:'👺', facing:90, fov:120, group:'goblins',
    stats:{ str:8, dex:14, con:10, int:10, wis:8, cha:8 },
    ac:15, atkDice:[1,6,-1], atkRange:1, xp:50, cr:'1/4',
  },
  {
    tx:7, ty:9, type:'skeleton', hp:13, maxHp:13,
    sight:5, spd:2, icon:'💀', facing:0, fov:100, group:'skeletons',
    stats:{ str:10, dex:14, con:15, int:6, wis:8, cha:5 },
    ac:13, atkDice:[1,6,2], atkRange:1, xp:100, cr:'1/4',
  },
  {
    tx:16, ty:10, type:'skeleton', hp:13, maxHp:13,
    sight:5, spd:2, icon:'💀', facing:180, fov:100, group:'skeletons',
    stats:{ str:10, dex:14, con:15, int:6, wis:8, cha:5 },
    ac:13, atkDice:[1,6,2], atkRange:1, xp:100, cr:'1/4',
  },
  {
    tx:10, ty:13, type:'orc', hp:15, maxHp:15,
    sight:6, spd:1, icon:'👹', facing:270, fov:140, group:null,
    stats:{ str:16, dex:12, con:16, int:7, wis:11, cha:10 },
    ac:13, atkDice:[1,12,3], atkRange:1, xp:200, cr:'1/2',
  },
];

// ── DnD Helpers ──────────────────────────────────────
const dnd = {
  mod:     s => Math.floor((s - 10) / 2),
  roll:    (n,d) => Array.from({length:n}, () => Math.floor(Math.random()*d)+1).reduce((a,b)=>a+b,0),
  rollStr: (n,d,b) => {
    const rs = Array.from({length:n}, () => Math.floor(Math.random()*d)+1);
    const t  = rs.reduce((a,b)=>a+b,0) + b;
    return { rolls:rs, total:t, str:`${n}d${d}${b>=0?'+':''}${b}[${rs.join(',')}]=${t}` };
  },
  profBonus: lvl => Math.floor((lvl-1)/4)+2,
};
