// ═══════════════════════════════════════════════════════
// modloader.js — Loads YAML mod data into game config
// Works fully client-side (no server dependency) for
// portability to iPad / Steam / Electron / Capacitor.
// Requires js-yaml loaded before this script.
// ═══════════════════════════════════════════════════════

const ModLoader = {
  _saveKey: 'myworld.save.v1',
  _lastRunSummary: null,

  /** Stored mod data from last load (available for test reuse) */
  _modData: null,

  /** Minimal runtime run-state scaffold for staged progression */
  _runState: null,

  /** Per-stage seed cache for procedural maps so refresh keeps identical layout */
  _generatedMapSeeds: {},

  _newRunId() {
    const ts = Date.now().toString(36);
    const rnd = Math.floor(Math.random() * 1e8).toString(36);
    return `run_${ts}_${rnd}`;
  },

  _captureCarriedState() {
    if (typeof PLAYER_STATS === 'undefined') return { items: [], gold: 0 };
    return {
      items: Array.isArray(PLAYER_STATS.inventory) ? PLAYER_STATS.inventory.map((i) => ({ ...i })) : [],
      gold: Number(PLAYER_STATS.gold || 0),
    };
  },
  
  /** Tile symbol → number mapping (built during applyRules) */
  _tileSymbolMap: {},

  /** Fetch and parse a YAML file. Returns parsed JS object. */
  async loadYaml(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const text = await res.text();
    return jsyaml.load(text);
  },

  /** Convert grid from symbols/strings to numeric grid using _tileSymbolMap */
  convertGridSymbols(grid) {
    if (!grid || grid.length === 0) return grid;
    
    // If grid contains numbers (already converted), return as-is
    if (typeof grid[0][0] === 'number') return grid;
    
    // Convert each row: may be array of symbols or a single string
    const converted = grid.map(row => {
      // If row is a string like "#..#D", convert each char to a tile
      if (typeof row === 'string') {
        return Array.from(row).map(char => 
          this._tileSymbolMap[char] ?? 0  // Default to FLOOR (0)
        );
      }
      
      // If row is an array of symbols/numbers, convert symbols to numbers
      return row.map(cell => {
        if (typeof cell === 'number') return cell;  // Already numeric
        return this._tileSymbolMap[String(cell)] ?? 0;  // Symbol to number
      });
    });

    // Ensure rectangular grid shape by padding short rows with WALL.
    const maxCols = converted.reduce((m, row) => Math.max(m, row.length), 0);
    const wall = this._tileSymbolMap['#'] ?? 1;
    const normalized = converted.map((row, idx) => {
      if (row.length === maxCols) return row;
      console.warn(`[ModLoader] Row ${idx + 1} has ${row.length} cols; padding to ${maxCols}.`);
      return row.concat(Array(maxCols - row.length).fill(wall));
    });

    return normalized;
  },

  /** Load stage data for the given stageId.
   * Checks the stage registry (built from mod metadata) first,
   * then falls back to data/00_core_test/stages/ for test stages.
   */
  async tryLoadStage(stageId) {
    if (!stageId) return null;

    // 1. Stage registry — populated during init() from each mod's meta.yaml stages list.
    if (this._stageRegistry?.[stageId]) {
      try {
        const stage = await this.loadYaml(this._stageRegistry[stageId]);
        if (stage && (stage.grid || stage.generator)) return stage;
      } catch (_err) { /* fall through */ }
    }

    // 2. Fallback — test mod stages.
    const legacyPaths = [`data/00_core_test/stages/${stageId}/stage.yaml`];
    for (const p of legacyPaths) {
      try {
        const stage = await this.loadYaml(p);
        if (stage && (stage.grid || stage.generator)) return stage;
      } catch (_err) { continue; }
    }

    return null;
  },

  /**
   * Runtime stage transition — load a new stage and restart the Phaser scene.
   * Called by the stairs handler in movement-system.js.
   */
  async transitionToStage(stageId, scene) {
    if (!stageId) return;
    console.log(`[ModLoader] Transitioning to stage: ${stageId}`);

    // Persist mutable player state before scene restart so runs keep inventory/HP progression.
    this.syncPlayerStateFromScene(scene);

    const stageData = await this.tryLoadStage(stageId);
    if (!stageData) {
      console.warn(`[ModLoader] Stage not found: ${stageId}`);
      return;
    }

    // Merge stage into modData under the new stageId
    const modData = this._modData;
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

    // Load co-located events/dialogs
    const stageDir = this._stageRegistry?.[stageId]?.replace('/stage.yaml', '');
    if (stageDir) {
      try { const evts = await this.loadYaml(`${stageDir}/events.yaml`); modData._stageEvents = evts?.events || []; } catch (_e) { modData._stageEvents = []; }
      try { const dlgs = await this.loadYaml(`${stageDir}/dialogs.yaml`); modData._stageDialogs = dlgs?.dialogs || {}; } catch (_e) { modData._stageDialogs = {}; }
    } else {
      modData._stageEvents = []; modData._stageDialogs = {};
    }

    this._activeMap = stageId;
    this._updateRunStateOnTransition(stageId);
    this.persistGameState(scene);
    this.applyMap(modData, stageId);
    this.applyCreatures(modData, stageId);
    // Update player start tile for the new stage and immediately persist it.
    // Do NOT call persistGameState(scene) again — scene.playerTile is still the old map's
    // tile, which would overwrite the correct new-stage spawn we just set here.
    if (window._MAP_META?.playerStart) {
      PLAYER_STATS.startTile = window._MAP_META.playerStart;
      this._persistStartTileImmediately(window._MAP_META.playerStart);
    }

    // Fade out → restart scene → fade in
    console.log(`[ModLoader] Stage ready: ${stageId}, MAP=${MAP.length}x${MAP[0]?.length}, playerStart=${JSON.stringify(PLAYER_STATS.startTile)}, nextStage=${window._MAP_META?.nextStage}`);
    scene.cameras.main.fadeOut(400, 0, 0, 0);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      console.log(`[ModLoader] Fade complete, restarting scene for ${stageId}`);
      scene.scene.restart();
    });
  },

  syncPlayerStateFromScene(scene) {
    if (!scene || !scene.pStats || typeof PLAYER_STATS === 'undefined') return;

    const p = scene.pStats;
    PLAYER_STATS.inventory = Array.isArray(p.inventory) ? p.inventory.map((i) => ({ ...i })) : [];
    PLAYER_STATS.stash = Array.isArray(p.stash) ? p.stash.map((i) => ({ ...i })) : [];
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

  _clonePlain(value) {
    return JSON.parse(JSON.stringify(value));
  },

  _findNearbyInteractionTile(grid, playerStart, occupied = new Set()) {
    if (!grid || !playerStart) return null;
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const sx = Number(playerStart.x || 0);
    const sy = Number(playerStart.y || 0);
    const inBounds = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
    const isWalkable = (x, y) => {
      const v = grid[y]?.[x];
      return v === TILE.FLOOR || v === TILE.GRASS || v === TILE.WATER;
    };

    for (let d = 1; d <= 4; d++) {
      const ring = [
        { x: sx + d, y: sy },
        { x: sx - d, y: sy },
        { x: sx, y: sy + d },
        { x: sx, y: sy - d },
        { x: sx + d, y: sy + d },
        { x: sx + d, y: sy - d },
        { x: sx - d, y: sy + d },
        { x: sx - d, y: sy - d },
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

  _isWalkableSpawnTile(grid, x, y) {
    if (!grid || !grid.length) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
    const v = grid[y]?.[x];
    return v === TILE.FLOOR || v === TILE.GRASS || v === TILE.WATER || v === TILE.STAIRS;
  },

  _findNearestWalkableTile(grid, fromTile) {
    if (!grid || !grid.length) return null;
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const sx = Number(fromTile?.x || 0);
    const sy = Number(fromTile?.y || 0);
    const key = (x, y) => `${x},${y}`;
    const q = [{ x: sx, y: sy }];
    const seen = new Set([key(sx, sy)]);
    const dirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
    ];

    while (q.length) {
      const cur = q.shift();
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

  _normalizePlayerStartTile(activeMap) {
    if (typeof PLAYER_STATS === 'undefined') return;
    if (!Array.isArray(MAP) || !MAP.length) return;

    const preferred = PLAYER_STATS.startTile || window._MAP_META?.playerStart || { x: 1, y: 1 };
    let resolved = null;

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
    if (window._MAP_META) window._MAP_META.playerStart = { ...resolved };

    if (preferred.x !== resolved.x || preferred.y !== resolved.y) {
      console.warn(`[ModLoader] Adjusted invalid spawn tile on ${activeMap || this._activeMap}: (${preferred.x},${preferred.y}) -> (${resolved.x},${resolved.y})`);
    }
  },

  _buildRuntimeExtractionInteractable(floorName, playerStart, grid, interactables) {
    if (String(floorName || '').toUpperCase() === 'TOWN') return null;

    const existing = Array.isArray(interactables) ? interactables : [];
    const hasExtraction = existing.some((it) => {
      const st = it?.state || {};
      const actions = Array.isArray(st.actions) ? st.actions : [];
      return String(st.targetStage || '').toLowerCase() === 'town'
        || actions.some((a) => String(a?.action || '').toLowerCase() === 'travel' && String(st.targetStage || '').toLowerCase() === 'town');
    });
    if (hasExtraction) return null;

    const occupied = new Set(existing.map((it) => `${Number(it.x)},${Number(it.y)}`));
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

  _serializePlayerStats() {
    const p = PLAYER_STATS || {};
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
      weaponName: p.weaponName || null,
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

  _applyPlayerSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || typeof PLAYER_STATS === 'undefined') return;

    const direct = [
      'name', 'class', 'level', 'xp', 'str', 'dex', 'con', 'int', 'wis', 'cha',
      'ac', 'baseAC', 'weaponId', 'weaponName', 'damageFormula', 'atkRange',
      'profBonus', 'hitDie', 'maxHP', 'currentHP', 'sneakAttackDice', 'asiPending', 'gold',
    ];
    for (const k of direct) {
      if (snapshot[k] !== undefined) PLAYER_STATS[k] = snapshot[k];
    }

    if (Array.isArray(snapshot.features)) PLAYER_STATS.features = [...snapshot.features];
    if (Array.isArray(snapshot.inventory)) PLAYER_STATS.inventory = snapshot.inventory.map((i) => ({ ...i }));
    if (Array.isArray(snapshot.stash)) PLAYER_STATS.stash = snapshot.stash.map((i) => ({ ...i }));
    PLAYER_STATS.equippedWeapon = snapshot.equippedWeapon ? { ...snapshot.equippedWeapon } : null;
    PLAYER_STATS.equippedArmor = snapshot.equippedArmor ? { ...snapshot.equippedArmor } : null;
    if (snapshot.startTile && typeof snapshot.startTile === 'object') PLAYER_STATS.startTile = { ...snapshot.startTile };

    PLAYER_STATS.savingThrows = new Set(Array.isArray(snapshot.savingThrows) ? snapshot.savingThrows : Array.from(PLAYER_STATS.savingThrows || []));
    PLAYER_STATS.skillProficiencies = new Set(Array.isArray(snapshot.skillProficiencies) ? snapshot.skillProficiencies : Array.from(PLAYER_STATS.skillProficiencies || []));
    PLAYER_STATS.expertiseSkills = new Set(Array.isArray(snapshot.expertiseSkills) ? snapshot.expertiseSkills : Array.from(PLAYER_STATS.expertiseSkills || []));
  },

  _readPersistedState() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(this._saveKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_err) {
      return null;
    }
  },

  _applyPersistedState(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;

    if (snapshot.player) this._applyPlayerSnapshot(snapshot.player);
    if (snapshot.flags && typeof Flags !== 'undefined' && typeof Flags.load === 'function') {
      Flags.load(snapshot.flags);
    }
    if (snapshot.runState && typeof snapshot.runState === 'object') {
      this._runState = this._clonePlain(snapshot.runState);
    }
    if (snapshot.generatedMapSeeds && typeof snapshot.generatedMapSeeds === 'object') {
      this._generatedMapSeeds = this._clonePlain(snapshot.generatedMapSeeds);
    }
  },

  // Immediately patch just the seed for one stage into localStorage without needing a scene.
  // Called right after map generation so a refresh never loses the seed.
  _persistSeedImmediately(stageId, seed) {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this._saveKey);
      const snapshot = (raw ? JSON.parse(raw) : null) || { version: 1, savedAt: Date.now() };
      if (!snapshot.generatedMapSeeds || typeof snapshot.generatedMapSeeds !== 'object') {
        snapshot.generatedMapSeeds = {};
      }
      snapshot.generatedMapSeeds[stageId] = Number(seed);
      localStorage.setItem(this._saveKey, JSON.stringify(snapshot));
    } catch (_err) {
      // no-op — localStorage unavailable in tests/SSR
    }
  },

  // Immediately patch the player startTile in localStorage without needing a scene.
  // Called after applyMap sets PLAYER_STATS.startTile so the correct cave spawn is saved
  // before scene.restart() reads PLAYER_STATS.startTile from the global.
  _persistStartTileImmediately(tile) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (!tile || !Number.isFinite(tile.x) || !Number.isFinite(tile.y)) return;
      const raw = localStorage.getItem(this._saveKey);
      const snapshot = (raw ? JSON.parse(raw) : null) || { version: 1, savedAt: Date.now() };
      if (!snapshot.player || typeof snapshot.player !== 'object') snapshot.player = {};
      snapshot.player.startTile = { x: Number(tile.x), y: Number(tile.y) };
      localStorage.setItem(this._saveKey, JSON.stringify(snapshot));
    } catch (_err) {
      // no-op — localStorage unavailable in tests/SSR
    }
  },

  persistGameState(scene) {
    try {
      if (typeof localStorage === 'undefined') return false;
      this.syncPlayerStateFromScene(scene);
      const snapshot = {
        version: 1,
        savedAt: Date.now(),
        activeMap: this._activeMap || null,
        player: this._serializePlayerStats(),
        flags: (typeof Flags !== 'undefined' && typeof Flags.serialize === 'function') ? Flags.serialize() : {},
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

  installAutosaveHooks(scene) {
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
          this.persistGameState(window._scene || null);
        } catch (_err) {
          // no-op
        }
      });
    }
  },

  resetPersistentGame(reload = true) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(this._saveKey);
    } catch (_err) {
      // no-op
    }
    this._runState = null;
    this._generatedMapSeeds = {};
    if (typeof Flags !== 'undefined' && typeof Flags.reset === 'function') Flags.reset();
    if (reload && typeof window !== 'undefined' && window.location) window.location.reload();
  },

  resolveRunOutcome(scene, outcome = 'extract') {
    const mode = String(outcome || 'extract').toLowerCase();
    this.syncPlayerStateFromScene(scene);

    const worlds = this._modData?.worlds || {};
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

  consumeLastRunSummary() {
    const s = this._lastRunSummary;
    this._lastRunSummary = null;
    return s;
  },

  /**
   * Start a world run from town/portal interaction.
   * Picks target stage from explicit targetStage or world stage sequence.
   */
  startRun(worldId, scene, opts = {}) {
    const worldRoot = this._modData?.worlds;
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
      target = seq.find((s) => s && s !== townStage) || seq[0] || cfg.fallbackNextStage || null;
    }

    if (!target) {
      console.warn(`[ModLoader] startRun for world ${worldId} has no target stage.`);
      return;
    }

    if (!this._runState) this._initRunState(this._activeMap);
    const runSeed = Number(opts.seed);
    const carried = this._captureCarriedState();
    this._runState.worldId = worldId;
    this._runState.runId = this._newRunId();
    this._runState.seed = Number.isFinite(runSeed) && runSeed > 0 ? runSeed : Date.now();
    this._runState.acceptedQuests = Array.isArray(opts.acceptedQuests) ? [...opts.acceptedQuests] : [];
    this._runState.carried = { items: carried.items };
    this._runState.runGold = carried.gold;
    this._runState.history = [this._activeMap].filter(Boolean);
    this._runState.plannedStages = [...seq];
    this._runState.depth = this._getRunDepth();

    this.transitionToStage(target, scene);
  },

  /**
   * Resolve next-stage tokens used in stage.yaml nextStage:
   * - fixed stage id: "gw_b3f"
   * - "auto": run planner chooses next stage
   * - "boss": resolve to active-world boss stage
   * - "town": resolve to configured town hub stage
   */
  resolveNextStage(nextStageToken, scene) {
    if (!nextStageToken) return null;
    const raw = String(nextStageToken).trim();
    if (!raw) return null;

    const token = raw.toLowerCase();
    if (token === 'auto') return this._resolveAutoNextStage(scene);
    if (token === 'boss') return this._resolveBossStage();
    if (token === 'town') return this._resolveTownStage();
    return raw;
  },

  _resolveAutoNextStage(_scene) {
    const world = this._getActiveWorldConfig();

    const depth = this._getRunDepth();
    const bands = Array.isArray(world?.cfg?.depthBands) ? world.cfg.depthBands : null;
    if (bands && bands.length) {
      const nextDepth = Math.max(1, depth + 1);
      const band = bands.find((b) => {
        const from = Number(b.from ?? b.depth ?? 1);
        const to = Number(b.to ?? b.depth ?? from);
        return nextDepth >= from && nextDepth <= to;
      });
      if (band) {
        const stages = Array.isArray(band.stages) ? band.stages : [];
        const candidates = stages.filter((s) => s && s !== this._activeMap);
        if (candidates.length) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          return pick;
        }
      }
    }

    const seq = Array.isArray(world?.cfg?.stageSequence) ? world.cfg.stageSequence : null;
    if (seq && seq.length) {
      const idx = seq.indexOf(this._activeMap);
      if (idx >= 0 && idx < seq.length - 1) return seq[idx + 1];
      if (idx < 0 && seq[0]) return seq[0];
    }

    if (this._runState && Array.isArray(this._runState.plannedStages)) {
      const p = this._runState.plannedStages;
      const idx = p.indexOf(this._activeMap);
      if (idx >= 0 && idx < p.length - 1) return p[idx + 1];
    }

    const fallback = world?.cfg?.fallbackNextStage || null;
    if (fallback) return fallback;

    console.warn('[ModLoader] nextStage:auto requested but no run/world progression rule resolved a target stage.');
    return null;
  },

  _getRunDepth() {
    const state = this._runState;
    if (!state) return 0;
    const worldRoot = this._modData?.worlds || {};
    const townStage = worldRoot.townStage || worldRoot.town?.stage || null;
    const history = Array.isArray(state.history) ? state.history : [];
    const runStages = townStage ? history.filter((s) => s !== townStage) : history;
    return runStages.length;
  },

  _resolveBossStage() {
    const world = this._getActiveWorldConfig();
    const bossStage = world?.cfg?.bossStage || world?.cfg?.boss?.stage || null;
    if (bossStage) return bossStage;
    console.warn('[ModLoader] nextStage:boss requested but no bossStage is configured for active world.');
    return null;
  },

  shouldResolveBossVictory(scene, reason = 'victory') {
    if (String(reason || '').toLowerCase() !== 'victory') return false;
    if (!scene || !this._runState?.worldId) return false;
    const bossStage = this._resolveBossStage();
    if (!bossStage || this._activeMap !== bossStage) return false;
    return Array.isArray(scene.enemies) ? !scene.enemies.some((e) => e.alive) : false;
  },

  _resolveTownStage() {
    const worlds = this._modData?.worlds;
    const townStage = worlds?.townStage || worlds?.town?.stage || null;
    if (townStage) return townStage;
    if (this._stageRegistry?.town_hub) return 'town_hub';
    console.warn('[ModLoader] nextStage:town requested but no town stage is configured.');
    return null;
  },

  _getActiveWorldConfig() {
    const worldsRoot = this._modData?.worlds;
    if (!worldsRoot || typeof worldsRoot !== 'object') return null;

    // Preferred shape: { defaultWorld, worlds: { <id>: { ... } } }
    if (worldsRoot.worlds && typeof worldsRoot.worlds === 'object') {
      const worldId = this._runState?.worldId || worldsRoot.defaultWorld || Object.keys(worldsRoot.worlds)[0];
      if (!worldId || !worldsRoot.worlds[worldId]) return null;
      return { id: worldId, cfg: worldsRoot.worlds[worldId] };
    }

    // Fallback shape: { <id>: { ... }, defaultWorld }
    const worldId = this._runState?.worldId || worldsRoot.defaultWorld || Object.keys(worldsRoot).find(k => k !== 'defaultWorld');
    if (!worldId || !worldsRoot[worldId] || typeof worldsRoot[worldId] !== 'object') return null;
    return { id: worldId, cfg: worldsRoot[worldId] };
  },

  _initRunState(activeMap) {
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
      plannedStages: Array.isArray(world?.cfg?.stageSequence) ? [...world.cfg.stageSequence] : [],
    };
    this._runState.depth = this._getRunDepth();
  },

  _updateRunStateOnTransition(stageId) {
    if (!this._runState) this._initRunState(stageId);
    const state = this._runState;
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

  /**
   * Load all mods defined in modsettings.yaml, then player.yaml.
   * Populates the global game constants (MAP, ENEMY_DEFS, PLAYER_STATS, etc.)
   */
  async init() {
    const persisted = this._readPersistedState();
    if (persisted?.generatedMapSeeds && typeof persisted.generatedMapSeeds === 'object') {
      this._generatedMapSeeds = this._clonePlain(persisted.generatedMapSeeds);
    }

    // 1. Load mod settings
    const settings = await this.loadYaml('data/modsettings.yaml');

    // 2. Build mod list — core always first, deduped.
    const modList = ['00_core', ...(settings.mods || []).filter(m => m !== '00_core')];

    const modData = { rules: {}, classes: {}, weapons: {}, creatures: {}, maps: {}, abilities: {}, statuses: {}, statusRules: {}, lootTables: {}, items: {} };

    this._stageRegistry = {};
    let activeMap = settings.activeMap || null; // legacy fallback

    // 3. Load each mod in order. Later mods override earlier ones.
    //    Each mod may declare: includes (files to merge), stages (stage IDs it owns), startMap.
    for (const modId of modList) {
      const meta = await this.loadYaml(`data/${modId}/meta.yaml`);
      if (meta.enabled === false && modId !== '00_core') continue;

      // Merge declared files into modData
      for (const file of (meta.includes || [])) {
        const data = await this.loadYaml(`data/${modId}/${file}`);
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === 'object' && !Array.isArray(val) && modData[key]) {
            Object.assign(modData[key], val);
          } else {
            modData[key] = val;
          }
        }
      }

      // Register flags from this mod
      if (meta.flags && typeof Flags !== 'undefined') {
        Flags.registerMod(modId, meta.flags);
      }
      if (meta.flag_overrides && typeof Flags !== 'undefined') {
        Flags.applyOverrides(meta.flag_overrides);
      }

      // Load loot-tables.yaml for this mod (flat table map, merged into modData.lootTables)
      try {
        const lt = await this.loadYaml(`data/${modId}/loot-tables.yaml`);
        if (lt && typeof lt === 'object') Object.assign(modData.lootTables, lt);
      } catch (_e) { /* no loot-tables.yaml — ok */ }

      // Load items.yaml for this mod (merged into modData.items)
      try {
        const it = await this.loadYaml(`data/${modId}/items.yaml`);
        if (it?.items && typeof it.items === 'object') Object.assign(modData.items, it.items);
      } catch (_e) { /* no items.yaml — ok */ }

      // Register this mod's stages — later mod wins on same ID.
      for (const stageId of (meta.stages || [])) {
        this._stageRegistry[stageId] = `data/${modId}/stages/${stageId}/stage.yaml`;
      }

      // Last mod declaring startMap sets the opening stage.
      if (meta.startMap) activeMap = meta.startMap;

      console.log(`[ModLoader] Mod loaded: ${modId}${meta.startMap ? ` (startMap: ${meta.startMap})` : ''}`);
    }

    // Map resolution order:
    // 1) persisted save (default for normal refresh)
    // 2) URL map override only when explicitly forced via ignoreSave=1
    //    or when test/autoplay params are present.
    try {
      const params = new URLSearchParams(window.location.search);
      const urlMap = params.get('map');
      const hasTestMode = params.has('test') || params.has('running') || params.has('queue') || params.has('autoplay');
      const ignoreSave = params.get('ignoreSave') === '1';
      const shouldForceUrlMap = !!urlMap && (ignoreSave || hasTestMode || !persisted?.activeMap);

      if (persisted?.activeMap && !shouldForceUrlMap) {
        activeMap = persisted.activeMap;
      } else if (urlMap) {
        // Auto-register test stages if the requested map starts with ts_
        if (urlMap.startsWith('ts_') && !this._stageRegistry[urlMap]) {
          this._stageRegistry[urlMap] = `data/00_core_test/stages/${urlMap}/stage.yaml`;
        }
        activeMap = urlMap;
        console.log(`[ModLoader] URL override: map=${urlMap}`);
      }
    } catch (_e) {
      if (persisted?.activeMap) activeMap = persisted.activeMap;
    }

    // 4. Load player
    const playerFile = await this.loadYaml('data/player.yaml');

    // 5. Load the active stage from the registry (or legacy fallback paths).
    const stageData = await this.tryLoadStage(activeMap);
    if (stageData) {
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

      // Load stage events.yaml and dialogs.yaml (co-located with stage.yaml)
      const stageDir = this._stageRegistry?.[activeMap]
        ? this._stageRegistry[activeMap].replace('/stage.yaml', '')
        : null;
      if (stageDir) {
        try {
          const evts = await this.loadYaml(`${stageDir}/events.yaml`);
          modData._stageEvents = evts?.events || evts?.autoplay || [];
          modData._stageAutoplay = evts?.autoplay || [];
        } catch (_e) { modData._stageEvents = []; modData._stageAutoplay = []; }
        try {
          const dlgs = await this.loadYaml(`${stageDir}/dialogs.yaml`);
          modData._stageDialogs = dlgs?.dialogs || {};
        } catch (_e) { modData._stageDialogs = {}; }
      }
    }

    // 6. Store for reuse (e.g. test runner map switching)
    this._modData = modData;
    this._activeMap = activeMap;

    // 7. Apply to game globals
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

  applyRules(data) {
    // Tile types
    if (data.tileTypes) {
      for (const [k, v] of Object.entries(data.tileTypes)) {
        TILE[k] = v;
      }
    }
    // Tile symbols (for human-readable map editing)
    if (data.tileSymbols) {
      this._tileSymbolMap = { ...data.tileSymbols };
    }
    // XP thresholds
    if (data.xpThresholds) {
      DND_XP.length = 0;
      DND_XP.push(...data.xpThresholds);
    }
    // ASI levels
    if (data.asiLevels) {
      ASI_LEVELS.clear();
      data.asiLevels.forEach(l => ASI_LEVELS.add(l));
    }
    // Skills
    if (data.skills) {
      for (const [k, v] of Object.entries(data.skills)) {
        SKILLS[k] = v;
      }
    }
    // Combat tuning
    if (data.combat) {
      for (const [k, v] of Object.entries(data.combat)) {
        COMBAT_RULES[k] = v;
      }
    }
    // Fog of war tuning
    if (data.fog) {
      for (const [k, v] of Object.entries(data.fog)) {
        FOG_RULES[k] = v;
      }
    }
    // Light / hiding tuning
    if (data.light) {
      for (const [k, v] of Object.entries(data.light)) {
        LIGHT_RULES[k] = v;
      }
    }
    // Door tuning
    if (data.doors) {
      for (const [k, v] of Object.entries(data.doors)) {
        DOOR_RULES[k] = v;
      }
    }
    // Sprite tuning
    if (data.sprites && typeof data.sprites === 'object') {
      window._SPRITE_CFG = { ...(window._SPRITE_CFG || {}), ...data.sprites };
    }
    // Tileset source configuration (image-first with procedural fallback)
    if (data.tileset && typeof data.tileset === 'object') {
      window._TILESET_CFG = {
        ...(window._TILESET_CFG || {}),
        ...data.tileset,
        sources: {
          ...((window._TILESET_CFG && window._TILESET_CFG.sources) || {}),
          ...(data.tileset.sources || {}),
        },
      };
    }
    // Display
    if (data.display && data.display.tileSize) {
      window.S = data.display.tileSize;
    }
  },

  applySprites(data) {
    if (!data.spriteManifest) return;
    const m = data.spriteManifest;
    window.SPRITE_MANIFEST = window.SPRITE_MANIFEST || { atlases: [], tiles: {}, characters: {} };
    if (m.atlases) window.SPRITE_MANIFEST.atlases.push(...m.atlases);
    if (m.tiles) Object.assign(window.SPRITE_MANIFEST.tiles, m.tiles);
    if (m.characters) Object.assign(window.SPRITE_MANIFEST.characters, m.characters);
  },

  applyClasses(data) {
    if (!data.classes) return;
    for (const [id, cls] of Object.entries(data.classes)) {
      // Build features map with numeric keys
      const features = {};
      if (cls.features) {
        for (const [lvl, feats] of Object.entries(cls.features)) {
          features[parseInt(lvl)] = feats;
        }
      }
      CLASSES_DATA[id] = { ...cls, features };
    }
  },

  applyWeapons(data) {
    if (!data.weapons) return;
    for (const [id, weapon] of Object.entries(data.weapons)) {
      WEAPON_DEFS[id] = { ...weapon };
    }
  },

  compileHookFunction(source, argNames) {
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

  normalizeHook(hook, abilityId, hookName) {
    if (!hook || typeof hook !== 'object') return null;

    const normalized = { ...hook, abilityId, hookName };

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
      normalized.effects = normalized.effects.map((effect) => {
        if (typeof effect === 'string') {
          return this.compileHookFunction(effect, ['context', 'scene', 'ability', 'hook']);
        }
        if (!effect || typeof effect !== 'object') return effect;
        const nextEffect = { ...effect };
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

  applyAbilities(data) {
    if (!data.abilities) return;
    window.ABILITY_HOOKS = {};
    for (const [id, ability] of Object.entries(data.abilities)) {
      const nextAbility = { ...ability };
      ABILITY_DEFS[id] = nextAbility;

      if (!ability.hooks || typeof ability.hooks !== 'object') continue;
      for (const [hookName, hookConfig] of Object.entries(ability.hooks)) {
        const normalized = this.normalizeHook(hookConfig, id, hookName);
        if (!normalized) continue;
        if (!window.ABILITY_HOOKS[hookName]) window.ABILITY_HOOKS[hookName] = [];
        window.ABILITY_HOOKS[hookName].push(normalized);
      }
    }
  },

  applyStatuses(data) {
    if (data.statusRules && typeof data.statusRules === 'object') {
      for (const [k, v] of Object.entries(data.statusRules)) {
        STATUS_RULES[k] = v;
      }
    }
    if (!data.statuses) return;
    for (const [id, status] of Object.entries(data.statuses)) {
      STATUS_DEFS[id] = { ...status };
    }
  },

  applyItems(data) {
    if (!data.items) return;
    for (const [id, item] of Object.entries(data.items)) {
      ITEM_DEFS[id] = { id, ...item };
    }
  },

  applyMap(data, activeMap) {
    if (!data.maps || !data.maps[activeMap]) return;
    const mapDef = data.maps[activeMap];

    let convertedGrid, playerStart, stairsPos;

    let generatedLights = [], generatedSprites = [];
    if (mapDef.generator) {
      // Procedural generation — ignore grid: field
      const generatorCfg = { ...mapDef.generator };
      const persistedSeed = Number(this._generatedMapSeeds?.[activeMap]);
      if (Number.isFinite(persistedSeed) && persistedSeed > 0) {
        generatorCfg.seed = persistedSeed;
      }
      const result = MapGen.generate(generatorCfg, TILE);
      convertedGrid    = result.grid;
      playerStart      = mapDef.playerStart || result.playerStart;
      stairsPos        = result.stairsPos;
      generatedLights  = result.lights || [];
      generatedSprites = result.stageSprites || [];
      if (!this._generatedMapSeeds || typeof this._generatedMapSeeds !== 'object') this._generatedMapSeeds = {};
      this._generatedMapSeeds[activeMap] = Number(result.seed);
      this._persistSeedImmediately(activeMap, result.seed);
      console.log(`[ModLoader] Generated map (${mapDef.generator.type||'cave'}) seed=${result.seed} size=${convertedGrid[0].length}x${convertedGrid.length} stairs=(${stairsPos?.x},${stairsPos?.y}) torches=${generatedLights.length}`);
    } else {
      // Static grid from YAML
      convertedGrid = this.convertGridSymbols(mapDef.grid);
      playerStart   = mapDef.playerStart;
      stairsPos     = null;
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

    // Overwrite MAP grid
    MAP.length = 0;
    convertedGrid.forEach(row => MAP.push(row));
    // Update ROWS/COLS globals (let variables defined in config.js)
    ROWS = MAP.length;
    COLS = MAP[0].length;
    window._ROWS = ROWS;
    window._COLS = COLS;
    // Store map metadata
    const floorName = String(mapDef.floor || '').toUpperCase();
    const fallbackGlobalLight = floorName === 'TOWN' ? 'bright' : 'dark';
    const baseInteractables = Array.isArray(mapDef.interactables) ? [...mapDef.interactables] : [];
    const runtimeExtract = this._buildRuntimeExtractionInteractable(mapDef.floor, playerStart, convertedGrid, baseInteractables);
    const finalInteractables = runtimeExtract ? [...baseInteractables, runtimeExtract] : baseInteractables;

    window._MAP_META = {
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

  applyCreatures(data, activeMap) {
    if (!data.maps || !data.maps[activeMap] || !data.creatures) return;
    const mapDef = data.maps[activeMap];
    const isGenerated = !!mapDef.generator;
    ENEMY_DEFS.length = 0;
    for (const enc of (mapDef.encounters || [])) {
      const tmpl = data.creatures[enc.creature];
      if (!tmpl) continue;
      const weaponId = tmpl.attack?.weaponId || null;
      const weapon = weaponId ? data.weapons?.[weaponId] : null;
      const damageFormula = dnd.damageSpecToString(weapon?.damageDice || tmpl.attack?.dice || '1d4');
      const atkRange = weapon?.range || tmpl.attack?.range || 1;
      // count: N expands to N entries with tx=-1 (random placement) for generated maps
      const count = isGenerated ? Number(enc.count || 1) : 1;
      for (let i = 0; i < count; i++) {
        ENEMY_DEFS.push({
          tx: isGenerated ? -1 : enc.x,
          ty: isGenerated ? -1 : enc.y,
          type: tmpl.type, name: enc.name || tmpl.name || null,
          hp: tmpl.hp, maxHp: tmpl.hp,
          sight: tmpl.sight, spd: tmpl.speed, icon: tmpl.icon,
          facing: enc.facing ?? 0, fov: tmpl.fov, group: enc.group,
          stats: { ...tmpl.stats },
          ac: tmpl.ac, weaponId, damageFormula, atkRange,
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

  applyPlayer(p, data) {
    if (!p) return;
    const cls = data.classes?.[p.class];
    PLAYER_STATS.name = p.name;
    PLAYER_STATS.class = cls?.name || p.class;
    PLAYER_STATS.level = p.level;
    PLAYER_STATS.xp = p.xp;

    // Abilities
    for (const ab of ['str','dex','con','int','wis','cha']) {
      PLAYER_STATS[ab] = p.abilities[ab];
    }

    // Equipment
    PLAYER_STATS.ac = p.equipment.ac;
    PLAYER_STATS.baseAC = p.equipment.ac;

    // Weapon resolution (new weaponId model + legacy fallback)
    const weaponId = p.equipment.weaponId || null;
    const weaponFromId = weaponId ? data.weapons?.[weaponId] : null;
    const legacyWeapon = p.equipment.weapon || null;
    const weapon = weaponFromId || legacyWeapon;

    PLAYER_STATS.weaponId = weaponId || PLAYER_STATS.weaponId;
    PLAYER_STATS.weaponName = weapon?.name || 'Unarmed';
    PLAYER_STATS.damageFormula = dnd.damageSpecToString(weapon?.damageDice || weapon?.dice || PLAYER_STATS.damageFormula || '1d4');
    PLAYER_STATS.atkRange = weapon?.range || PLAYER_STATS.atkRange;

    // Class-derived
    if (cls) {
      PLAYER_STATS.hitDie = cls.hitDie;
      PLAYER_STATS.savingThrows = new Set(cls.savingThrows);
      // Gather features up to current level
      PLAYER_STATS.features = [];
      for (let l = 1; l <= p.level; l++) {
        const feats = cls.features?.[l];
        if (feats) PLAYER_STATS.features.push(...feats);
      }
    }

    // Skill proficiencies
    PLAYER_STATS.skillProficiencies = new Set(p.skillProficiencies || []);

    // Derived stats
    PLAYER_STATS.profBonus = dnd.profBonus(p.level);
    PLAYER_STATS.maxHP = cls ? cls.hitDie + dnd.mod(p.abilities.con) : 12;

    // Starting inventory
    if (Array.isArray(p.startingInventory)) {
      PLAYER_STATS.inventory = p.startingInventory.map(item => ({ ...item }));
    }
    if (Array.isArray(p.startingStash)) {
      PLAYER_STATS.stash = p.startingStash.map(item => ({ ...item }));
    } else if (!Array.isArray(PLAYER_STATS.stash)) {
      PLAYER_STATS.stash = [];
    }
    if (typeof p.startingGold === 'number') {
      PLAYER_STATS.gold = p.startingGold;
    }

    // Starting tile from map
    if (window._MAP_META?.playerStart) {
      PLAYER_STATS.startTile = window._MAP_META.playerStart;
    }
  },
};
