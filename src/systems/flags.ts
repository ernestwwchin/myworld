interface FlagDef {
  type?: string;
  default?: unknown;
}

type FlagValue = boolean | number | string | null | undefined;

interface FlagsShape {
  _data: Record<string, FlagValue>;
  _schema: Record<string, FlagDef>;
  _currentMod: string | null;
  registerMod(modId: string, flagDefs: Record<string, FlagDef> | null | undefined): void;
  applyOverrides(overrides: Record<string, FlagValue> | null | undefined): void;
  _resolve(key: string): string;
  get(key: string): FlagValue;
  is(key: string): boolean;
  count(key: string): number;
  eq(key: string, value: FlagValue): boolean;
  set(key: string, value: FlagValue): void;
  increment(key: string, amount?: number): void;
  decrement(key: string, amount?: number): void;
  toggle(key: string): void;
  reset(): void;
  serialize(): Record<string, FlagValue>;
  load(data: Record<string, FlagValue> | null | undefined): void;
  dump(): Record<string, FlagValue>;
}

export const Flags: FlagsShape = {
  _data: {},
  _schema: {},
  _currentMod: null,

  registerMod(modId, flagDefs) {
    if (!flagDefs || typeof flagDefs !== 'object') return;
    for (const [key, def] of Object.entries(flagDefs)) {
      const fullKey = `${modId}.${key}`;
      this._schema[fullKey] = def;
      if (!(fullKey in this._data)) {
        this._data[fullKey] = (def.default !== undefined ? def.default : false) as FlagValue;
      }
    }
  },

  applyOverrides(overrides) {
    if (!overrides || typeof overrides !== 'object') return;
    for (const [fullKey, value] of Object.entries(overrides)) {
      this._data[fullKey] = value;
    }
  },

  _resolve(key) {
    if (key.includes('.')) return key;
    if (this._currentMod) return `${this._currentMod}.${key}`;
    return key;
  },

  get(key) {
    return this._data[this._resolve(key)];
  },

  is(key) {
    return !!this._data[this._resolve(key)];
  },

  count(key) {
    return (this._data[this._resolve(key)] as number) || 0;
  },

  eq(key, value) {
    return this._data[this._resolve(key)] === value;
  },

  set(key, value) {
    this._data[this._resolve(key)] = value;
  },

  increment(key, amount) {
    const resolved = this._resolve(key);
    this._data[resolved] = ((this._data[resolved] as number) || 0) + (amount || 1);
  },

  decrement(key, amount) {
    const resolved = this._resolve(key);
    this._data[resolved] = ((this._data[resolved] as number) || 0) - (amount || 1);
  },

  toggle(key) {
    const resolved = this._resolve(key);
    this._data[resolved] = !this._data[resolved];
  },

  reset() {
    this._data = {};
    for (const [fullKey, def] of Object.entries(this._schema)) {
      this._data[fullKey] = (def.default !== undefined ? def.default : false) as FlagValue;
    }
  },

  serialize() {
    return JSON.parse(JSON.stringify(this._data));
  },

  load(data) {
    if (!data || typeof data !== 'object') return;
    this.reset();
    for (const [key, value] of Object.entries(data)) {
      this._data[key] = value;
    }
  },

  dump() {
    console.table(this._data);
    return this._data;
  },
};

if (typeof window !== 'undefined') {
  (window as unknown as { Flags: typeof Flags }).Flags = Flags;
}
