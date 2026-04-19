import yaml from 'js-yaml';
import {
  TILE, COMBAT_RULES, STATUS_RULES, FOG_RULES, LIGHT_RULES, DOOR_RULES,
  MAP, mapState, DND_XP, ASI_LEVELS, SKILLS,
  WEAPON_DEFS, ABILITY_DEFS, ITEM_DEFS, STATUS_DEFS, CLASSES_DATA,
  PLAYER_STATS, ENEMY_DEFS, dnd,
} from '@/config';
import { MapGen } from '@/mapgen';

type Dict = Record<string, unknown>;
type Tile = number | string;

interface WindowCompat {
  _SPRITE_CFG?: Dict;
  _TILESET_CFG?: Dict;
  S?: number;
  SPRITE_MANIFEST?: {
    atlases: Dict[];
    tiles: Dict;
    characters: Dict;
  };
  _MAP_META?: MapMeta | null;
  _ROWS?: number;
  _COLS?: number;
  ABILITY_HOOKS?: Record<string, unknown[]>;
  _scene?: unknown;
  Flags?: FlagsShape;
}

interface FlagsShape {
  load?(snapshot: unknown): void;
  serialize?(): Dict;
  reset?(): void;
  registerMod?(modId: string, flags: unknown): void;
  applyOverrides?(overrides: unknown): void;
}

interface MapMeta {
  name: string;
  floor: string;
  playerStart: { x: number; y: number };
  stairsPos: { x: number; y: number } | null;
  lights: Dict[];
  globalLight: string;
  doors: Dict[];
  interactables: Dict[];
  lootTables: Dict;
  stageSprites: Dict[];
  tileAnimations: Dict;
  nextStage: string | null;
}

interface RunState {
  runId: string | null;
  seed: number | null;
  worldId: string | null;
  depth: number;
  acceptedQuests: unknown[];
  carried: { items: Dict[] };
  runGold: number;
  currentStage?: string | null;
  history: string[];
  plannedStages: string[];
  lastOutcome?: string;
  lastSummary?: string;
}

interface ModData {
  rules: Dict;
  classes: Dict;
  weapons: Dict;
  creatures: Dict;
  maps: Record<string, Dict>;
  abilities: Dict;
  statuses: Dict;
  statusRules: Dict;
  lootTables: Dict;
  items: Dict;
  worlds?: Dict;
  _stageEvents?: unknown[];
  _stageAutoplay?: unknown[];
  _stageDialogs?: Dict;
  [key: string]: unknown;
}

function w(): WindowCompat {
  return (typeof window !== 'undefined' ? (window as unknown as WindowCompat) : {}) as WindowCompat;
}

function getFlags(): FlagsShape | undefined {
  return w().Flags;
}

export const ModLoader = {
  _saveKey: 'myworld.save.v1',
  _lastRunSummary: null as Dict | null,
  _modData: null as ModData | null,
  _runState: null as RunState | null,
  _generatedMapSeeds: {} as Record<string, number>,
  _tileSymbolMap: {} as Record<string, number>,
  _stageRegistry: {} as Record<string, string>,
  _activeMap: null as string | null,
  _beforeUnloadHookInstalled: false,

  _newRunId(): string {
    const ts = Date.now().toString(36);
    const rnd = Math.floor(Math.random() * 1e8).toString(36);
    return `run_${ts}_${rnd}`;
  },

  _captureCarriedState(): { items: Dict[]; gold: number } {
    return {
      items: Array.isArray(PLAYER_STATS.inventory) ? PLAYER_STATS.inventory.map((i) => ({ ...i })) : [],
      gold: Number(PLAYER_STATS.gold || 0),
    };
  },

  async loadYaml(path: string): Promise<unknown> {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const text = await res.text();
    return yaml.load(text);
  },

  convertGridSymbols(grid: unknown[]): Tile[][] {
    if (!grid || grid.length === 0) return grid as Tile[][];
    const first = grid[0];
    if (Array.isArray(first) && typeof first[0] === 'number') return grid as Tile[][];

    const converted: number[][] = (grid as (string | unknown[])[]).map((row) => {
      if (typeof row === 'string') {
        return Array.from(row).map((char) => this._tileSymbolMap[char] ?? 0);
      }
      return (row as unknown[]).map((cell) => {
        if (typeof cell === 'number') return cell;
        return this._tileSymbolMap[String(cell)] ?? 0;
      });
    });

    const maxCols = converted.reduce((m, row) => Math.max(m, row.length), 0);
    const wall = this._tileSymbolMap['#'] ?? 1;
    const normalized = converted.map((row, idx) => {
      if (row.length === maxCols) return row;
      console.warn(`[ModLoader] Row ${idx + 1} has ${row.length} cols; padding to ${maxCols}.`);
      return row.concat(Array(maxCols - row.length).fill(wall));
    });

    return normalized;
  },

  async tryLoadStage(stageId: string): Promise<Dict | null> {
    if (!stageId) return null;

    if (this._stageRegistry?.[stageId]) {
      try {
        const stage = (await this.loadYaml(this._stageRegistry[stageId])) as Dict;
        if (stage && (stage.grid || stage.generator)) return stage;
      } catch { /* fall through */ }
    }

    const legacyPaths = [`data/00_core_test/stages/${stageId}/stage.yaml`];
    for (const p of legacyPaths) {
      try {
        const stage = (await this.loadYaml(p)) as Dict;
        if (stage && (stage.grid || stage.generator)) return stage;
      } catch { continue; }
    }

    return null;
  },

  async transitionToStage(stageId: string, scene: any): Promise<void> {
    if (!stageId) return;
    console.log(`[ModLoader] Transitioning to stage: ${stageId}`);

    this.syncPlayerStateFromScene(scene);

    const stageData = await this.tryLoadStage(stageId);
    if (!stageData) {
      console.warn(`[ModLoader] Stage not found: ${stageId}`);
      return;
    }

    const modData = this._modData!;
    modData.maps[stageId] = {
      name: stageData.name || stageId,
      floor: stageData.floor || stageId.toUpperCase(),
      grid: stageData.grid || null,
      generator: stageData.generator || null,
      playerStart: stageData.playerStart || (stageData.generator ? null : { x: 1, y: 1 }),
      encounters: stageData.encounters || [],
      lights: stageData.lights || [],
      globalLight: stageData.globalLight || 'dark',
      doors: stageData.doors || [],
      interactables: stageData.interactables || [],
      lootTables: stageData.lootTables || {},
      stageSprites: stageData.stageSprites || stageData.sprites || [],
      tileAnimations: stageData.tileAnimations || {},
      nextStage: stageData.nextStage || null,
    };

    const stageDir = this._stageRegistry?.[stageId]?.replace('/stage.yaml', '');
    if (stageDir) {
      try { const evts = (await this.loadYaml(`${stageDir}/events.yaml`)) as Dict; modData._stageEvents = (evts?.events as unknown[]) || []; } catch { modData._stageEvents = []; }
      try { const dlgs = (await this.loadYaml(`${stageDir}/dialogs.yaml`)) as Dict; modData._stageDialogs = (dlgs?.dialogs as Dict) || {}; } catch { modData._stageDialogs = {}; }
    } else {
      modData._stageEvents = [];
      modData._stageDialogs = {};
    }

    this._activeMap = stageId;
    this._updateRunStateOnTransition(stageId);
    this.persistGameState(scene);
    this.applyMap(modData, stageId);
    this.applyCreatures(modData, stageId);
    const mapMeta = w()._MAP_META;
    if (mapMeta?.playerStart) {
      PLAYER_STATS.startTile = { ...mapMeta.playerStart };
      this._persistStartTileImmediately(mapMeta.playerStart);
    }

    console.log(`[ModLoader] Stage ready: ${stageId}, MAP=${MAP.length}x${MAP[0]?.length}, playerStart=${JSON.stringify(PLAYER_STATS.startTile)}, nextStage=${w()._MAP_META?.nextStage}`);
    scene.cameras.main.fadeOut(400, 0, 0, 0);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      console.log(`[ModLoader] Fade complete, restarting scene for ${stageId}`);
      scene.scene.restart();
    });
  },

  syncPlayerStateFromScene(scene: any): void {
    if (!scene || !scene.pStats) return;

    const p = scene.pStats;
    PLAYER_STATS.inventory = Array.isArray(p.inventory) ? p.inventory.map((i: Dict) => ({ ...i })) : [];
    PLAYER_STATS.stash = Array.isArray(p.stash) ? p.stash.map((i: Dict) => ({ ...i })) : [];
    PLAYER_STATS.gold = Number(p.gold || 0);
    PLAYER_STATS.equippedWeapon = p.equippedWeapon ? { ...p.equippedWeapon } : null;
    PLAYER_STATS.equippedArmor = p.equippedArmor ? { ...p.equippedArmor } : null;
    PLAYER_STATS.ac = Number(p.ac || PLAYER_STATS.ac || 10);
    PLAYER_STATS.baseAC = Number(p.baseAC || PLAYER_STATS.baseAC || PLAYER_STATS.ac || 10);
    PLAYER_STATS.currentHP = Math.max(0, Number(scene.playerHP || p.maxHP || PLAYER_STATS.maxHP || 1));
    if (scene.playerTile && Number.isFinite(scene.playerTile.x) && Number.isFinite(scene.playerTile.y)) {
      PLAYER_STATS.startTile = { x: Number(scene.playerTile.x), y: Number(scene.playerTile.y) };
    }
  },

  _clonePlain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  },

  _findNearbyInteractionTile(
    grid: Tile[][],
    playerStart: { x: number; y: number },
    occupied: Set<string> = new Set(),
  ): { x: number; y: number } | null {
    if (!grid || !playerStart) return null;
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const sx = Number(playerStart.x || 0);
    const sy = Number(playerStart.y || 0);
    const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;
    const isWalkable = (x: number, y: number) => {
      const v = grid[y]?.[x];
      return v === TILE.FLOOR || v === TILE.GRASS || v === TILE.WATER;
    };

    for (let d = 1; d <= 4; d++) {
      const ring = [
        { x: sx + d, y: sy }, { x: sx - d, y: sy },
        { x: sx, y: sy + d }, { x: sx, y: sy - d },
        { x: sx + d, y: sy + d }, { x: sx + d, y: sy - d },
        { x: sx - d, y: sy + d }, { x: sx - d, y: sy - d },
      ];
      for (const c of ring) {
        if (!inBounds(c.x, c.y)) continue;
        const key = `${c.x},${c.y}`;
        if (occupied.has(key)) continue;
        if (!isWalkable(c.x, c.y)) continue;
        return { x: c.x, y: c.y };
      }
    }
    return null;
  },

  _isWalkableSpawnTile(grid: Tile[][], x: number, y: number): boolean {
    if (!grid || !grid.length) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
    const v = grid[y]?.[x];
    return v === TILE.FLOOR || v === TILE.GRASS || v === TILE.WATER || v === TILE.STAIRS;
  },

  _findNearestWalkableTile(grid: Tile[][], fromTile: { x: number; y: number } | null): { x: number; y: number } | null {
    if (!grid || !grid.length) return null;
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const sx = Number(fromTile?.x || 0);
    const sy = Number(fromTile?.y || 0);
    const key = (x: number, y: number) => `${x},${y}`;
    const q: { x: number; y: number }[] = [{ x: sx, y: sy }];
    const seen = new Set<string>([key(sx, sy)]);
    const dirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
    ];

    while (q.length) {
      const cur = q.shift()!;
      if (this._isWalkableSpawnTile(grid, cur.x, cur.y)) return cur;
      for (const d of dirs) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  },

  _normalizePlayerStartTile(activeMap: string | null): void {
    if (!Array.isArray(MAP) || !MAP.length) return;

    const mapMeta = w()._MAP_META;
    const preferred = PLAYER_STATS.startTile || mapMeta?.playerStart || { x: 1, y: 1 };
    let resolved: { x: number; y: number } | null = null;

    if (this._isWalkableSpawnTile(MAP, preferred.x, preferred.y)) {
      resolved = { x: Number(preferred.x), y: Number(preferred.y) };
    } else {
      resolved = this._findNearestWalkableTile(MAP, preferred);
    }

    if (!resolved) {
      for (let y = 0; y < MAP.length; y++) {
        for (let x = 0; x < MAP[y].length; x++) {
          if (this._isWalkableSpawnTile(MAP, x, y)) {
            resolved = { x, y };
            break;
          }
        }
        if (resolved) break;
      }
    }

    if (!resolved) return;

    PLAYER_STATS.startTile = { ...resolved };
    if (mapMeta) mapMeta.playerStart = { ...resolved };

    if (preferred.x !== resolved.x || preferred.y !== resolved.y) {
      console.warn(`[ModLoader] Adjusted invalid spawn tile on ${activeMap || this._activeMap}: (${preferred.x},${preferred.y}) -> (${resolved.x},${resolved.y})`);
    }
  },

  _buildRuntimeExtractionInteractable(
    floorName: string | undefined,
    playerStart: { x: number; y: number },
    grid: Tile[][],
    interactables: Dict[],
  ): Dict | null {
    if (String(floorName || '').toUpperCase() === 'TOWN') return null;

    const existing = Array.isArray(interactables) ? interactables : [];
    const hasExtraction = existing.some((it: any) => {
      const st = it?.state || {};
      const actions = Array.isArray(st.actions) ? st.actions : [];
      return String(st.targetStage || '').toLowerCase() === 'town'
        || actions.some((a: any) => String(a?.action || '').toLowerCase() === 'travel' && String(st.targetStage || '').toLowerCase() === 'town');
    });
    if (hasExtraction) return null;

    const occupied = new Set(existing.map((it: any) => `${Number(it.x)},${Number(it.y)}`));
    const tile = this._findNearbyInteractionTile(grid, playerStart, occupied);
    if (!tile) return null;

    return {
      id: `runtime_extract_${floorName || 'stage'}`,
      kind: 'interactable',
      x: tile.x,
      y: tile.y,
      tags: ['run', 'extract', 'portal'],
      state: {
        label: 'Return Sigil',
        icon: '⟲',
        texture: 'deco_crystal',
        description: 'A stabilizing sigil that returns you safely to town.',
        needsAdjacency: true,
        targetStage: 'town',
        actions: [
          { label: 'Extract to Town', icon: '⟲', action: 'travel' },
          { label: 'Inspect Sigil', icon: '👁', action: 'inspect' },
        ],
      },
    };
  },

  _serializePlayerStats(): Dict {
    const p = PLAYER_STATS;
    return {
      name: p.name,
      class: p.class,
      level: Number(p.level || 1),
      xp: Number(p.xp || 0),
      str: Number(p.str || 10),
      dex: Number(p.dex || 10),
      con: Number(p.con || 10),
      int: Number(p.int || 10),
      wis: Number(p.wis || 10),
      cha: Number(p.cha || 10),
      ac: Number(p.ac || 10),
      baseAC: Number(p.baseAC || p.ac || 10),
      weaponId: p.weaponId || null,
      weaponName: (p as any).weaponName || null,
      damageFormula: p.damageFormula || '1d4',
      atkRange: Number(p.atkRange || 1),
      profBonus: Number(p.profBonus || 2),
      hitDie: Number(p.hitDie || 8),
      maxHP: Number(p.maxHP || 1),
      currentHP: Number(p.currentHP || p.maxHP || 1),
      savingThrows: Array.from(p.savingThrows || []),
      skillProficiencies: Array.from(p.skillProficiencies || []),
      expertiseSkills: Array.from(p.expertiseSkills || []),
      features: Array.isArray(p.features) ? [...p.features] : [],
      sneakAttackDice: Number(p.sneakAttackDice || 0),
      asiPending: Number(p.asiPending || 0),
      gold: Number(p.gold || 0),
      inventory: Array.isArray(p.inventory) ? p.inventory.map((i) => ({ ...i })) : [],
      stash: Array.isArray(p.stash) ? p.stash.map((i) => ({ ...i })) : [],
      equippedWeapon: p.equippedWeapon ? { ...p.equippedWeapon } : null,
      equippedArmor: p.equippedArmor ? { ...p.equippedArmor } : null,
      startTile: p.startTile ? { ...p.startTile } : null,
    };
  },

  _applyPlayerSnapshot(snapshot: any): void {
    if (!snapshot || typeof snapshot !== 'object') return;

    const direct = [
      'name', 'class', 'level', 'xp', 'str', 'dex', 'con', 'int', 'wis', 'cha',
      'ac', 'baseAC', 'weaponId', 'weaponName', 'damageFormula', 'atkRange',
      'profBonus', 'hitDie', 'maxHP', 'currentHP', 'sneakAttackDice', 'asiPending', 'gold',
    ];
    for (const k of direct) {
      if (snapshot[k] !== undefined) (PLAYER_STATS as Dict)[k] = snapshot[k];
    }

    if (Array.isArray(snapshot.features)) PLAYER_STATS.features = [...snapshot.features];
    if (Array.isArray(snapshot.inventory)) PLAYER_STATS.inventory = snapshot.inventory.map((i: Dict) => ({ ...i }));
    if (Array.isArray(snapshot.stash)) PLAYER_STATS.stash = snapshot.stash.map((i: Dict) => ({ ...i }));
    PLAYER_STATS.equippedWeapon = snapshot.equippedWeapon ? { ...snapshot.equippedWeapon } : null;
    PLAYER_STATS.equippedArmor = snapshot.equippedArmor ? { ...snapshot.equippedArmor } : null;
    if (snapshot.startTile && typeof snapshot.startTile === 'object') PLAYER_STATS.startTile = { ...snapshot.startTile };

    PLAYER_STATS.savingThrows = new Set(Array.isArray(snapshot.savingThrows) ? snapshot.savingThrows : Array.from(PLAYER_STATS.savingThrows || []));
    PLAYER_STATS.skillProficiencies = new Set(Array.isArray(snapshot.skillProficiencies) ? snapshot.skillProficiencies : Array.from(PLAYER_STATS.skillProficiencies || []));
    PLAYER_STATS.expertiseSkills = new Set(Array.isArray(snapshot.expertiseSkills) ? snapshot.expertiseSkills : Array.from(PLAYER_STATS.expertiseSkills || []));
  },

  _readPersistedState(): any {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(this._saveKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  },

  _applyPersistedState(snapshot: any): void {
    if (!snapshot || typeof snapshot !== 'object') return;

    if (snapshot.player) this._applyPlayerSnapshot(snapshot.player);
    const flags = getFlags();
    if (snapshot.flags && typeof flags?.load === 'function') {
      flags.load(snapshot.flags);
    }
    if (snapshot.runState && typeof snapshot.runState === 'object') {
      this._runState = this._clonePlain(snapshot.runState);
    }
    if (snapshot.generatedMapSeeds && typeof snapshot.generatedMapSeeds === 'object') {
      this._generatedMapSeeds = this._clonePlain(snapshot.generatedMapSeeds);
    }
  },

  _persistSeedImmediately(stageId: string, seed: number): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this._saveKey);
      const snapshot = (raw ? JSON.parse(raw) : null) || { version: 1, savedAt: Date.now() };
      if (!snapshot.generatedMapSeeds || typeof snapshot.generatedMapSeeds !== 'object') {
        snapshot.generatedMapSeeds = {};
      }
      snapshot.generatedMapSeeds[stageId] = Number(seed);
      localStorage.setItem(this._saveKey, JSON.stringify(snapshot));
    } catch { /* no-op */ }
  },

  _persistStartTileImmediately(tile: { x: number; y: number } | null | undefined): void {
    try {
      if (typeof localStorage === 'undefined') return;
      if (!tile || !Number.isFinite(tile.x) || !Number.isFinite(tile.y)) return;
      const raw = localStorage.getItem(this._saveKey);
      const snapshot = (raw ? JSON.parse(raw) : null) || { version: 1, savedAt: Date.now() };
      if (!snapshot.player || typeof snapshot.player !== 'object') snapshot.player = {};
      snapshot.player.startTile = { x: Number(tile.x), y: Number(tile.y) };
      localStorage.setItem(this._saveKey, JSON.stringify(snapshot));
    } catch { /* no-op */ }
  },

  persistGameState(scene: any): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      this.syncPlayerStateFromScene(scene);
      const flags = getFlags();
      const snapshot = {
        version: 1,
        savedAt: Date.now(),
        activeMap: this._activeMap || null,
        player: this._serializePlayerStats(),
        flags: (typeof flags?.serialize === 'function') ? flags.serialize() : {},
        runState: this._runState ? this._clonePlain(this._runState) : null,
        generatedMapSeeds: this._generatedMapSeeds ? this._clonePlain(this._generatedMapSeeds) : {},
      };
      localStorage.setItem(this._saveKey, JSON.stringify(snapshot));
      return true;
    } catch (err) {
      console.warn('[ModLoader] Failed to persist save state:', err);
      return false;
    }
  },

  installAutosaveHooks(scene: any): void {
    if (!scene) return;
    if (scene._autosaveTicker || !scene.time) return;

    scene._autosaveTicker = scene.time.addEvent({
      delay: 15000,
      loop: true,
      callback: () => this.persistGameState(scene),
    });

    if (!this._beforeUnloadHookInstalled && typeof window !== 'undefined') {
      this._beforeUnloadHookInstalled = true;
      window.addEventListener('beforeunload', () => {
        try {
          this.persistGameState(w()._scene || null);
        } catch { /* no-op */ }
      });
    }
  },

  resetPersistentGame(reload = true): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(this._saveKey);
    } catch { /* no-op */ }
    this._runState = null;
    this._generatedMapSeeds = {};
    const flags = getFlags();
    if (typeof flags?.reset === 'function') flags.reset();
    if (reload && typeof window !== 'undefined' && window.location) window.location.reload();
  },

  resolveRunOutcome(scene: any, outcome = 'extract'): void {
    const mode = String(outcome || 'extract').toLowerCase();
    this.syncPlayerStateFromScene(scene);

    const worlds = (this._modData?.worlds as any) || {};
    const world = this._getActiveWorldConfig();
    const cfg = world?.cfg || {};
    const rules = cfg.resolution || {};
    const extractRules = rules.extract || {};
    const deathRules = rules.death || {};
    const victoryRules = rules.victory || {};

    const runDepth = Number(this._runState?.depth || 0);
    const inv = Array.isArray(PLAYER_STATS.inventory) ? PLAYER_STATS.inventory : [];
    const stash = Array.isArray(PLAYER_STATS.stash) ? PLAYER_STATS.stash : [];
    let gold = Number(PLAYER_STATS.gold || 0);

    let summary = 'Run resolved.';
    let bankedItems = 0;
    let lostItems = 0;
    let lostGold = 0;

    if (mode === 'death') {
      lostItems = inv.length;
      const lossPct = Math.max(0, Math.min(100, Number(deathRules.goldLossPct ?? 30)));
      lostGold = Math.floor(gold * (lossPct / 100));
      gold = Math.max(0, gold - lostGold);

      PLAYER_STATS.inventory = [];
      PLAYER_STATS.gold = gold;
      summary = `Defeat: lost ${lostItems} carried item(s) and ${lostGold} gold.`;
    } else {
      const activeRules = mode === 'victory' ? victoryRules : extractRules;
      const bankCarried = activeRules.bankCarriedToStash !== false;
      if (bankCarried && inv.length) {
        bankedItems = inv.length;
        PLAYER_STATS.stash = stash.concat(inv.map((i) => ({ ...i })));
        PLAYER_STATS.inventory = [];
      }
      if (mode === 'victory') {
        const rewardGold = Math.max(0, Number(victoryRules.rewardGold ?? 0));
        if (rewardGold > 0) {
          gold += rewardGold;
          PLAYER_STATS.gold = gold;
        }
        summary = rewardGold > 0
          ? `Victory: cleared ${cfg.name || world?.id || 'the boss floor'} and earned ${rewardGold} gold.`
          : `Victory: cleared ${cfg.name || world?.id || 'the boss floor'}.`;
      } else {
        summary = bankCarried
          ? `Extraction complete: banked ${inv.length} carried item(s) to stash.`
          : 'Extraction complete.';
      }
    }

    const healOnExtract = extractRules.healToFullInTown !== false;
    const healOnDeath = deathRules.healToFullInTown !== false;
    const healOnVictory = victoryRules.healToFullInTown !== false;
    if ((mode === 'death' && healOnDeath) || (mode === 'extract' && healOnExtract) || (mode === 'victory' && healOnVictory)) {
      PLAYER_STATS.currentHP = Number(PLAYER_STATS.maxHP || PLAYER_STATS.currentHP || 1);
    }

    if (this._runState) {
      const townStage = worlds.townStage || worlds.town?.stage || 'town_hub';
      this._runState = {
        runId: null,
        seed: null,
        worldId: null,
        depth: 0,
        acceptedQuests: [],
        carried: { items: [] },
        runGold: Number(PLAYER_STATS.gold || 0),
        currentStage: townStage,
        history: [townStage],
        plannedStages: [],
        lastOutcome: mode,
        lastSummary: summary,
      };
    }

    this._lastRunSummary = {
      outcome: mode,
      summary,
      depth: runDepth,
      bankedItems,
      lostItems,
      lostGold,
      rewardGold: Math.max(0, Number(mode === 'victory' ? (victoryRules.rewardGold ?? 0) : 0)),
    };

    this.persistGameState(scene);

    if (scene?.showStatus) scene.showStatus(summary);
    const town = this._resolveTownStage();
    if (town && scene) this.transitionToStage(town, scene);
  },

  consumeLastRunSummary(): Dict | null {
    const s = this._lastRunSummary;
    this._lastRunSummary = null;
    return s;
  },

  startRun(worldId: string, scene: any, opts: any = {}): void {
    const worldRoot = this._modData?.worlds as any;
    if (!worldRoot) {
      console.warn('[ModLoader] startRun called but no worlds config is loaded.');
      return;
    }

    const worldsMap = worldRoot.worlds && typeof worldRoot.worlds === 'object'
      ? worldRoot.worlds
      : worldRoot;
    const cfg = worldsMap?.[worldId];
    if (!cfg || typeof cfg !== 'object') {
      console.warn(`[ModLoader] startRun unknown worldId: ${worldId}`);
      return;
    }

    const townStage = worldRoot.townStage || worldRoot.town?.stage || null;
    const seq = Array.isArray(cfg.stageSequence) ? cfg.stageSequence : [];

    let target = opts.targetStage || cfg.entryStage || null;
    if (!target) {
      target = seq.find((s: string) => s && s !== townStage) || seq[0] || cfg.fallbackNextStage || null;
    }

    if (!target) {
      console.warn(`[ModLoader] startRun for world ${worldId} has no target stage.`);
      return;
    }

    if (!this._runState) this._initRunState(this._activeMap);
    const state = this._runState!;
    const runSeed = Number(opts.seed);
    const carried = this._captureCarriedState();
    state.worldId = worldId;
    state.runId = this._newRunId();
    state.seed = Number.isFinite(runSeed) && runSeed > 0 ? runSeed : Date.now();
    state.acceptedQuests = Array.isArray(opts.acceptedQuests) ? [...opts.acceptedQuests] : [];
    state.carried = { items: carried.items };
    state.runGold = carried.gold;
    state.history = [this._activeMap].filter(Boolean) as string[];
    state.plannedStages = [...seq];
    state.depth = this._getRunDepth();

    this.transitionToStage(target, scene);
  },

  resolveNextStage(nextStageToken: string | null | undefined, scene: any): string | null {
    if (!nextStageToken) return null;
    const raw = String(nextStageToken).trim();
    if (!raw) return null;

    const token = raw.toLowerCase();
    if (token === 'auto') return this._resolveAutoNextStage(scene);
    if (token === 'boss') return this._resolveBossStage();
    if (token === 'town') return this._resolveTownStage();
    return raw;
  },

  _stableHashString(input: string): number {
    const text = String(input || '');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  },

  _resolveStageDescriptor(descriptor: any, context: any = {}): string | null {
    if (!descriptor) return null;

    if (typeof descriptor === 'string') {
      const raw = descriptor.trim();
      if (!raw) return null;
      const token = raw.toLowerCase();
      if (token === 'town') return this._resolveTownStage();
      if (token === 'boss') return this._resolveBossStage();
      if (token === 'auto') return null;
      return raw;
    }

    if (typeof descriptor !== 'object') return null;

    const directStage = descriptor.stageId || descriptor.stage || descriptor.id || descriptor.targetStage || null;
    if (directStage) return this._resolveStageDescriptor(directStage, context);

    if (descriptor.token) return this._resolveStageDescriptor(String(descriptor.token), context);

    const seq: string[] = Array.isArray(context.stageSequence) ? context.stageSequence : [];
    const currentIndex = seq.indexOf(this._activeMap || '');

    if (Number.isFinite(Number(descriptor.stageIndex)) && seq.length) {
      const idx = Number(descriptor.stageIndex);
      if (idx >= 0 && idx < seq.length) return seq[idx];
    }

    if (Number.isFinite(Number(descriptor.stageOffset)) && seq.length && currentIndex >= 0) {
      const idx = currentIndex + Number(descriptor.stageOffset);
      if (idx >= 0 && idx < seq.length) return seq[idx];
    }

    return null;
  },

  _pickDeterministicStage(candidates: { stage: string; weight?: number }[], world: any, nextDepth: number): string | null {
    if (!Array.isArray(candidates) || !candidates.length) return null;

    const worldId = world?.id || this._runState?.worldId || 'world';
    const runId = this._runState?.runId || 'run';
    const runSeed = Number(this._runState?.seed);
    const seed = Number.isFinite(runSeed) && runSeed > 0 ? runSeed : 1;
    const base = `${worldId}|${runId}|${seed}|${this._activeMap || ''}|${Number(nextDepth || 0)}`;
    const hash = this._stableHashString(base);

    const weighted = candidates
      .map((c) => ({ stage: c.stage, weight: Math.max(1, Number(c.weight || 1)) }))
      .filter((c) => c.stage);

    if (!weighted.length) return null;

    const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);
    const bucket = hash % totalWeight;
    let cursor = 0;

    for (const c of weighted) {
      cursor += c.weight;
      if (bucket < cursor) return c.stage;
    }
    return weighted[weighted.length - 1].stage;
  },

  _resolveAutoNextStage(_scene: any): string | null {
    const world = this._getActiveWorldConfig();

    const depth = this._getRunDepth();
    const seq: string[] = Array.isArray(world?.cfg?.stageSequence) ? world!.cfg.stageSequence : [];
    const bands: any[] | null = Array.isArray(world?.cfg?.depthBands) ? world!.cfg.depthBands : null;
    if (bands && bands.length) {
      const nextDepth = Math.max(1, depth + 1);
      const band = bands.find((b: any) => {
        const from = Number(b.from ?? b.depth ?? 1);
        const to = Number(b.to ?? b.depth ?? from);
        return nextDepth >= from && nextDepth <= to;
      });
      if (band) {
        const stages: any[] = Array.isArray(band.stages) ? band.stages : [];
        const candidates = stages
          .map((entry: any) => {
            const stage = this._resolveStageDescriptor(entry, { nextDepth, stageSequence: seq });
            if (!stage || stage === this._activeMap) return null;
            const weight = (entry && typeof entry === 'object') ? Number(entry.weight || 1) : 1;
            return { stage, weight };
          })
          .filter((c): c is { stage: string; weight: number } => !!c);
        if (candidates.length) return this._pickDeterministicStage(candidates, world, nextDepth);
      }
    }

    if (seq && seq.length) {
      const idx = seq.indexOf(this._activeMap || '');
      if (idx >= 0 && idx < seq.length - 1) return seq[idx + 1];
      if (idx < 0 && seq[0]) return seq[0];
    }

    if (this._runState && Array.isArray(this._runState.plannedStages)) {
      const p = this._runState.plannedStages;
      const idx = p.indexOf(this._activeMap || '');
      if (idx >= 0 && idx < p.length - 1) return p[idx + 1];
    }

    const fallback = world?.cfg?.fallbackNextStage || null;
    if (fallback) return fallback;

    console.warn('[ModLoader] nextStage:auto requested but no run/world progression rule resolved a target stage.');
    return null;
  },

  _getRunDepth(): number {
    const state = this._runState;
    if (!state) return 0;
    const worldRoot = (this._modData?.worlds as any) || {};
    const townStage = worldRoot.townStage || worldRoot.town?.stage || null;
    const history = Array.isArray(state.history) ? state.history : [];
    const runStages = townStage ? history.filter((s) => s !== townStage) : history;
    return runStages.length;
  },

  _resolveBossStage(): string | null {
    const world = this._getActiveWorldConfig();
    const bossStage = world?.cfg?.bossStage || world?.cfg?.boss?.stage || null;
    if (bossStage) return bossStage;
    console.warn('[ModLoader] nextStage:boss requested but no bossStage is configured for active world.');
    return null;
  },

  shouldResolveBossVictory(scene: any, reason = 'victory'): boolean {
    if (String(reason || '').toLowerCase() !== 'victory') return false;
    if (!scene || !this._runState?.worldId) return false;
    const bossStage = this._resolveBossStage();
    if (!bossStage || this._activeMap !== bossStage) return false;
    return Array.isArray(scene.enemies) ? !scene.enemies.some((e: any) => e.alive) : false;
  },

  _resolveTownStage(): string | null {
    const worlds = this._modData?.worlds as any;
    const townStage = worlds?.townStage || worlds?.town?.stage || null;
    if (townStage) return townStage;
    if (this._stageRegistry?.town_hub) return 'town_hub';
    console.warn('[ModLoader] nextStage:town requested but no town stage is configured.');
    return null;
  },

  _getActiveWorldConfig(): { id: string; cfg: any } | null {
    const worldsRoot = this._modData?.worlds as any;
    if (!worldsRoot || typeof worldsRoot !== 'object') return null;

    if (worldsRoot.worlds && typeof worldsRoot.worlds === 'object') {
      const worldId = this._runState?.worldId || worldsRoot.defaultWorld || Object.keys(worldsRoot.worlds)[0];
      if (!worldId || !worldsRoot.worlds[worldId]) return null;
      return { id: worldId, cfg: worldsRoot.worlds[worldId] };
    }

    const worldId = this._runState?.worldId || worldsRoot.defaultWorld || Object.keys(worldsRoot).find((k) => k !== 'defaultWorld');
    if (!worldId || !worldsRoot[worldId] || typeof worldsRoot[worldId] !== 'object') return null;
    return { id: worldId, cfg: worldsRoot[worldId] };
  },

  _initRunState(activeMap: string | null): void {
    const world = this._getActiveWorldConfig();
    const carried = this._captureCarriedState();
    this._runState = {
      runId: null,
      seed: null,
      worldId: world?.id || null,
      depth: 0,
      acceptedQuests: [],
      carried: { items: carried.items },
      runGold: carried.gold,
      currentStage: activeMap || null,
      history: activeMap ? [activeMap] : [],
      plannedStages: Array.isArray(world?.cfg?.stageSequence) ? [...world!.cfg.stageSequence] : [],
    };
    this._runState.depth = this._getRunDepth();
  },

  _updateRunStateOnTransition(stageId: string): void {
    if (!this._runState) this._initRunState(stageId);
    const state = this._runState!;
    if (state.currentStage !== stageId) {
      state.currentStage = stageId;
      if (!Array.isArray(state.history)) state.history = [];
      state.history.push(stageId);
      state.depth = this._getRunDepth();
      const carried = this._captureCarriedState();
      state.carried = { items: carried.items };
      state.runGold = carried.gold;
    }
  },

  async init(): Promise<void> {
    const persisted = this._readPersistedState();
    if (persisted?.generatedMapSeeds && typeof persisted.generatedMapSeeds === 'object') {
      this._generatedMapSeeds = this._clonePlain(persisted.generatedMapSeeds);
    }

    const settings = (await this.loadYaml('data/modsettings.yaml')) as any;
    const modList: string[] = ['00_core', ...(settings.mods || []).filter((m: string) => m !== '00_core')];

    const modData: ModData = {
      rules: {}, classes: {}, weapons: {}, creatures: {}, maps: {},
      abilities: {}, statuses: {}, statusRules: {}, lootTables: {}, items: {},
    };

    this._stageRegistry = {};
    let activeMap: string | null = settings.activeMap || null;

    for (const modId of modList) {
      const meta = (await this.loadYaml(`data/${modId}/meta.yaml`)) as any;
      if (meta.enabled === false && modId !== '00_core') continue;

      for (const file of (meta.includes || [])) {
        const data = (await this.loadYaml(`data/${modId}/${file}`)) as any;
        for (const [key, val] of Object.entries(data)) {
          const target = (modData as Dict)[key];
          if (val && typeof val === 'object' && !Array.isArray(val) && target && typeof target === 'object') {
            Object.assign(target as Dict, val);
          } else {
            (modData as Dict)[key] = val;
          }
        }
      }

      const flags = getFlags();
      if (meta.flags && typeof flags?.registerMod === 'function') flags.registerMod(modId, meta.flags);
      if (meta.flag_overrides && typeof flags?.applyOverrides === 'function') flags.applyOverrides(meta.flag_overrides);

      try {
        const lt = (await this.loadYaml(`data/${modId}/loot-tables.yaml`)) as any;
        if (lt && typeof lt === 'object') Object.assign(modData.lootTables, lt);
      } catch { /* no loot-tables.yaml — ok */ }

      try {
        const it = (await this.loadYaml(`data/${modId}/items.yaml`)) as any;
        if (it?.items && typeof it.items === 'object') Object.assign(modData.items, it.items);
      } catch { /* no items.yaml — ok */ }

      for (const stageId of (meta.stages || [])) {
        this._stageRegistry[stageId] = `data/${modId}/stages/${stageId}/stage.yaml`;
      }

      if (meta.startMap) activeMap = meta.startMap;

      console.log(`[ModLoader] Mod loaded: ${modId}${meta.startMap ? ` (startMap: ${meta.startMap})` : ''}`);
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const urlMap = params.get('map');
      const hasTestMode = params.has('test') || params.has('running') || params.has('queue') || params.has('autoplay');
      const ignoreSave = params.get('ignoreSave') === '1';
      const shouldForceUrlMap = !!urlMap && (ignoreSave || hasTestMode || !persisted?.activeMap);

      if (persisted?.activeMap && !shouldForceUrlMap) {
        activeMap = persisted.activeMap;
      } else if (urlMap) {
        if (urlMap.startsWith('ts_') && !this._stageRegistry[urlMap]) {
          this._stageRegistry[urlMap] = `data/00_core_test/stages/${urlMap}/stage.yaml`;
        }
        activeMap = urlMap;
        console.log(`[ModLoader] URL override: map=${urlMap}`);
      }
    } catch {
      if (persisted?.activeMap) activeMap = persisted.activeMap;
    }

    const playerFile = (await this.loadYaml('data/player.yaml')) as any;

    const stageData = activeMap ? await this.tryLoadStage(activeMap) : null;
    if (stageData && activeMap) {
      modData.maps[activeMap] = {
        name: stageData.name || activeMap,
        floor: stageData.floor || activeMap.toUpperCase(),
        grid: stageData.grid || null,
        generator: stageData.generator || null,
        playerStart: stageData.playerStart || (stageData.generator ? null : { x: 1, y: 1 }),
        encounters: stageData.encounters || [],
        lights: stageData.lights || [],
        globalLight: stageData.globalLight || 'dark',
        doors: stageData.doors || [],
        interactables: stageData.interactables || [],
        lootTables: stageData.lootTables || {},
        stageSprites: stageData.stageSprites || stageData.sprites || [],
        tileAnimations: stageData.tileAnimations || {},
        nextStage: stageData.nextStage || null,
      };
      console.log(`[ModLoader] Stage loaded: ${activeMap}`);

      const stageDir = this._stageRegistry?.[activeMap]
        ? this._stageRegistry[activeMap].replace('/stage.yaml', '')
        : null;
      if (stageDir) {
        try {
          const evts = (await this.loadYaml(`${stageDir}/events.yaml`)) as any;
          modData._stageEvents = evts?.events || evts?.autoplay || [];
          modData._stageAutoplay = evts?.autoplay || [];
        } catch { modData._stageEvents = []; modData._stageAutoplay = []; }
        try {
          const dlgs = (await this.loadYaml(`${stageDir}/dialogs.yaml`)) as any;
          modData._stageDialogs = dlgs?.dialogs || {};
        } catch { modData._stageDialogs = {}; }
      }
    }

    this._modData = modData;
    this._activeMap = activeMap;

    this.applyRules(modData);
    this.applySprites(modData);
    this.applyClasses(modData);
    this.applyWeapons(modData);
    this.applyAbilities(modData);
    this.applyStatuses(modData);
    this.applyItems(modData);
    this.applyMap(modData, activeMap);
    this.applyCreatures(modData, activeMap);
    this.applyPlayer(playerFile.player, modData);

    if (persisted) this._applyPersistedState(persisted);
    if (!this._runState) this._initRunState(activeMap);
    this._normalizePlayerStartTile(activeMap);

    console.log('[ModLoader] Active map:', activeMap);
  },

  applyRules(data: any): void {
    if (data.tileTypes) {
      for (const [k, v] of Object.entries(data.tileTypes)) {
        (TILE as any)[k] = v;
      }
    }
    if (data.tileSymbols) {
      this._tileSymbolMap = { ...data.tileSymbols };
    }
    if (data.xpThresholds) {
      DND_XP.length = 0;
      DND_XP.push(...data.xpThresholds);
    }
    if (data.asiLevels) {
      ASI_LEVELS.clear();
      (data.asiLevels as number[]).forEach((l) => ASI_LEVELS.add(l));
    }
    if (data.skills) {
      for (const [k, v] of Object.entries(data.skills)) {
        SKILLS[k] = v as any;
      }
    }
    if (data.combat) {
      for (const [k, v] of Object.entries(data.combat)) {
        (COMBAT_RULES as Dict)[k] = v;
      }
    }
    if (data.fog) {
      for (const [k, v] of Object.entries(data.fog)) {
        (FOG_RULES as Dict)[k] = v;
      }
    }
    if (data.light) {
      for (const [k, v] of Object.entries(data.light)) {
        (LIGHT_RULES as Dict)[k] = v;
      }
    }
    if (data.doors) {
      for (const [k, v] of Object.entries(data.doors)) {
        (DOOR_RULES as Dict)[k] = v;
      }
    }
    if (data.sprites && typeof data.sprites === 'object') {
      const win = w();
      win._SPRITE_CFG = { ...(win._SPRITE_CFG || {}), ...data.sprites };
    }
    if (data.tileset && typeof data.tileset === 'object') {
      const win = w();
      win._TILESET_CFG = {
        ...(win._TILESET_CFG || {}),
        ...data.tileset,
        sources: {
          ...((win._TILESET_CFG && win._TILESET_CFG.sources) || {}),
          ...(data.tileset.sources || {}),
        },
      };
    }
    if (data.display && data.display.tileSize) {
      w().S = data.display.tileSize;
    }
  },

  applySprites(data: any): void {
    if (!data.spriteManifest) return;
    const m = data.spriteManifest;
    const win = w();
    win.SPRITE_MANIFEST = win.SPRITE_MANIFEST || { atlases: [], tiles: {}, characters: {} };
    if (m.atlases) win.SPRITE_MANIFEST.atlases.push(...m.atlases);
    if (m.tiles) Object.assign(win.SPRITE_MANIFEST.tiles, m.tiles);
    if (m.characters) Object.assign(win.SPRITE_MANIFEST.characters, m.characters);
  },

  applyClasses(data: any): void {
    if (!data.classes) return;
    for (const [id, cls] of Object.entries<any>(data.classes)) {
      const features: Record<number, unknown> = {};
      if (cls.features) {
        for (const [lvl, feats] of Object.entries(cls.features)) {
          features[parseInt(lvl, 10)] = feats;
        }
      }
      CLASSES_DATA[id] = { ...cls, features };
    }
  },

  applyWeapons(data: any): void {
    if (!data.weapons) return;
    for (const [id, weapon] of Object.entries<any>(data.weapons)) {
      WEAPON_DEFS[id] = { ...weapon };
    }
  },

  compileHookFunction(source: any, argNames: string[]): any {
    if (typeof source === 'function') return source;
    if (typeof source !== 'string') return null;

    const trimmed = source.trim();
    if (!trimmed) return null;

    try {
      if (trimmed.startsWith('function') || trimmed.startsWith('(') || trimmed.startsWith('async function')) {
        return Function(`return (${trimmed});`)();
      }
      return new Function(...argNames, trimmed);
    } catch (err) {
      console.warn('[ModLoader] Failed to compile hook function:', err, source);
      return null;
    }
  },

  normalizeHook(hook: any, abilityId: string, hookName: string): any {
    if (!hook || typeof hook !== 'object') return null;

    const normalized: any = { ...hook, abilityId, hookName };

    if (typeof normalized.condition === 'string') {
      const trimmed = normalized.condition.trim();
      if (trimmed.startsWith('function') || trimmed.startsWith('(') || trimmed.startsWith('async function')) {
        normalized.condition = this.compileHookFunction(trimmed, ['context', 'scene', 'ability', 'hook']);
      }
    }

    if (typeof normalized.fn === 'string') {
      normalized.fn = this.compileHookFunction(normalized.fn, ['context', 'scene', 'ability', 'hook']);
    }

    if (Array.isArray(normalized.effects)) {
      normalized.effects = normalized.effects.map((effect: any) => {
        if (typeof effect === 'string') {
          return this.compileHookFunction(effect, ['context', 'scene', 'ability', 'hook']);
        }
        if (!effect || typeof effect !== 'object') return effect;
        const nextEffect: any = { ...effect };
        if (typeof nextEffect.fn === 'string') {
          nextEffect.fn = this.compileHookFunction(nextEffect.fn, ['context', 'scene', 'ability', 'hook', 'effect']);
        }
        if (typeof nextEffect.condition === 'string') {
          const trimmed = nextEffect.condition.trim();
          if (trimmed.startsWith('function') || trimmed.startsWith('(') || trimmed.startsWith('async function')) {
            nextEffect.condition = this.compileHookFunction(trimmed, ['context', 'scene', 'ability', 'hook', 'effect']);
          }
        }
        return nextEffect;
      });
    }

    return normalized;
  },

  applyAbilities(data: any): void {
    if (!data.abilities) return;
    const win = w();
    win.ABILITY_HOOKS = {};
    for (const [id, ability] of Object.entries<any>(data.abilities)) {
      const nextAbility = { ...ability };
      ABILITY_DEFS[id] = nextAbility;

      if (!ability.hooks || typeof ability.hooks !== 'object') continue;
      for (const [hookName, hookConfig] of Object.entries<any>(ability.hooks)) {
        const normalized = this.normalizeHook(hookConfig, id, hookName);
        if (!normalized) continue;
        if (!win.ABILITY_HOOKS![hookName]) win.ABILITY_HOOKS![hookName] = [];
        win.ABILITY_HOOKS![hookName].push(normalized);
      }
    }
  },

  applyStatuses(data: any): void {
    if (data.statusRules && typeof data.statusRules === 'object') {
      for (const [k, v] of Object.entries(data.statusRules)) {
        (STATUS_RULES as Dict)[k] = v;
      }
    }
    if (!data.statuses) return;
    for (const [id, status] of Object.entries<any>(data.statuses)) {
      STATUS_DEFS[id] = { ...status };
    }
  },

  applyItems(data: any): void {
    if (!data.items) return;
    for (const [id, item] of Object.entries<any>(data.items)) {
      ITEM_DEFS[id] = { id, ...item };
    }
  },

  applyMap(data: any, activeMap: string | null): void {
    if (!activeMap) return;
    if (!data.maps || !data.maps[activeMap]) return;
    const mapDef = data.maps[activeMap];

    let convertedGrid: Tile[][];
    let playerStart: { x: number; y: number };
    let stairsPos: { x: number; y: number } | null;

    let generatedLights: Dict[] = [];
    let generatedSprites: Dict[] = [];
    if (mapDef.generator) {
      const generatorCfg = { ...mapDef.generator };
      const persistedSeed = Number(this._generatedMapSeeds?.[activeMap]);
      if (Number.isFinite(persistedSeed) && persistedSeed > 0) {
        generatorCfg.seed = persistedSeed;
      }
      const result = MapGen.generate(generatorCfg, TILE as any);
      convertedGrid = result.grid;
      playerStart = mapDef.playerStart || result.playerStart;
      stairsPos = result.stairsPos;
      generatedLights = (result.lights || []) as unknown as Dict[];
      generatedSprites = (result.stageSprites || []) as unknown as Dict[];
      if (!this._generatedMapSeeds || typeof this._generatedMapSeeds !== 'object') this._generatedMapSeeds = {};
      this._generatedMapSeeds[activeMap] = Number(result.seed);
      this._persistSeedImmediately(activeMap, result.seed);
      console.log(`[ModLoader] Generated map (${mapDef.generator.type || 'cave'}) seed=${result.seed} size=${convertedGrid[0].length}x${convertedGrid.length} stairs=(${stairsPos?.x},${stairsPos?.y}) torches=${generatedLights.length}`);
    } else {
      convertedGrid = this.convertGridSymbols(mapDef.grid);
      playerStart = mapDef.playerStart;
      stairsPos = null;
      for (let y = 0; y < convertedGrid.length; y++) {
        for (let x = 0; x < convertedGrid[y].length; x++) {
          if (convertedGrid[y][x] === TILE.STAIRS) {
            stairsPos = { x, y };
            break;
          }
        }
        if (stairsPos) break;
      }
    }

    MAP.length = 0;
    convertedGrid.forEach((row) => MAP.push(row));
    mapState.rows = MAP.length;
    mapState.cols = MAP[0].length;
    const win = w();
    win._ROWS = mapState.rows;
    win._COLS = mapState.cols;

    const floorName = String(mapDef.floor || '').toUpperCase();
    const fallbackGlobalLight = floorName === 'TOWN' ? 'bright' : 'dark';
    const baseInteractables: Dict[] = Array.isArray(mapDef.interactables) ? [...mapDef.interactables] : [];
    const runtimeExtract = this._buildRuntimeExtractionInteractable(mapDef.floor, playerStart, convertedGrid, baseInteractables);
    const finalInteractables = runtimeExtract ? [...baseInteractables, runtimeExtract] : baseInteractables;

    win._MAP_META = {
      name: mapDef.name,
      floor: mapDef.floor,
      playerStart,
      stairsPos,
      lights: [...(mapDef.lights || []), ...generatedLights],
      globalLight: mapDef.globalLight || fallbackGlobalLight,
      doors: mapDef.doors || [],
      interactables: finalInteractables,
      lootTables: { ...(data.lootTables || {}), ...(mapDef.lootTables || {}) },
      stageSprites: [...(mapDef.stageSprites || mapDef.sprites || []), ...generatedSprites],
      tileAnimations: mapDef.tileAnimations || {},
      nextStage: mapDef.nextStage || null,
    };
  },

  applyCreatures(data: any, activeMap: string | null): void {
    if (!activeMap) return;
    if (!data.maps || !data.maps[activeMap] || !data.creatures) return;
    const mapDef = data.maps[activeMap];
    const isGenerated = !!mapDef.generator;
    ENEMY_DEFS.length = 0;
    for (const enc of (mapDef.encounters || [])) {
      const tmpl = data.creatures[enc.creature];
      if (!tmpl) continue;
      const weaponId: string | null = tmpl.attack?.weaponId || null;
      const weapon = weaponId ? data.weapons?.[weaponId] : null;
      const damageFormula = dnd.damageSpecToString(weapon?.damageDice || tmpl.attack?.dice || '1d4');
      const atkRange = weapon?.range || tmpl.attack?.range || 1;
      const count = isGenerated ? Number(enc.count || 1) : 1;
      for (let i = 0; i < count; i++) {
        ENEMY_DEFS.push({
          tx: isGenerated ? -1 : enc.x,
          ty: isGenerated ? -1 : enc.y,
          type: tmpl.type,
          name: enc.name || tmpl.name || null,
          hp: tmpl.hp, maxHp: tmpl.hp,
          sight: tmpl.sight, spd: tmpl.speed, icon: tmpl.icon,
          facing: enc.facing ?? 0, fov: tmpl.fov, group: enc.group,
          stats: { ...tmpl.stats },
          ac: tmpl.ac, weaponId: weaponId || '', damageFormula, atkRange,
          xp: tmpl.xp, cr: tmpl.cr,
          lootTable: enc.lootTable || tmpl.lootTable || null,
          loot: enc.loot || tmpl.loot || [],
          gold: Number(enc.gold ?? tmpl.gold ?? 0),
          ai: { ...(tmpl.ai || {}), ...(enc.ai || {}) },
          effects: [...(tmpl.effects || tmpl.statuses || []), ...(enc.effects || enc.statuses || [])],
          skillProficiencies: new Set(tmpl.skillProficiencies || []),
          level: tmpl.level || 1,
        });
      }
    }
  },

  applyPlayer(p: any, data: any): void {
    if (!p) return;
    const cls = data.classes?.[p.class];
    PLAYER_STATS.name = p.name;
    PLAYER_STATS.class = cls?.name || p.class;
    PLAYER_STATS.level = p.level;
    PLAYER_STATS.xp = p.xp;

    for (const ab of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
      PLAYER_STATS[ab] = p.abilities[ab];
    }

    PLAYER_STATS.ac = p.equipment.ac;
    PLAYER_STATS.baseAC = p.equipment.ac;

    const weaponId = p.equipment.weaponId || null;
    const weaponFromId = weaponId ? data.weapons?.[weaponId] : null;
    const legacyWeapon = p.equipment.weapon || null;
    const weapon = weaponFromId || legacyWeapon;

    PLAYER_STATS.weaponId = weaponId || PLAYER_STATS.weaponId;
    (PLAYER_STATS as Dict).weaponName = weapon?.name || 'Unarmed';
    PLAYER_STATS.damageFormula = dnd.damageSpecToString(weapon?.damageDice || weapon?.dice || PLAYER_STATS.damageFormula || '1d4');
    PLAYER_STATS.atkRange = weapon?.range || PLAYER_STATS.atkRange;

    if (cls) {
      PLAYER_STATS.hitDie = cls.hitDie;
      PLAYER_STATS.savingThrows = new Set(cls.savingThrows);
      PLAYER_STATS.features = [];
      for (let l = 1; l <= p.level; l++) {
        const feats = cls.features?.[l];
        if (feats) PLAYER_STATS.features.push(...feats);
      }
    }

    PLAYER_STATS.skillProficiencies = new Set(p.skillProficiencies || []);

    PLAYER_STATS.profBonus = dnd.profBonus(p.level);
    PLAYER_STATS.maxHP = cls ? cls.hitDie + dnd.mod(p.abilities.con) : 12;

    if (Array.isArray(p.startingInventory)) {
      PLAYER_STATS.inventory = p.startingInventory.map((item: Dict) => ({ ...item }));
    }
    if (Array.isArray(p.startingStash)) {
      PLAYER_STATS.stash = p.startingStash.map((item: Dict) => ({ ...item }));
    } else if (!Array.isArray(PLAYER_STATS.stash)) {
      PLAYER_STATS.stash = [];
    }
    if (typeof p.startingGold === 'number') {
      PLAYER_STATS.gold = p.startingGold;
    }

    const mapMeta = w()._MAP_META;
    if (mapMeta?.playerStart) {
      PLAYER_STATS.startTile = { ...mapMeta.playerStart };
    }
  },
};

if (typeof window !== 'undefined') {
  (window as unknown as { ModLoader: typeof ModLoader }).ModLoader = ModLoader;
}
