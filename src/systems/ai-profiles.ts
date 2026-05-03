import type { CombatAbilityDef } from './combat-abilities';

export type AIProfile = 'basic' | 'ranged' | 'support';

export type TriggerCondition =
  | 'default'
  | 'ally_below_50pct'
  | 'ally_below_25pct'
  | 'self_below_50pct'
  | 'enemy_in_melee'
  | 'enemy_in_range'
  | 'no_buff_on_ally';

export interface AIAbilityEntry {
  abilityId: string;
  trigger?: TriggerCondition;
  priority?: number;
}

export interface AIState {
  profile: AIProfile;
  preferredRange?: number;
  abilities?: AIAbilityEntry[];
  hp: number;
  maxHp: number;
  tx: number;
  ty: number;
}

export interface AITarget {
  hp: number;
  maxHp: number;
  tx: number;
  ty: number;
  isAlly?: boolean;
  statuses?: string[];
}

export interface AIDecision {
  action: 'ability' | 'move' | 'attack' | 'wait';
  abilityId?: string;
  targetIndex?: number;
  moveToward?: { tx: number; ty: number };
  reason: string;
}

function distance(a: { tx: number; ty: number }, b: { tx: number; ty: number }): number {
  return Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);
}

function checkTrigger(
  trigger: TriggerCondition,
  self: AIState,
  allies: AITarget[],
  enemies: AITarget[],
): boolean {
  switch (trigger) {
    case 'default': return true;
    case 'self_below_50pct': return self.hp / self.maxHp < 0.5;
    case 'ally_below_50pct': return allies.some(a => a.hp / a.maxHp < 0.5);
    case 'ally_below_25pct': return allies.some(a => a.hp / a.maxHp < 0.25);
    case 'enemy_in_melee': return enemies.some(e => distance(self, e) <= 1);
    case 'enemy_in_range': return enemies.some(e => distance(self, e) <= (self.preferredRange ?? 6));
    case 'no_buff_on_ally': return allies.some(a => !a.statuses || a.statuses.length === 0);
  }
}

function selectAbility(
  self: AIState,
  allies: AITarget[],
  enemies: AITarget[],
): AIAbilityEntry | null {
  if (!self.abilities?.length) return null;
  const candidates: AIAbilityEntry[] = [];
  for (const entry of self.abilities) {
    const trigger = entry.trigger ?? 'default';
    if (checkTrigger(trigger, self, allies, enemies)) {
      candidates.push(entry);
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return candidates[0];
}

function nearestEnemy(self: AIState, enemies: AITarget[]): AITarget | null {
  if (!enemies.length) return null;
  let best = enemies[0];
  let bestDist = distance(self, best);
  for (let i = 1; i < enemies.length; i++) {
    const d = distance(self, enemies[i]);
    if (d < bestDist) { best = enemies[i]; bestDist = d; }
  }
  return best;
}

export function decideAction(
  self: AIState,
  allies: AITarget[],
  enemies: AITarget[],
  abilityDefs?: Record<string, CombatAbilityDef>,
): AIDecision {
  if (!enemies.length) return { action: 'wait', reason: 'no_enemies' };

  const nearest = nearestEnemy(self, enemies)!;
  const dist = distance(self, nearest);

  switch (self.profile) {
    case 'basic':
      return decideBasic(self, allies, enemies, nearest, dist, abilityDefs);
    case 'ranged':
      return decideRanged(self, allies, enemies, nearest, dist, abilityDefs);
    case 'support':
      return decideSupport(self, allies, enemies, nearest, dist, abilityDefs);
    default:
      return decideBasic(self, allies, enemies, nearest, dist, abilityDefs);
  }
}

function decideBasic(
  self: AIState,
  allies: AITarget[],
  enemies: AITarget[],
  nearest: AITarget,
  dist: number,
  abilityDefs?: Record<string, CombatAbilityDef>,
): AIDecision {
  const ability = selectAbility(self, allies, enemies);
  if (ability && abilityDefs?.[ability.abilityId]) {
    const def = abilityDefs[ability.abilityId];
    const range = def.range === 'melee' ? 1 : (typeof def.range === 'number' ? def.range : 1);
    if (dist <= range) {
      return { action: 'ability', abilityId: ability.abilityId, reason: 'ability_in_range' };
    }
  }

  if (dist <= 1) {
    return { action: 'attack', reason: 'melee_range' };
  }

  return { action: 'move', moveToward: { tx: nearest.tx, ty: nearest.ty }, reason: 'close_gap' };
}

function decideRanged(
  self: AIState,
  allies: AITarget[],
  enemies: AITarget[],
  nearest: AITarget,
  dist: number,
  abilityDefs?: Record<string, CombatAbilityDef>,
): AIDecision {
  const preferred = self.preferredRange ?? 6;

  const ability = selectAbility(self, allies, enemies);
  if (ability && abilityDefs?.[ability.abilityId]) {
    const def = abilityDefs[ability.abilityId];
    const range = def.range === 'melee' ? 1 : (typeof def.range === 'number' ? def.range : preferred);
    if (dist <= range) {
      return { action: 'ability', abilityId: ability.abilityId, reason: 'ranged_ability' };
    }
  }

  if (dist <= 1) {
    const awayTx = self.tx + (self.tx - nearest.tx);
    const awayTy = self.ty + (self.ty - nearest.ty);
    return { action: 'move', moveToward: { tx: awayTx, ty: awayTy }, reason: 'flee_melee' };
  }

  if (dist > preferred) {
    return { action: 'move', moveToward: { tx: nearest.tx, ty: nearest.ty }, reason: 'close_to_range' };
  }

  return { action: 'attack', reason: 'fallback_attack' };
}

function decideSupport(
  self: AIState,
  allies: AITarget[],
  enemies: AITarget[],
  nearest: AITarget,
  dist: number,
  abilityDefs?: Record<string, CombatAbilityDef>,
): AIDecision {
  const hurtAlly = allies.find(a => a.hp / a.maxHp < 0.5);
  if (hurtAlly) {
    const healAbility = self.abilities?.find(a => {
      const def = abilityDefs?.[a.abilityId];
      return def && (def as Record<string, unknown>).healTarget;
    });
    if (healAbility) {
      return { action: 'ability', abilityId: healAbility.abilityId, reason: 'heal_ally' };
    }
  }

  const ability = selectAbility(self, allies, enemies);
  if (ability) {
    return { action: 'ability', abilityId: ability.abilityId, reason: 'support_ability' };
  }

  if (dist <= 1) {
    const preferred = self.preferredRange ?? 4;
    const awayTx = self.tx + (self.tx - nearest.tx);
    const awayTy = self.ty + (self.ty - nearest.ty);
    if (preferred > 1) {
      return { action: 'move', moveToward: { tx: awayTx, ty: awayTy }, reason: 'flee_melee_support' };
    }
  }

  if (dist <= 1) {
    return { action: 'attack', reason: 'melee_fallback' };
  }

  return { action: 'move', moveToward: { tx: nearest.tx, ty: nearest.ty }, reason: 'close_for_attack' };
}
