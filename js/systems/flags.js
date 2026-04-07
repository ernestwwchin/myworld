// ═══════════════════════════════════════════════════════
// flags.js — Global flag/state store (BG3-style)
//
// Flags are the game's memory: booleans, counters, enums.
// Each mod declares flags in meta.yaml; events read/write them.
// Flags are namespaced by mod id to prevent collisions.
// ═══════════════════════════════════════════════════════

const Flags = {
  _data: {},          // { "01_goblin_invasion.goblin_chief_dead": true, ... }
  _schema: {},        // { "01_goblin_invasion.goblin_chief_dead": { type:"bool", default:false }, ... }
  _currentMod: null,  // set during event execution for short-name resolution

  // ── Registration (called by ModLoader for each mod) ──

  /** Register flag definitions from a mod's meta.yaml */
  registerMod(modId, flagDefs) {
    if (!flagDefs || typeof flagDefs !== 'object') return;
    for (const [key, def] of Object.entries(flagDefs)) {
      const fullKey = `${modId}.${key}`;
      this._schema[fullKey] = def;
      if (!(fullKey in this._data)) {
        this._data[fullKey] = def.default !== undefined ? def.default : false;
      }
    }
  },

  /** Apply flag overrides from a later mod */
  applyOverrides(overrides) {
    if (!overrides || typeof overrides !== 'object') return;
    for (const [fullKey, value] of Object.entries(overrides)) {
      this._data[fullKey] = value;
    }
  },

  // ── Resolution ──

  /** Resolve a flag key — short name uses _currentMod prefix */
  _resolve(key) {
    if (key.includes('.')) return key;
    if (this._currentMod) return `${this._currentMod}.${key}`;
    return key;
  },

  // ── Read ──

  get(key) {
    return this._data[this._resolve(key)];
  },

  is(key) {
    return !!this._data[this._resolve(key)];
  },

  count(key) {
    return this._data[this._resolve(key)] || 0;
  },

  eq(key, value) {
    return this._data[this._resolve(key)] === value;
  },

  // ── Write ──

  set(key, value) {
    const resolved = this._resolve(key);
    this._data[resolved] = value;
    console.log(`[Flags] ${resolved} = ${JSON.stringify(value)}`);
  },

  increment(key, amount) {
    const resolved = this._resolve(key);
    this._data[resolved] = (this._data[resolved] || 0) + (amount || 1);
    console.log(`[Flags] ${resolved} = ${this._data[resolved]}`);
  },

  decrement(key, amount) {
    const resolved = this._resolve(key);
    this._data[resolved] = (this._data[resolved] || 0) - (amount || 1);
    console.log(`[Flags] ${resolved} = ${this._data[resolved]}`);
  },

  toggle(key) {
    const resolved = this._resolve(key);
    this._data[resolved] = !this._data[resolved];
    console.log(`[Flags] ${resolved} = ${this._data[resolved]}`);
  },

  // ── Reset ──

  /** Reset all flags to schema defaults */
  reset() {
    this._data = {};
    for (const [fullKey, def] of Object.entries(this._schema)) {
      this._data[fullKey] = def.default !== undefined ? def.default : false;
    }
  },

  // ── Persistence ──

  serialize() {
    return JSON.parse(JSON.stringify(this._data));
  },

  load(data) {
    if (!data || typeof data !== 'object') return;
    // Start from defaults, then overlay saved data
    this.reset();
    for (const [key, value] of Object.entries(data)) {
      this._data[key] = value;
    }
  },

  // ── Debug ──

  dump() {
    console.table(this._data);
    return this._data;
  },
};
