// ═══════════════════════════════════════════════════════
// modloader.js — Loads YAML mod data into game config
// Works fully client-side (no server dependency) for
// portability to iPad / Steam / Electron / Capacitor.
// Requires js-yaml loaded before this script.
// ═══════════════════════════════════════════════════════

const ModLoader = {
  /** Stored mod data from last load (available for test reuse) */
  _modData: null,
  
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
    this.applyMap(modData, stageId);
    this.applyCreatures(modData, stageId);
    // Update player start tile for the new stage
    if (window._MAP_META?.playerStart) {
      PLAYER_STATS.startTile = window._MAP_META.playerStart;
    }

    // Fade out → restart scene → fade in
    console.log(`[ModLoader] Stage ready: ${stageId}, MAP=${MAP.length}x${MAP[0]?.length}, playerStart=${JSON.stringify(PLAYER_STATS.startTile)}, nextStage=${window._MAP_META?.nextStage}`);
    scene.cameras.main.fadeOut(400, 0, 0, 0);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      console.log(`[ModLoader] Fade complete, restarting scene for ${stageId}`);
      scene.scene.restart();
    });
  },

  /**
   * Load all mods defined in modsettings.yaml, then player.yaml.
   * Populates the global game constants (MAP, ENEMY_DEFS, PLAYER_STATS, etc.)
   */
  async init() {
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

    // URL param override: ?map=ts_fog  (loads any registered stage)
    try {
      const urlMap = new URLSearchParams(window.location.search).get('map');
      if (urlMap) {
        // Auto-register test stages if the requested map starts with ts_
        if (urlMap.startsWith('ts_') && !this._stageRegistry[urlMap]) {
          this._stageRegistry[urlMap] = `data/00_core_test/stages/${urlMap}/stage.yaml`;
        }
        activeMap = urlMap;
        console.log(`[ModLoader] URL override: map=${urlMap}`);
      }
    } catch (_e) { /* no URLSearchParams — node env, tests, etc. */ }

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
      const result = MapGen.generate(mapDef.generator, TILE);
      convertedGrid    = result.grid;
      playerStart      = mapDef.playerStart || result.playerStart;
      stairsPos        = result.stairsPos;
      generatedLights  = result.lights || [];
      generatedSprites = result.stageSprites || [];
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
    window._MAP_META = {
      name: mapDef.name,
      floor: mapDef.floor,
      playerStart,
      stairsPos,
      lights: [...(mapDef.lights || []), ...generatedLights],
      globalLight: mapDef.globalLight || 'dark',
      doors: mapDef.doors || [],
      interactables: mapDef.interactables || [],
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
    if (typeof p.startingGold === 'number') {
      PLAYER_STATS.gold = p.startingGold;
    }

    // Starting tile from map
    if (window._MAP_META?.playerStart) {
      PLAYER_STATS.startTile = window._MAP_META.playerStart;
    }
  },
};
