import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { decideAction } from '../../../src/systems/ai-profiles.ts';
import type { AIState, AITarget } from '../../../src/systems/ai-profiles.ts';
import type { CombatAbilityDef } from '../../../src/systems/combat-abilities.ts';

function basicEnemy(overrides?: Partial<AIState>): AIState {
  return { profile: 'basic', hp: 20, maxHp: 20, tx: 5, ty: 5, ...overrides };
}

function rangedEnemy(overrides?: Partial<AIState>): AIState {
  return { profile: 'ranged', hp: 20, maxHp: 20, tx: 5, ty: 5, preferredRange: 6, ...overrides };
}

function supportEnemy(overrides?: Partial<AIState>): AIState {
  return { profile: 'support', hp: 20, maxHp: 20, tx: 5, ty: 5, preferredRange: 4, ...overrides };
}

function target(overrides?: Partial<AITarget>): AITarget {
  return { hp: 30, maxHp: 30, tx: 6, ty: 5, ...overrides };
}

// ── 1. Basic profile ──

describe('basic profile', () => {
  test('attacks when in melee range', () => {
    const self = basicEnemy({ tx: 5, ty: 5 });
    const enemies = [target({ tx: 6, ty: 5 })];
    const d = decideAction(self, [], enemies);
    assert.equal(d.action, 'attack');
    assert.equal(d.reason, 'melee_range');
  });

  test('moves toward enemy when out of range', () => {
    const self = basicEnemy({ tx: 0, ty: 0 });
    const enemies = [target({ tx: 5, ty: 5 })];
    const d = decideAction(self, [], enemies);
    assert.equal(d.action, 'move');
    assert.equal(d.reason, 'close_gap');
    assert.deepEqual(d.moveToward, { tx: 5, ty: 5 });
  });

  test('uses ability if in range and trigger matches', () => {
    const self = basicEnemy({
      tx: 5, ty: 5,
      abilities: [{ abilityId: 'cleave', priority: 10 }],
    });
    const enemies = [target({ tx: 6, ty: 5 })];
    const defs: Record<string, CombatAbilityDef> = {
      cleave: { name: 'Cleave', type: 'action', range: 'melee' },
    };
    const d = decideAction(self, [], enemies, defs);
    assert.equal(d.action, 'ability');
    assert.equal(d.abilityId, 'cleave');
  });

  test('waits if no enemies', () => {
    const self = basicEnemy();
    const d = decideAction(self, [], []);
    assert.equal(d.action, 'wait');
  });
});

// ── 2. Ranged profile ──

describe('ranged profile', () => {
  test('uses ranged ability at preferred range', () => {
    const self = rangedEnemy({
      tx: 0, ty: 0,
      abilities: [{ abilityId: 'arrow', priority: 10 }],
    });
    const enemies = [target({ tx: 5, ty: 0 })];
    const defs: Record<string, CombatAbilityDef> = {
      arrow: { name: 'Arrow', type: 'action', range: 8 },
    };
    const d = decideAction(self, [], enemies, defs);
    assert.equal(d.action, 'ability');
    assert.equal(d.abilityId, 'arrow');
  });

  test('flees when enemy is in melee', () => {
    const self = rangedEnemy({ tx: 5, ty: 5 });
    const enemies = [target({ tx: 6, ty: 5 })];
    const d = decideAction(self, [], enemies);
    assert.equal(d.action, 'move');
    assert.equal(d.reason, 'flee_melee');
  });

  test('moves closer when enemy is beyond preferred range', () => {
    const self = rangedEnemy({ tx: 0, ty: 0, preferredRange: 6 });
    const enemies = [target({ tx: 10, ty: 0 })];
    const d = decideAction(self, [], enemies);
    assert.equal(d.action, 'move');
    assert.equal(d.reason, 'close_to_range');
  });

  test('falls back to attack at medium range with no ability', () => {
    const self = rangedEnemy({ tx: 0, ty: 0 });
    const enemies = [target({ tx: 4, ty: 0 })];
    const d = decideAction(self, [], enemies);
    assert.equal(d.action, 'attack');
    assert.equal(d.reason, 'fallback_attack');
  });
});

// ── 3. Support profile ──

describe('support profile', () => {
  test('uses ability from list when available', () => {
    const self = supportEnemy({
      abilities: [{ abilityId: 'buff', trigger: 'default', priority: 5 }],
    });
    const enemies = [target({ tx: 8, ty: 5 })];
    const d = decideAction(self, [], enemies);
    assert.equal(d.action, 'ability');
    assert.equal(d.abilityId, 'buff');
  });

  test('flees melee when preferredRange > 1', () => {
    const self = supportEnemy({ tx: 5, ty: 5 });
    const enemies = [target({ tx: 6, ty: 5 })];
    const d = decideAction(self, [], enemies);
    assert.equal(d.action, 'move');
    assert.equal(d.reason, 'flee_melee_support');
  });

  test('moves toward enemy when out of range and no abilities', () => {
    const self = supportEnemy({ tx: 0, ty: 0, abilities: [] });
    const enemies = [target({ tx: 10, ty: 10 })];
    const d = decideAction(self, [], enemies);
    assert.equal(d.action, 'move');
    assert.equal(d.reason, 'close_for_attack');
  });
});

// ── 4. Trigger conditions ──

describe('trigger conditions', () => {
  test('self_below_50pct triggers when hurt', () => {
    const self = basicEnemy({
      hp: 8, maxHp: 20,
      abilities: [{ abilityId: 'heal_self', trigger: 'self_below_50pct', priority: 20 }],
    });
    const enemies = [target({ tx: 6, ty: 5 })];
    const defs: Record<string, CombatAbilityDef> = {
      heal_self: { name: 'Heal Self', type: 'action', range: 'melee' },
    };
    const d = decideAction(self, [], enemies, defs);
    assert.equal(d.action, 'ability');
    assert.equal(d.abilityId, 'heal_self');
  });

  test('self_below_50pct does not trigger at full HP', () => {
    const self = basicEnemy({
      hp: 20, maxHp: 20,
      abilities: [{ abilityId: 'heal_self', trigger: 'self_below_50pct', priority: 20 }],
    });
    const enemies = [target({ tx: 6, ty: 5 })];
    const d = decideAction(self, [], enemies);
    assert.equal(d.action, 'attack');
  });

  test('ally_below_50pct triggers when ally hurt', () => {
    const self = supportEnemy({
      abilities: [{ abilityId: 'heal_ally', trigger: 'ally_below_50pct', priority: 15 }],
    });
    const allies = [{ hp: 5, maxHp: 20, tx: 4, ty: 5, isAlly: true }];
    const enemies = [target({ tx: 8, ty: 5 })];
    const d = decideAction(self, allies, enemies);
    assert.equal(d.action, 'ability');
    assert.equal(d.abilityId, 'heal_ally');
  });

  test('enemy_in_melee triggers at distance 1', () => {
    const self = basicEnemy({
      abilities: [{ abilityId: 'cleave', trigger: 'enemy_in_melee', priority: 10 }],
    });
    const enemies = [target({ tx: 6, ty: 5 })];
    const defs: Record<string, CombatAbilityDef> = {
      cleave: { name: 'Cleave', type: 'action', range: 'melee' },
    };
    const d = decideAction(self, [], enemies, defs);
    assert.equal(d.action, 'ability');
    assert.equal(d.abilityId, 'cleave');
  });

  test('no_buff_on_ally triggers when ally has no statuses', () => {
    const self = supportEnemy({
      abilities: [{ abilityId: 'bless', trigger: 'no_buff_on_ally', priority: 10 }],
    });
    const allies = [{ hp: 20, maxHp: 20, tx: 4, ty: 5, isAlly: true, statuses: [] }];
    const enemies = [target({ tx: 8, ty: 5 })];
    const d = decideAction(self, allies, enemies);
    assert.equal(d.action, 'ability');
    assert.equal(d.abilityId, 'bless');
  });

  test('priority selects highest-priority matching ability', () => {
    const self = basicEnemy({
      tx: 5, ty: 5,
      abilities: [
        { abilityId: 'weak_hit', trigger: 'default', priority: 5 },
        { abilityId: 'strong_hit', trigger: 'default', priority: 15 },
        { abilityId: 'medium_hit', trigger: 'default', priority: 10 },
      ],
    });
    const enemies = [target({ tx: 6, ty: 5 })];
    const defs: Record<string, CombatAbilityDef> = {
      weak_hit: { name: 'Weak', type: 'action', range: 'melee' },
      strong_hit: { name: 'Strong', type: 'action', range: 'melee' },
      medium_hit: { name: 'Medium', type: 'action', range: 'melee' },
    };
    const d = decideAction(self, [], enemies, defs);
    assert.equal(d.abilityId, 'strong_hit');
  });
});
