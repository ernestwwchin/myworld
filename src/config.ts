export const TILE = {
  FLOOR: 0,
  WALL: 1,
  DOOR: 3,
  CHEST: 4,
  STAIRS: 5,
  WATER: 6,
  GRASS: 7,
} as const;

export const S = 48;

export const MODE = { EXPLORE: 'explore', COMBAT: 'combat' } as const;
export type ModeKey = typeof MODE[keyof typeof MODE];

export const COMBAT_RULES = {
  roomAlertMaxDistance: 8,
  largeRoomTileThreshold: 90,
  largeRoomJoinDistance: 6,
  fleeMinDistance: 6,
  fleeRequiresNoLOS: true,
  playerMovePerTurn: 5,
  dashMoveBonus: 4,
  enemySightScale: 1.0,
  enemySpeedScale: 0.75,
};

export const STATUS_RULES = {
  exploreTickMs: 1000,
  defaultPoisonDamageDice: [1, 4, 0] as [number, number, number],
  sleepWakeDc: 12,
};

export const FOG_RULES = {
  enabled: true,
  radius: 7,
  unvisitedAlpha: 1.0,
  exploredAlpha: 0.55,
  exploredColor: 0x1a1d24,
};

export const LIGHT_RULES = {
  darkSightPenalty: 1,
  dimSightPenalty: 0,
  hiddenSightPenalty: 2,
  torchBrightStrength: 0.85,
  torchDimStrength: 0.55,
  torchRadiusScale: 1.2,
  noTorchVisibleLightFloor: 0.12,
  hideDcBright: 16,
  hideDcDim: 12,
  hideDcDark: 8,
};

export const DOOR_RULES = {
  autoOpenOnPass: true,
  defaultAuto: false,
};

export type TileSymbol = number | string;

export const MAP: TileSymbol[][] = [
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

export const mapState = {
  rows: MAP.length,
  cols: MAP[0].length,
};

export const DND_XP = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000,
  48000, 64000, 85000, 100000, 120000, 140000,
  165000, 195000, 225000, 265000, 305000, 355000,
];

export const ASI_LEVELS = new Set<number>([4, 8, 12, 16, 19]);

export const SKILLS: Record<string, { ability: string; label: string }> = {
  acrobatics:     { ability: 'dex', label: 'Acrobatics' },
  animalHandling: { ability: 'wis', label: 'Animal Handling' },
  arcana:         { ability: 'int', label: 'Arcana' },
  athletics:      { ability: 'str', label: 'Athletics' },
  deception:      { ability: 'cha', label: 'Deception' },
  history:        { ability: 'int', label: 'History' },
  insight:        { ability: 'wis', label: 'Insight' },
  intimidation:   { ability: 'cha', label: 'Intimidation' },
  investigation:  { ability: 'int', label: 'Investigation' },
  medicine:       { ability: 'wis', label: 'Medicine' },
  nature:         { ability: 'int', label: 'Nature' },
  perception:     { ability: 'wis', label: 'Perception' },
  performance:    { ability: 'cha', label: 'Performance' },
  persuasion:     { ability: 'cha', label: 'Persuasion' },
  religion:       { ability: 'int', label: 'Religion' },
  sleightOfHand:  { ability: 'dex', label: 'Sleight of Hand' },
  stealth:        { ability: 'dex', label: 'Stealth' },
  survival:       { ability: 'wis', label: 'Survival' },
};

export interface WeaponDef {
  name: string;
  category: string;
  damageType: string;
  damageDice: [number, number, number];
  range: number;
  properties: string[];
  [key: string]: unknown;
}

export const WEAPON_DEFS: Record<string, WeaponDef> = {
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

export interface AbilityDef {
  name: string;
  type: string;
  resourceCost?: Record<string, number>;
  [key: string]: unknown;
}

export const ABILITY_DEFS: Record<string, AbilityDef> = {
  attack: { name: 'Attack', type: 'action', resourceCost: { action: 1 } },
  dash: { name: 'Dash', type: 'action', resourceCost: { action: 1 } },
  disengage: { name: 'Disengage', type: 'bonusAction', resourceCost: { bonusAction: 1 } },
  hide: { name: 'Hide', type: 'action', resourceCost: { action: 1 } },
  flee: { name: 'Flee', type: 'action', resourceCost: { action: 1 } },
};

export interface ItemDef {
  id: string;
  name?: string;
  type?: string;
  icon?: string;
  [key: string]: unknown;
}
export const ITEM_DEFS: Record<string, ItemDef> = {};

export interface StatusDef {
  id: string;
  trigger: string;
  duration: number;
  onTrigger?: Record<string, unknown>;
  [key: string]: unknown;
}

export const STATUS_DEFS: Record<string, StatusDef> = {
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

export const CLASSES_DATA: Record<string, Record<string, unknown>> = {};

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  icon?: string;
  type?: string;
  reward?: { gold?: number; xp?: number; items?: string[] };
  objectives?: Array<{ id: string; label: string; count?: number }>;
  [key: string]: unknown;
}

export const QUEST_DEFS: Record<string, QuestDef> = {};

export interface InventoryItem {
  id: string;
  name?: string;
  icon?: string;
  type?: string;
  [key: string]: unknown;
}

export interface PlayerStats {
  name: string;
  class: string;
  level: number;
  xp: number;

  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;

  ac: number;
  weaponId: string;
  damageFormula: string;
  atkRange: number;
  profBonus: number;
  hitDie: number;
  maxHP: number;
  currentHP: number;
  savingThrows: Set<string>;
  skillProficiencies: Set<string>;
  expertiseSkills: Set<string>;
  features: string[];
  sneakAttackDice: number;
  asiPending: number;

  gold: number;
  inventory: InventoryItem[];
  stash: InventoryItem[];
  equippedWeapon: InventoryItem | null;
  equippedArmor: InventoryItem | null;
  baseAC: number;

  startTile: { x: number; y: number };
  [key: string]: unknown;
}

export const PLAYER_STATS: PlayerStats = {
  name: 'Rogue',
  class: 'Rogue',
  level: 1,
  xp: 0,

  str: 10, dex: 16, con: 14,
  int: 12, wis: 13, cha: 10,

  ac: 14,
  weaponId: 'shortsword',
  damageFormula: '1d6+3',
  atkRange: 1,
  profBonus: 2,
  hitDie: 8,
  maxHP: 10,
  currentHP: 10,
  savingThrows: new Set(['dex', 'int']),
  skillProficiencies: new Set(['stealth', 'sleightOfHand', 'acrobatics', 'investigation']),
  expertiseSkills: new Set(['stealth', 'sleightOfHand']),
  features: ['Expertise (master 2 skills)', 'Sneak Attack (1d6 bonus dmg)'],
  sneakAttackDice: 1,
  asiPending: 0,

  gold: 0,
  inventory: [],
  stash: [],
  equippedWeapon: null,
  equippedArmor: null,
  baseAC: 14,

  startTile: { x: 2, y: 2 },
};

export interface EnemyDef {
  tx: number; ty: number;
  type: string;
  hp: number; maxHp: number; level: number;
  sight: number; spd: number;
  icon: string;
  facing: number; fov: number;
  group: string | null;
  stats: Record<string, number>;
  skillProficiencies: Set<string>;
  ac: number;
  damageFormula: string;
  atkRange: number;
  xp: number;
  cr: string;
  [key: string]: unknown;
}

export const ENEMY_DEFS: EnemyDef[] = [
  {
    tx: 8, ty: 2, type: 'goblin', hp: 7, maxHp: 7, level: 1,
    sight: 4, spd: 2, icon: '👺', facing: 180, fov: 120, group: 'goblins',
    stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    skillProficiencies: new Set(['stealth', 'perception']),
    ac: 15, damageFormula: '1d6-1', atkRange: 1, xp: 50, cr: '1/4',
  },
  {
    tx: 14, ty: 3, type: 'goblin', hp: 7, maxHp: 7, level: 1,
    sight: 4, spd: 2, icon: '👺', facing: 90, fov: 120, group: 'goblins',
    stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    skillProficiencies: new Set(['stealth', 'perception']),
    ac: 15, damageFormula: '1d6-1', atkRange: 1, xp: 50, cr: '1/4',
  },
  {
    tx: 7, ty: 9, type: 'skeleton', hp: 13, maxHp: 13, level: 1,
    sight: 5, spd: 2, icon: '💀', facing: 0, fov: 100, group: 'skeletons',
    stats: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
    skillProficiencies: new Set(['perception']),
    ac: 13, damageFormula: '1d6+2', atkRange: 1, xp: 100, cr: '1/4',
  },
  {
    tx: 16, ty: 10, type: 'skeleton', hp: 13, maxHp: 13, level: 1,
    sight: 5, spd: 2, icon: '💀', facing: 180, fov: 100, group: 'skeletons',
    stats: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
    skillProficiencies: new Set(['perception']),
    ac: 13, damageFormula: '1d6+2', atkRange: 1, xp: 100, cr: '1/4',
  },
  {
    tx: 10, ty: 13, type: 'orc', hp: 15, maxHp: 15, level: 1,
    sight: 6, spd: 1, icon: '👹', facing: 270, fov: 140, group: null,
    stats: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
    skillProficiencies: new Set(['perception']),
    ac: 13, damageFormula: '1d12+3', atkRange: 1, xp: 200, cr: '1/2',
  },
];

export interface DamageRoll {
  total: number;
  bonus: number;
  isCrit: boolean;
  baseRolls: { sides: number; value: number; kind: string }[];
  critRolls: { sides: number; value: number; kind: string }[];
  diceValues: { sides: number; value: number; kind: string }[];
}

export interface NormalizedDamageSpec {
  dice: [number, number][];
  bonus: number;
}

export type DamageSpec =
  | string
  | [number, number]
  | [number, number, number]
  | [number, number][]
  | { dice?: [number, number][]; bonus?: number; damageDice?: DamageSpec }
  | null
  | undefined;

export const dnd = {
  mod: (s: number): number => Math.floor((s - 10) / 2),

  roll: (n: number, d: number): number =>
    Array.from({ length: n }, () => Math.floor(Math.random() * d) + 1).reduce((a, b) => a + b, 0),

  rollStr: (n: number, d: number, b: number) => {
    const rs = Array.from({ length: n }, () => Math.floor(Math.random() * d) + 1);
    const t = rs.reduce((a, b) => a + b, 0) + b;
    return { rolls: rs, total: t, str: `${n}d${d}${b >= 0 ? '+' : ''}${b}[${rs.join(',')}]=${t}` };
  },

  profBonus: (lvl: number): number => Math.floor((lvl - 1) / 4) + 2,

  normalizeDamageSpec: (spec: DamageSpec): NormalizedDamageSpec => {
    if (!spec) return { dice: [[1, 4]], bonus: 0 };

    if (typeof spec === 'string') {
      const cleaned = spec.replace(/\s+/g, '').toLowerCase();
      if (!cleaned) return { dice: [[1, 4]], bonus: 0 };
      const parts = cleaned.match(/[+-]?[^+-]+/g) || [];
      const dice: [number, number][] = [];
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
      return { dice: [[1, 4]], bonus };
    }

    if (Array.isArray(spec) && spec.length >= 2 && typeof spec[0] === 'number' && typeof spec[1] === 'number') {
      return { dice: [[spec[0] as number, spec[1] as number]], bonus: Number((spec as number[])[2] || 0) };
    }

    if (Array.isArray(spec) && spec.every((p) => Array.isArray(p) && p.length >= 2)) {
      return {
        dice: (spec as [number, number][]).map((p) => [Number(p[0]), Number(p[1])]),
        bonus: 0,
      };
    }

    if (typeof spec === 'object' && spec !== null) {
      const obj = spec as { dice?: [number, number][]; bonus?: number; damageDice?: DamageSpec };
      const dice = Array.isArray(obj.dice)
        ? obj.dice.map((p) => [Number(p[0]), Number(p[1])] as [number, number])
        : [];
      const bonus = Number(obj.bonus || 0);
      if (dice.length) return { dice, bonus };

      if (Array.isArray(obj.damageDice) || typeof obj.damageDice === 'string') {
        return dnd.normalizeDamageSpec(obj.damageDice as DamageSpec);
      }
    }

    return { dice: [[1, 4]], bonus: 0 };
  },

  rollDamageSpec: (spec: DamageSpec, crit = false): DamageRoll => {
    const dmg = dnd.normalizeDamageSpec(spec);
    const baseRolls: { sides: number; value: number; kind: string }[] = [];
    const critRolls: { sides: number; value: number; kind: string }[] = [];
    let subtotal = 0;

    for (const [count, sides] of dmg.dice) {
      for (let i = 0; i < count; i++) {
        const v = Math.floor(Math.random() * sides) + 1;
        baseRolls.push({ sides, value: v, kind: 'd' + sides });
        subtotal += v;
      }
      if (crit) {
        for (let i = 0; i < count; i++) {
          const v = Math.floor(Math.random() * sides) + 1;
          critRolls.push({ sides, value: v, kind: 'd' + sides });
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
      diceValues: [...baseRolls, ...critRolls],
    };
  },

  damageSpecToString: (spec: DamageSpec): string => {
    const dmg = dnd.normalizeDamageSpec(spec);
    const diceStr = dmg.dice.map(([c, s]) => `${c}d${s}`).join('+');
    const bonusStr = dmg.bonus ? `${dmg.bonus >= 0 ? '+' : ''}${dmg.bonus}` : '';
    return `${diceStr}${bonusStr}`;
  },

  damageSpecAvg: (spec: DamageSpec): number => {
    const dmg = dnd.normalizeDamageSpec(spec);
    let avg = dmg.bonus || 0;
    for (const [c, s] of dmg.dice) avg += c * (s + 1) / 2;
    return avg;
  },

  skillMod: (skillKey: string, stats: Record<string, unknown>): number => {
    const sk = SKILLS[skillKey];
    if (!sk) return 0;
    const aMod = Math.floor(((stats[sk.ability] as number) - 10) / 2);
    let profBonus = 0;
    const profs = stats.skillProficiencies as Set<string> | undefined;
    if (profs && profs.has(skillKey)) {
      profBonus = dnd.profBonus(stats.level as number);
      const exp = stats.expertiseSkills as Set<string> | undefined;
      if (exp && exp.has(skillKey)) {
        profBonus *= 2;
      }
    }
    return aMod + profBonus;
  },

  skillCheck: (skillKey: string, stats: Record<string, unknown>, dc: number) => {
    const mod = dnd.skillMod(skillKey, stats);
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + mod;
    return { roll, mod, total, success: total >= dc, skill: SKILLS[skillKey]?.label || skillKey };
  },

  passiveSkill: (skillKey: string, stats: Record<string, unknown>): number => {
    const mod = dnd.skillMod(skillKey, stats);
    return 10 + mod;
  },
};

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.TILE = TILE;
  w.S = S;
  w.MODE = MODE;
  w.COMBAT_RULES = COMBAT_RULES;
  w.STATUS_RULES = STATUS_RULES;
  w.FOG_RULES = FOG_RULES;
  w.LIGHT_RULES = LIGHT_RULES;
  w.DOOR_RULES = DOOR_RULES;
  w.MAP = MAP;
  w.DND_XP = DND_XP;
  w.ASI_LEVELS = ASI_LEVELS;
  w.SKILLS = SKILLS;
  w.WEAPON_DEFS = WEAPON_DEFS;
  w.ABILITY_DEFS = ABILITY_DEFS;
  w.ITEM_DEFS = ITEM_DEFS;
  w.STATUS_DEFS = STATUS_DEFS;
  w.CLASSES_DATA = CLASSES_DATA;
  w.QUEST_DEFS = QUEST_DEFS;
  w.PLAYER_STATS = PLAYER_STATS;
  w.ENEMY_DEFS = ENEMY_DEFS;
  w.dnd = dnd;

  Object.defineProperty(window, 'ROWS', {
    configurable: true,
    get: () => mapState.rows,
    set: (v: number) => { mapState.rows = v; },
  });
  Object.defineProperty(window, 'COLS', {
    configurable: true,
    get: () => mapState.cols,
    set: (v: number) => { mapState.cols = v; },
  });
}
