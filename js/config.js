// ═══════════════════════════════════════════════════════
// config.js — All configurable game data
// Edit this file to change map layout, player, enemies,
// leveling tables, and game constants.
// ═══════════════════════════════════════════════════════

// ── Tile Types ───────────────────────────────────────
const TILE = { FLOOR:0, WALL:1, DOOR:3, CHEST:4, STAIRS:5, WATER:6, GRASS:7 };

// ── Grid & Display ───────────────────────────────────
const S    = 48;  // tile size in pixels (default; overridden by rules.yaml display.tileSize)
const MODE = { EXPLORE:'explore', COMBAT:'combat' };

// ── Combat behavior tuning ──────────────────────────
const COMBAT_RULES = {
  // Cap same-room alert propagation in very large rooms.
  roomAlertMaxDistance: 8,
  // BG3-like flee gate: must create distance and break enemy sight.
  fleeMinDistance: 6,
  fleeRequiresNoLOS: true,
  // Pacing tuning
  playerMovePerTurn: 5,
  dashMoveBonus: 4,
  enemySightScale: 1.0,
  enemySpeedScale: 0.75,
};

// ── Status effect timing (BG3-style hooks) ──────────
const STATUS_RULES = {
  exploreTickMs: 1000,
  defaultPoisonDamageDice: [1, 4, 0],
  sleepWakeDc: 12,
};

// ── Fog of war tuning ───────────────────────────────
const FOG_RULES = {
  enabled: true,
  radius: 7,
  unvisitedAlpha: 1.0,   // fully black — player cannot see unvisited tiles
  exploredAlpha: 0.55,   // dim overlay on visited-but-not-visible tiles
  exploredColor: 0x1a1d24,
};

// ── Light and hiding rules (BG3/DnD-inspired) ──────
const LIGHT_RULES = {
  darkSightPenalty: 1,
  dimSightPenalty: 0,
  hiddenSightPenalty: 2,
  hideDcBright: 16,
  hideDcDim: 12,
  hideDcDark: 8,
};

// ── Door interaction rules ──────────────────────────
const DOOR_RULES = {
  autoOpenOnPass: true,
  defaultAuto: false,
};

// ── Map Layout ───────────────────────────────────────
// Each symbol corresponds to a tile type from rules.yaml.
// Modify this 2D array to redesign the dungeon.
// Symbols: # = WALL, . = FLOOR, D = DOOR, C = CHEST, S = STAIRS, ~ = WATER, G = GRASS
const MAP = [
  ['#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#'],
  ['#','.','.','.','.','.','#','.','.','.','.','.','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','#','.','.','.','.','.','G','G','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','C','.','.','D','.','.','.','G','G','G','G','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','#','.','.','.','G','G','~','~','G','G','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','#','.','.','.','G','~','~','~','~','G','.','.','.','.','.','#'],
  ['#','#','#','#','#','D','#','#','#','#','#','#','#','#','#','#','#','D','#','#'],
  ['#','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','#','#','#','.','.','.','.','.','.','.','#','#','#','.','.','.','#'],
  ['#','.','.','.','#','.','.','.','.','.','.','.','.','.','.','#','.','.','.','#'],
  ['#','.','.','.','#','.','.','.','.','.','.','.','.','.','.','#','.','.','.','#'],
  ['#','.','.','.','#','#','#','.','.','.','.','.','.','.','#','#','#','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','.','S','.','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','#'],
  ['#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#'],
];
let ROWS = MAP.length;
let COLS = MAP[0].length;

// ── DnD 5e XP Thresholds (per level) ────────────────
const DND_XP = [
  0,300,900,2700,6500,14000,23000,34000,
  48000,64000,85000,100000,120000,140000,
  165000,195000,225000,265000,305000,355000
];

// ── Levels that grant Ability Score Improvements ─────
const ASI_LEVELS = new Set([4,8,12,16,19]);

// ── DnD 5e Skills (all 18) ───────────────────────────
// Each skill maps to an ability score. Used for skill checks.
const SKILLS = {
  acrobatics:     { ability:'dex', label:'Acrobatics' },
  animalHandling: { ability:'wis', label:'Animal Handling' },
  arcana:         { ability:'int', label:'Arcana' },
  athletics:      { ability:'str', label:'Athletics' },
  deception:      { ability:'cha', label:'Deception' },
  history:        { ability:'int', label:'History' },
  insight:        { ability:'wis', label:'Insight' },
  intimidation:   { ability:'cha', label:'Intimidation' },
  investigation:  { ability:'int', label:'Investigation' },
  medicine:       { ability:'wis', label:'Medicine' },
  nature:         { ability:'int', label:'Nature' },
  perception:     { ability:'wis', label:'Perception' },
  performance:    { ability:'cha', label:'Performance' },
  persuasion:     { ability:'cha', label:'Persuasion' },
  religion:       { ability:'int', label:'Religion' },
  sleightOfHand:  { ability:'dex', label:'Sleight of Hand' },
  stealth:        { ability:'dex', label:'Stealth' },
  survival:       { ability:'wis', label:'Survival' },
};

// ── Weapons (BG3/DnD style data model) ───────────────
// Loaded/overridden by modloader from data/core/weapons.yaml
const WEAPON_DEFS = {
  longsword: {
    name: 'Longsword',
    category: 'martial_melee',
    damageType: 'slashing',
    damageDice: [1, 8, 3],
    range: 1,
    properties: ['versatile'],
  },
  shortsword: {
    name: 'Shortsword',
    category: 'martial_melee',
    damageType: 'piercing',
    damageDice: [1, 6, 3],
    range: 1,
    properties: ['finesse', 'light'],
  },
};

// ── Ability Definitions (BG3-style ability system) ───
// Loaded/overridden by modloader from data/core/abilities.yaml
const ABILITY_DEFS = {
  attack: { name: 'Attack', type: 'action', resourceCost: { action: 1 } },
  dash: { name: 'Dash', type: 'action', resourceCost: { action: 1 } },
  disengage: { name: 'Disengage', type: 'bonusAction', resourceCost: { bonusAction: 1 } },
  hide: { name: 'Hide', type: 'action', resourceCost: { action: 1 } },
  flee: { name: 'Flee', type: 'action', resourceCost: { action: 1 } },
};

// ── Item definitions (data-driven, mod-overridable) ──────────
const ITEM_DEFS = {};

// ── Status definitions (data-driven, mod-overridable) ─────────
const STATUS_DEFS = {
  poisoned: {
    id: 'poisoned',
    trigger: 'turn_end',
    duration: 3,
    onTrigger: { damageDice: [1, 4, 0], damageColor: 0x8bc34a },
  },
  sleep: {
    id: 'sleep',
    trigger: 'turn_start',
    duration: 2,
    onTrigger: { skipTurn: true, removeOnSave: { stat: 'wis', dc: 12 } },
  },
};

// ── Classes (BG3/DnD style) ──────────────────────
// Loaded from data/core/classes.yaml and mod overrides
// Keys are class names (fighter, rogue, etc.)
const CLASSES_DATA = {};

// ── Player Character ─────────────────────────────────
// Edit this object to change starting stats, class features, etc.
const PLAYER_STATS = {
  name:     'Rogue',
  class:    'Rogue',
  level:    1,
  xp:       0,

  // Ability scores optimized for Rogue (high DEX, decent CON/WIS)
  str: 10, dex: 16, con: 14,
  int: 12, wis: 13, cha: 10,

  ac:         14,           // Leather armor (11) + DEX mod (+3)
  weaponId:   'shortsword',
  damageFormula: '1d6+3',   // Weapon damage in dice notation
  atkRange:   1,            // melee = 1 tile
  profBonus:  2,
  hitDie:     8,            // Rogue d8
  maxHP:      10,           // 1d8 max + CON mod(2)
  savingThrows: new Set(['dex','int']),
  skillProficiencies: new Set(['stealth','sleightOfHand','acrobatics','investigation']),
  expertiseSkills: new Set(['stealth','sleightOfHand']),  // Double proficiency bonus (Rogue Expertise)
  features:   ['Expertise (master 2 skills)', 'Sneak Attack (1d6 bonus dmg)'],  // L1 Rogue features from classes.yaml
  sneakAttackDice: 1,  // 1d6 Sneak Attack at level 1
  asiPending: 0,

  gold: 0,
  inventory: [],        // array of item objects { id, name, icon, type, ... }
  equippedWeapon: null, // item object currently in weapon slot (null = using default weapon)
  equippedArmor:  null, // item object currently in armor slot
  baseAC: 14,           // AC without any equipped armor bonuses

  // Starting tile position
  startTile: { x:2, y:2 },
};

// ── Enemies ──────────────────────────────────────────
// Official DnD 5e Monster Manual stats
// facing: degrees (0=right, 90=down, 180=left, 270=up)
// fov:    cone width in degrees
// damageFormula: e.g. "1d6+2", "1d12+1d4+3"
// group:  enemies with the same group tag alert together
//         null = always solo
const ENEMY_DEFS = [
  {
    tx:8, ty:2, type:'goblin', hp:7, maxHp:7, level:1,
    sight:4, spd:2, icon:'👺', facing:180, fov:120, group:'goblins',
    stats:{ str:8, dex:14, con:10, int:10, wis:8, cha:8 },
    skillProficiencies:new Set(['stealth','perception']),
    ac:15, damageFormula:'1d6-1', atkRange:1, xp:50, cr:'1/4',
  },
  {
    tx:14, ty:3, type:'goblin', hp:7, maxHp:7, level:1,
    sight:4, spd:2, icon:'👺', facing:90, fov:120, group:'goblins',
    stats:{ str:8, dex:14, con:10, int:10, wis:8, cha:8 },
    skillProficiencies:new Set(['stealth','perception']),
    ac:15, damageFormula:'1d6-1', atkRange:1, xp:50, cr:'1/4',
  },
  {
    tx:7, ty:9, type:'skeleton', hp:13, maxHp:13, level:1,
    sight:5, spd:2, icon:'💀', facing:0, fov:100, group:'skeletons',
    stats:{ str:10, dex:14, con:15, int:6, wis:8, cha:5 },
    skillProficiencies:new Set(['perception']),
    ac:13, damageFormula:'1d6+2', atkRange:1, xp:100, cr:'1/4',
  },
  {
    tx:16, ty:10, type:'skeleton', hp:13, maxHp:13, level:1,
    sight:5, spd:2, icon:'💀', facing:180, fov:100, group:'skeletons',
    stats:{ str:10, dex:14, con:15, int:6, wis:8, cha:5 },
    skillProficiencies:new Set(['perception']),
    ac:13, damageFormula:'1d6+2', atkRange:1, xp:100, cr:'1/4',
  },
  {
    tx:10, ty:13, type:'orc', hp:15, maxHp:15, level:1,
    sight:6, spd:1, icon:'👹', facing:270, fov:140, group:null,
    stats:{ str:16, dex:12, con:16, int:7, wis:11, cha:10 },
    skillProficiencies:new Set(['perception']),
    ac:13, damageFormula:'1d12+3', atkRange:1, xp:200, cr:'1/2',
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
  // Supports legacy [n,s,b] and modern { dice:[[n,s],...], bonus }.
  normalizeDamageSpec: (spec) => {
    if (!spec) return { dice:[[1,4]], bonus:0 };

    // Human-readable notation: "1d8+3", "2d6+1d4-1"
    if (typeof spec === 'string') {
      const cleaned = spec.replace(/\s+/g, '').toLowerCase();
      if (!cleaned) return { dice:[[1,4]], bonus:0 };
      const parts = cleaned.match(/[+-]?[^+-]+/g) || [];
      const dice = [];
      let bonus = 0;
      for (const raw of parts) {
        const sign = raw.startsWith('-') ? -1 : 1;
        const token = raw.replace(/^[-+]/, '');
        const m = token.match(/^(\d*)d(\d+)$/);
        if (m) {
          const count = Number(m[1] || 1) * sign;
          const sides = Number(m[2]);
          if (count > 0 && sides > 0) dice.push([count, sides]);
          continue;
        }
        const n = Number(token);
        if (!Number.isNaN(n)) bonus += sign * n;
      }
      if (dice.length) return { dice, bonus };
      return { dice:[[1,4]], bonus };
    }

    // Legacy: [n,s,b]
    if (Array.isArray(spec) && spec.length>=2 && typeof spec[0]==='number' && typeof spec[1]==='number') {
      return { dice:[[spec[0], spec[1]]], bonus: Number(spec[2] || 0) };
    }

    // Dice-only array: [[n,s],[n,s],...]
    if (Array.isArray(spec) && spec.every(p => Array.isArray(p) && p.length>=2)) {
      return { dice: spec.map(p => [Number(p[0]), Number(p[1])]), bonus:0 };
    }

    // Object shape: { dice:[[n,s],...], bonus }
    if (typeof spec === 'object') {
      const dice = Array.isArray(spec.dice) ? spec.dice.map(p => [Number(p[0]), Number(p[1])]) : [];
      const bonus = Number(spec.bonus || 0);
      if (dice.length) return { dice, bonus };

      // Fallback compatibility fields
      if (Array.isArray(spec.damageDice) || typeof spec.damageDice === 'string') {
        return dnd.normalizeDamageSpec(spec.damageDice);
      }
    }

    return { dice:[[1,4]], bonus:0 };
  },

  // Roll normalized damage spec; crit doubles only dice, not static bonus.
  rollDamageSpec: (spec, crit=false) => {
    const dmg = dnd.normalizeDamageSpec(spec);
    const baseRolls = [];
    const critRolls = [];
    let subtotal = 0;

    for (const [count, sides] of dmg.dice) {
      for (let i = 0; i < count; i++) {
        const v = Math.floor(Math.random()*sides)+1;
        baseRolls.push({ sides, value: v, kind: 'd'+sides });
        subtotal += v;
      }
      if (crit) {
        for (let i = 0; i < count; i++) {
          const v = Math.floor(Math.random()*sides)+1;
          critRolls.push({ sides, value: v, kind: 'd'+sides });
          subtotal += v;
        }
      }
    }

    return {
      total: subtotal + dmg.bonus,
      bonus: dmg.bonus,
      isCrit: crit,
      baseRolls,
      critRolls,
      diceValues: [...baseRolls, ...critRolls],  // for showDicePopup compat
    };
  },

  damageSpecToString: (spec) => {
    const dmg = dnd.normalizeDamageSpec(spec);
    const diceStr = dmg.dice.map(([c,s]) => `${c}d${s}`).join('+');
    const bonusStr = dmg.bonus ? `${dmg.bonus>=0?'+':''}${dmg.bonus}` : '';
    return `${diceStr}${bonusStr}`;
  },
  // Skill modifier: ability mod + proficiency (if proficient)
  skillMod: (skillKey, stats) => {
    const sk = SKILLS[skillKey]; if(!sk) return 0;
    const aMod = Math.floor((stats[sk.ability] - 10) / 2);
    let profBonus = 0;
    if (stats.skillProficiencies && stats.skillProficiencies.has(skillKey)) {
      profBonus = dnd.profBonus(stats.level);
      // Double proficiency if Expertise (Rogue feature)
      if (stats.expertiseSkills && stats.expertiseSkills.has(skillKey)) {
        profBonus *= 2;
      }
    }
    return aMod + profBonus;
  },
  // Skill check: roll d20 + skill mod, return result object
  skillCheck: (skillKey, stats, dc) => {
    const mod = dnd.skillMod(skillKey, stats);
    const roll = Math.floor(Math.random()*20)+1;
    const total = roll + mod;
    return { roll, mod, total, success: total >= dc, skill: SKILLS[skillKey]?.label || skillKey };
  },
  // Passive skill: 10 + skill mod (no roll, used for perception vs stealth)
  passiveSkill: (skillKey, stats) => {
    const mod = dnd.skillMod(skillKey, stats);
    return 10 + mod;
  },
};
