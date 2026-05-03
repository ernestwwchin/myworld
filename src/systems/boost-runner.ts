import type { Actor, StatusEffect } from '@/types/actors';

export interface DerivedStats {
  ac: number;
  str: number;
  dex: number;
  con: number;
  wis: number;
  int: number;
  cha: number;
  maxHp: number;
  damage: number;
  movement: number;
  movementMultiplier: number;
  saves: Record<string, number>;
  saveAll: number;
  advantages: Set<string>;
  disadvantages: Set<string>;
  autoFails: Set<string>;
  immunities: Set<string>;
  resistances: Set<string>;
  vulnerabilities: Set<string>;
}

export interface BoostSceneAdapter {
  actorEffects(actor: Actor): StatusEffect[];
  getActorHP(actor: Actor): number;
  getActorMaxHP(actor: Actor): number;
}

function emptyDerived(): DerivedStats {
  return {
    ac: 0, str: 0, dex: 0, con: 0, wis: 0, int: 0, cha: 0,
    maxHp: 0, damage: 0, movement: 0, movementMultiplier: 1,
    saves: {}, saveAll: 0,
    advantages: new Set(), disadvantages: new Set(), autoFails: new Set(),
    immunities: new Set(), resistances: new Set(), vulnerabilities: new Set(),
  };
}

const COMPILED_CACHE = new Map<string, Function | null>();

function compileBoost(body: string): Function | null {
  const cached = COMPILED_CACHE.get(body);
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('with(this){' + body + '}');
    COMPILED_CACHE.set(body, fn);
    return fn;
  } catch (err) {
    console.warn('[BoostRunner] Compile error:', err);
    COMPILED_CACHE.set(body, null);
    return null;
  }
}

export class BoostRunner {
  self: Actor;
  source: Actor;
  private _derived: DerivedStats;
  private _scene: BoostSceneAdapter;

  constructor(actor: Actor, scene: BoostSceneAdapter, source?: Actor) {
    this.self = actor;
    this.source = source ?? actor;
    this._derived = emptyDerived();
    this._scene = scene;
  }

  // ── Stat Modifiers (additive) ──

  ac(n: number): void { this._derived.ac += n; }
  str(n: number): void { this._derived.str += n; }
  dex(n: number): void { this._derived.dex += n; }
  con(n: number): void { this._derived.con += n; }
  wis(n: number): void { this._derived.wis += n; }
  int_(n: number): void { this._derived.int += n; }
  cha(n: number): void { this._derived.cha += n; }
  maxHp(n: number): void { this._derived.maxHp += n; }
  damage(n: number): void { this._derived.damage += n; }
  movement(n: number): void { this._derived.movement += n; }

  save(stat: string, n: number): void {
    this._derived.saves[stat] = (this._derived.saves[stat] || 0) + n;
  }

  saveAll(n: number): void { this._derived.saveAll += n; }

  // ── Multipliers ──

  multiplyMovement(m: number): void {
    this._derived.movementMultiplier *= m;
  }

  // ── Advantage / Disadvantage ──

  advantage(type: string): void { this._derived.advantages.add(type); }
  disadvantage(type: string): void { this._derived.disadvantages.add(type); }

  // ── Special ──

  autoFail(type: string): void { this._derived.autoFails.add(type); }
  immunity(damageType: string): void { this._derived.immunities.add(damageType); }
  resistance(damageType: string): void { this._derived.resistances.add(damageType); }
  vulnerability(damageType: string): void { this._derived.vulnerabilities.add(damageType); }

  // ── Check Functions ──

  hasHpBelow(pct: number): boolean {
    const hp = this._scene.getActorHP(this.self);
    const max = this._scene.getActorMaxHP(this.self);
    return max > 0 && (hp / max) * 100 < pct;
  }

  hasStatus(id: string): boolean {
    return this._scene.actorEffects(this.self).some(e => (e.id || e.type) === id);
  }

  stacks(id: string): number {
    return this._scene.actorEffects(this.self).filter(e => (e.id || e.type) === id).length;
  }

  // ── Result ──

  result(): DerivedStats {
    return this._derived;
  }
}

export function recalcBoosts(
  actor: Actor,
  scene: BoostSceneAdapter,
): DerivedStats {
  const ctx = new BoostRunner(actor, scene);
  const effects = scene.actorEffects(actor);

  for (const e of effects) {
    const boosts = (e as Record<string, unknown>).boosts as string | undefined;
    if (!boosts) continue;
    const source = (e as Record<string, unknown>).source as Actor | undefined;
    if (source) ctx.source = source;
    const fn = compileBoost(boosts);
    if (fn) {
      try {
        fn.call(ctx);
      } catch (err) {
        console.warn('[BoostRunner] Exec error:', err);
      }
    }
  }

  const equipment = (actor as Record<string, unknown>).equipment as
    Array<{ boosts?: string }> | undefined;
  if (equipment) {
    for (const item of equipment) {
      if (!item.boosts) continue;
      const fn = compileBoost(item.boosts);
      if (fn) {
        try {
          fn.call(ctx);
        } catch (err) {
          console.warn('[BoostRunner] Exec error:', err);
        }
      }
    }
  }

  const derived = ctx.result();
  if (typeof actor === 'object' && actor !== null) {
    (actor as Record<string, unknown>).derived = derived;
  }
  return derived;
}

export function clearBoostCache(): void {
  COMPILED_CACHE.clear();
}
