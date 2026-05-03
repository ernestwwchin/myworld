import { dnd as defaultDnd } from '@/config';
import type { DamageSpec, AbilityDef } from '@/config';
import type { Actor, StatusEffect } from '@/types/actors';

export interface RollResult {
  d20: number;
  total: number;
  dc: number;
  crit: boolean;
  fumble: boolean;
}

export interface SceneAdapter {
  applyDamageToActor(actor: Actor, dmg: number, color?: string, label?: string): void;
  applyHealToActor(actor: Actor, amount: number, color?: string, label?: string): void;
  actorEffects(actor: Actor): StatusEffect[];
  showStatus(msg: string): void;
  actorLabel(actor: Actor): string;
  getActorStat(actor: Actor, stat: string): number;
  getActorAC(actor: Actor): number;
  getActorHP(actor: Actor): number;
  getActorMaxHP(actor: Actor): number;
  setFlag(name: string, value: unknown): void;
  getFlag(name: string): unknown;
}

type DndLike = {
  roll(n: number, d: number): number;
  mod(score: number): number;
  rollDamageSpec(spec: DamageSpec, crit?: boolean): { total: number };
  profBonus(lvl: number): number;
};

function isActor(v: unknown): v is Actor {
  return v === 'player' || (typeof v === 'object' && v !== null && 'hp' in v);
}

export class AbilityRunner {
  source: Actor = 'player';
  target: Actor = 'player';
  self: Actor = 'player';
  ability: AbilityDef | null = null;
  hits = false;
  rollResult: RollResult | null = null;
  damageType: string | undefined = undefined;

  private _scene: SceneAdapter;
  private _dnd: DndLike;
  private _compiled = new Map<string, Function | null>();

  constructor(scene: SceneAdapter, dndOverride?: DndLike) {
    this._scene = scene;
    this._dnd = dndOverride || defaultDnd;
  }

  setContext(ctx: {
    source: Actor;
    target: Actor;
    ability?: AbilityDef | null;
    hits?: boolean;
    rollResult?: RollResult | null;
    damageType?: string;
  }): void {
    this.source = ctx.source;
    this.target = ctx.target;
    this.self = ctx.source;
    this.ability = ctx.ability ?? null;
    this.hits = ctx.hits ?? false;
    this.rollResult = ctx.rollResult ?? null;
    this.damageType = ctx.damageType;
  }

  resetContext(): void {
    this.source = 'player';
    this.target = 'player';
    this.self = 'player';
    this.ability = null;
    this.hits = false;
    this.rollResult = null;
    this.damageType = undefined;
  }

  compile(body: string): Function | null {
    const cached = this._compiled.get(body);
    if (cached !== undefined) return cached;
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('with(this){' + body + '}');
      this._compiled.set(body, fn);
      return fn;
    } catch (err) {
      console.warn('[AbilityRunner] Compile error:', err);
      this._compiled.set(body, null);
      return null;
    }
  }

  exec(body: string): void {
    const fn = this.compile(body);
    if (!fn) return;
    try {
      fn.call(this);
    } catch (err) {
      console.warn('[AbilityRunner] Exec error:', err);
    }
  }

  execFn(fn: Function): void {
    try {
      fn.call(this);
    } catch (err) {
      console.warn('[AbilityRunner] Exec error:', err);
    }
  }

  // ── Action Methods ──

  dealDamage(diceOrSelf: string | Actor, diceOrType?: string, type?: string): void {
    let actor: Actor;
    let spec: string;
    let dmgType: string | undefined;

    if (isActor(diceOrSelf)) {
      actor = diceOrSelf;
      spec = diceOrType!;
      dmgType = type;
    } else {
      actor = this.target;
      spec = diceOrSelf;
      dmgType = diceOrType;
    }

    const crit = this.rollResult?.crit ?? false;
    const result = this._dnd.rollDamageSpec(spec as DamageSpec, crit);
    const color = dmgType ? damageColor(dmgType) : '#e74c3c';
    const label = dmgType
      ? `${this._scene.actorLabel(actor)} takes ${result.total} ${dmgType} damage.`
      : `${this._scene.actorLabel(actor)} takes ${result.total} damage.`;
    this._scene.applyDamageToActor(actor, result.total, color, label);
  }

  dealWeaponDamage(): void {
    const weapon = (this.source as Record<string, unknown>).weapon as
      | { damageDice?: string; damageType?: string }
      | undefined;
    const spec = weapon?.damageDice || '1d4';
    const dmgType = weapon?.damageType || 'bludgeoning';
    this.dealDamage(spec, dmgType);
  }

  regainHitPoints(diceOrSelf: string | Actor, dice?: string): void {
    let actor: Actor;
    let spec: string;

    if (isActor(diceOrSelf)) {
      actor = diceOrSelf;
      spec = dice!;
    } else {
      actor = this.target;
      spec = diceOrSelf;
    }

    const result = this._dnd.rollDamageSpec(spec as DamageSpec);
    this._scene.applyHealToActor(actor, result.total, '#2ecc71',
      `${this._scene.actorLabel(actor)} regains ${result.total} HP.`);
  }

  applyStatus(idOrSelf: string | Actor, idOrDuration?: string | number, duration?: number): void {
    let actor: Actor;
    let statusId: string;
    let dur: number;

    if (isActor(idOrSelf)) {
      actor = idOrSelf;
      statusId = String(idOrDuration);
      dur = duration ?? 1;
    } else {
      actor = this.target;
      statusId = idOrSelf;
      dur = typeof idOrDuration === 'number' ? idOrDuration : 1;
    }

    const effects = this._scene.actorEffects(actor);
    effects.push({ id: statusId, type: statusId, duration: dur, trigger: 'turn_start' } as StatusEffect);
    this._scene.showStatus(`${this._scene.actorLabel(actor)} is now ${statusId}.`);
  }

  removeStatus(idOrSelf: string | Actor, id?: string): void {
    let actor: Actor;
    let statusId: string;

    if (isActor(idOrSelf)) {
      actor = idOrSelf;
      statusId = id!;
    } else {
      actor = this.target;
      statusId = idOrSelf;
    }

    const effects = this._scene.actorEffects(actor);
    const idx = effects.findIndex(e => (e.id || e.type) === statusId);
    if (idx >= 0) {
      effects.splice(idx, 1);
      this._scene.showStatus(`${this._scene.actorLabel(actor)} is no longer ${statusId}.`);
    }
  }

  grantResource(type: string, amount: number): void {
    const actor = this.source as Record<string, unknown>;
    const key = `resource_${type}`;
    actor[key] = ((actor[key] as number) || 0) + amount;
  }

  consumeResource(type: string, amount: number): void {
    const actor = this.source as Record<string, unknown>;
    const key = `resource_${type}`;
    actor[key] = Math.max(0, ((actor[key] as number) || 0) - amount);
  }

  forcePush(distance: number): void {
    this._scene.showStatus(
      `${this._scene.actorLabel(this.target)} is pushed ${distance} tiles.`);
  }

  teleportSelf(): void {
    this._scene.showStatus(`${this._scene.actorLabel(this.source)} teleports.`);
  }

  unlockEntity(): void {
    this._scene.showStatus('Unlocked.');
  }

  destroyEntity(): void {
    this._scene.showStatus('Destroyed.');
  }

  alertEnemies(radius: number): void {
    this._scene.showStatus(`Noise alerts enemies within ${radius} tiles.`);
  }

  grantXp(amount: number): void {
    const actor = this.source as Record<string, unknown>;
    actor.xp = ((actor.xp as number) || 0) + amount;
    this._scene.showStatus(`Gained ${amount} XP.`);
  }

  grantGold(amount: number): void {
    const actor = this.source as Record<string, unknown>;
    actor.gold = ((actor.gold as number) || 0) + amount;
    this._scene.showStatus(`Gained ${amount} gold.`);
  }

  setFlag(name: string, value: unknown): void {
    this._scene.setFlag(name, value ?? true);
  }

  logMessage(text: string): void {
    this._scene.showStatus(text);
  }

  floatText(text: string, _color?: string): void {
    this._scene.showStatus(text);
  }

  // ── Check Functions ──

  isTarget(actor: Actor): boolean {
    return actor === this.target;
  }

  isSource(actor: Actor): boolean {
    return actor === this.source;
  }

  isEnemy(actor: Actor): boolean {
    return actor !== this.source && actor !== 'player';
  }

  isAlly(actor: Actor): boolean {
    return actor === this.source || actor === 'player';
  }

  isHit(): boolean {
    return this.hits;
  }

  isCrit(): boolean {
    return this.rollResult?.crit ?? false;
  }

  isMiss(): boolean {
    return !this.hits;
  }

  isWeaponAttack(): boolean {
    return this.ability?.type === 'weapon' || this.ability?.type === 'action';
  }

  isMeleeAttack(): boolean {
    return (this.ability as Record<string, unknown> | null)?.range === 'melee' ||
      (this.ability as Record<string, unknown> | null)?.attackType === 'melee';
  }

  isRangedAttack(): boolean {
    return (this.ability as Record<string, unknown> | null)?.range !== 'melee' &&
      (this.ability as Record<string, unknown> | null)?.attackType === 'ranged';
  }

  isAbleToReact(_actor: Actor): boolean {
    return true;
  }

  hasStatus(actor: Actor, id: string): boolean {
    const effects = this._scene.actorEffects(actor);
    return effects.some(e => (e.id || e.type) === id);
  }

  stacks(actor: Actor, id: string): number {
    const effects = this._scene.actorEffects(actor);
    return effects.filter(e => (e.id || e.type) === id).length;
  }

  isDamageType(type: string): boolean {
    return this.damageType === type;
  }

  hasHpBelow(actor: Actor, pct: number): boolean {
    const hp = this._scene.getActorHP(actor);
    const max = this._scene.getActorMaxHP(actor);
    return max > 0 && (hp / max) * 100 < pct;
  }

  isDead(actor: Actor): boolean {
    return this._scene.getActorHP(actor) <= 0;
  }

  // ── Roll Functions ──

  skillCheck(skill: string, dc: number): void {
    const SKILL_ABILITY: Record<string, string> = {
      athletics: 'str', acrobatics: 'dex', sleightOfHand: 'dex', stealth: 'dex',
      arcana: 'int', history: 'int', investigation: 'int', nature: 'int', religion: 'int',
      animalHandling: 'wis', insight: 'wis', medicine: 'wis', perception: 'wis', survival: 'wis',
      deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha',
    };
    const ability = SKILL_ABILITY[skill] || 'wis';
    const mod = this._dnd.mod(this._scene.getActorStat(this.source, ability));
    const prof = this._dnd.profBonus(this._scene.getActorStat(this.source, 'level') || 1);
    const d20 = this._dnd.roll(1, 20);
    const total = d20 + mod + prof;
    const crit = d20 === 20;
    const fumble = d20 === 1;
    this.hits = crit || (!fumble && total >= dc);
    this.rollResult = { d20, total, dc, crit, fumble };
    this._scene.showStatus(
      `${this._scene.actorLabel(this.source)} ${skill}: ${total} vs DC ${dc} — ${this.hits ? 'Success!' : 'Fail.'}`
    );
  }

  stealthRoll(): void {
    const mod = this._dnd.mod(this._scene.getActorStat(this.source, 'dex'));
    const d20 = this._dnd.roll(1, 20);
    const total = d20 + mod;
    this.hits = total > 0;
    this.rollResult = { d20, total, dc: 0, crit: d20 === 20, fumble: d20 === 1 };
    this._scene.showStatus(`${this._scene.actorLabel(this.source)} stealth: ${total}`);
  }

  attackRoll(type: 'melee' | 'ranged' = 'melee'): void {
    const stat = type === 'melee' ? 'str' : 'dex';
    const mod = this._dnd.mod(this._scene.getActorStat(this.source, stat));
    const prof = this._dnd.profBonus(this._scene.getActorStat(this.source, 'level') || 1);
    const d20 = this._dnd.roll(1, 20);
    const total = d20 + mod + prof;
    const dc = this._scene.getActorAC(this.target);
    const crit = d20 === 20;
    const fumble = d20 === 1;
    this.hits = crit || (!fumble && total >= dc);
    this.rollResult = { d20, total, dc, crit, fumble };
  }

  savingThrow(stat: string, dc: number): void {
    const mod = this._dnd.mod(this._scene.getActorStat(this.target, stat));
    const d20 = this._dnd.roll(1, 20);
    const total = d20 + mod;
    const crit = d20 === 20;
    const fumble = d20 === 1;
    const saved = crit || (!fumble && total >= dc);
    this.hits = !saved;
    this.rollResult = { d20, total, dc, crit, fumble };
  }
}

const DAMAGE_COLORS: Record<string, string> = {
  slashing: '#c0c0c0',
  piercing: '#c0c0c0',
  bludgeoning: '#a0a0a0',
  fire: '#e67e22',
  cold: '#3498db',
  poison: '#2ecc71',
  radiant: '#f1c40f',
  necrotic: '#8e44ad',
  lightning: '#00bcd4',
  psychic: '#e91e63',
};

function damageColor(type: string): string {
  return DAMAGE_COLORS[type] || '#e74c3c';
}
