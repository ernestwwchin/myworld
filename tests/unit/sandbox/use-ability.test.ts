import { describe, test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { useAbility } from '../../../src/systems/use-ability.ts';
import type { SceneAdapter } from '../../../src/systems/ability-runner.ts';
import type { Actor, StatusEffect } from '../../../src/types/actors.ts';
import { dnd } from '../../../src/config.ts';

function mockScene(): SceneAdapter & {
  calls: { method: string; args: unknown[] }[];
  effects: Map<Actor, StatusEffect[]>;
  flags: Record<string, unknown>;
  stats: Record<string, Record<string, number>>;
} {
  const calls: { method: string; args: unknown[] }[] = [];
  const effects = new Map<Actor, StatusEffect[]>();
  const flags: Record<string, unknown> = {};
  const stats: Record<string, Record<string, number>> = {
    player: { str: 16, dex: 14, con: 12, wis: 10, level: 3, ac: 15, hp: 30, maxHp: 30 },
    enemy: { str: 12, dex: 10, con: 14, wis: 8, level: 2, ac: 13, hp: 20, maxHp: 20 },
  };

  return {
    calls, effects, flags, stats,
    applyDamageToActor(actor, dmg, color, label) {
      calls.push({ method: 'damage', args: [actor, dmg, color, label] });
    },
    applyHealToActor(actor, amount, color, label) {
      calls.push({ method: 'heal', args: [actor, amount, color, label] });
    },
    actorEffects(actor) {
      if (!effects.has(actor)) effects.set(actor, []);
      return effects.get(actor)!;
    },
    showStatus(msg) { calls.push({ method: 'status', args: [msg] }); },
    actorLabel(actor) {
      return actor === 'player' ? 'Player' : ((actor as { type?: string }).type || 'Enemy');
    },
    getActorStat(actor, stat) {
      const key = actor === 'player' ? 'player' : 'enemy';
      return stats[key]?.[stat] ?? 10;
    },
    getActorAC(actor) {
      const key = actor === 'player' ? 'player' : 'enemy';
      return stats[key]?.ac ?? 10;
    },
    getActorHP(actor) {
      const key = actor === 'player' ? 'player' : 'enemy';
      return stats[key]?.hp ?? 10;
    },
    getActorMaxHP(actor) {
      const key = actor === 'player' ? 'player' : 'enemy';
      return stats[key]?.maxHp ?? 10;
    },
    setFlag(name, value) { flags[name] = value; },
    getFlag(name) { return flags[name]; },
  };
}

function mockDnd(fixedD20 = 15) {
  return {
    roll: (_n: number, _d: number) => fixedD20,
    mod: dnd.mod,
    rollDamageSpec: (spec: unknown, crit = false) => {
      return { total: dnd.rollDamageSpec(spec as Parameters<typeof dnd.rollDamageSpec>[0], crit).total };
    },
    profBonus: dnd.profBonus,
  };
}

const enemy = (): Actor => ({
  hp: 20, maxHp: 20, tx: 3, ty: 4, sight: 5, alive: true, type: 'goblin',
});

let scene: ReturnType<typeof mockScene>;
let target: Actor;

beforeEach(() => {
  scene = mockScene();
  target = enemy();
});

// ── 1. Basic pipeline ──

describe('basic pipeline', () => {
  test('ability with no roll executes onCast only', () => {
    const dash = {
      name: 'Dash', type: 'action',
      onCast: 'grantResource("movement", 5)',
    };
    const result = useAbility(dash, 'player', target, scene, mockDnd());
    assert.equal(result.executed, true);
    assert.equal(result.hits, null);
    assert.equal(result.aborted, false);
  });

  test('ability with roll + onHit fires onHit when hits', () => {
    const attack = {
      name: 'Attack', type: 'action',
      roll: 'attackRoll("melee")',
      onHit: 'dealDamage("1d8", "slashing")',
      onMiss: 'logMessage("Miss!")',
    };
    const result = useAbility(attack, 'player', target, scene, mockDnd(18));
    assert.equal(result.executed, true);
    assert.equal(result.hits, true);
    assert.ok(scene.calls.some(c => c.method === 'damage'));
    assert.ok(!scene.calls.some(c => c.args[0] === 'Miss!'));
  });

  test('ability with roll + onMiss fires onMiss when misses', () => {
    const attack = {
      name: 'Attack', type: 'action',
      roll: 'attackRoll("melee")',
      onHit: 'dealDamage("1d8", "slashing")',
      onMiss: 'logMessage("Miss!")',
    };
    const result = useAbility(attack, 'player', target, scene, mockDnd(2));
    assert.equal(result.executed, true);
    assert.equal(result.hits, false);
    assert.ok(!scene.calls.some(c => c.method === 'damage'));
    assert.ok(scene.calls.some(c => c.args[0] === 'Miss!'));
  });
});

// ── 2. Condition gate ──

describe('condition gate', () => {
  test('condition that evaluates true proceeds', () => {
    const ability = {
      name: 'Heal', type: 'action',
      condition: 'hasHpBelow(target, 80)',
      onCast: 'regainHitPoints("2d8")',
    };
    scene.stats.enemy.hp = 10;
    const result = useAbility(ability, 'player', target, scene, mockDnd());
    assert.equal(result.executed, true);
    assert.ok(scene.calls.some(c => c.method === 'heal'));
  });

  test('condition that evaluates false aborts', () => {
    const ability = {
      name: 'Heal', type: 'action',
      condition: 'hasHpBelow(target, 10)',
      onCast: 'regainHitPoints("2d8")',
    };
    const result = useAbility(ability, 'player', target, scene, mockDnd());
    assert.equal(result.executed, false);
    assert.equal(result.aborted, true);
    assert.equal(result.reason, 'condition_failed');
    assert.ok(!scene.calls.some(c => c.method === 'heal'));
  });
});

// ── 3. Fireball pattern ──

describe('full ability patterns', () => {
  test('fireball: savingThrow → onHit with damage + status', () => {
    const fireball = {
      name: 'Fireball', type: 'spell',
      roll: 'savingThrow("dex", 15)',
      onHit: 'dealDamage("8d6", "fire")\napplyStatus("burning", 2)',
      onMiss: 'dealDamage("4d6", "fire")',
    };
    const result = useAbility(fireball, 'player', target, scene, mockDnd(5));
    assert.equal(result.hits, true);
    assert.ok(scene.calls.some(c => c.method === 'damage'));
    assert.equal(scene.actorEffects(target).length, 1);
    assert.equal(scene.actorEffects(target)[0].id, 'burning');
  });

  test('fireball: target saves → onMiss half damage', () => {
    const fireball = {
      name: 'Fireball', type: 'spell',
      roll: 'savingThrow("dex", 15)',
      onHit: 'dealDamage("8d6", "fire")\napplyStatus("burning", 2)',
      onMiss: 'dealDamage("4d6", "fire")',
    };
    const result = useAbility(fireball, 'player', target, scene, mockDnd(18));
    assert.equal(result.hits, false);
    assert.ok(scene.calls.some(c => c.method === 'damage'));
    assert.equal(scene.actorEffects(target).length, 0);
  });

  test('dash: onCast only, no roll', () => {
    const dash = {
      name: 'Dash', type: 'action',
      onCast: 'grantResource("movement", 5)',
    };
    const result = useAbility(dash, 'player', target, scene, mockDnd());
    assert.equal(result.executed, true);
    assert.equal(result.hits, null);
  });

  test('hide: self-buff in onCast', () => {
    const hide = {
      name: 'Hide', type: 'action',
      onCast: 'applyStatus(self, "hidden", 1)',
    };
    const result = useAbility(hide, 'player', target, scene, mockDnd());
    assert.equal(result.executed, true);
    assert.equal(scene.actorEffects('player').length, 1);
    assert.equal(scene.actorEffects('player')[0].id, 'hidden');
  });

  test('disengage: onCast applies disengaged to self', () => {
    const disengage = {
      name: 'Disengage', type: 'bonusAction',
      onCast: 'applyStatus(self, "disengaged", 1)',
    };
    useAbility(disengage, 'player', target, scene, mockDnd());
    assert.equal(scene.actorEffects('player')[0].id, 'disengaged');
  });
});

// ── 4. Roll result propagation ──

describe('roll result propagation', () => {
  test('rollResult is returned in result', () => {
    const attack = {
      name: 'Attack', type: 'action',
      roll: 'attackRoll("melee")',
      onHit: 'dealDamage("1d8", "slashing")',
    };
    const result = useAbility(attack, 'player', target, scene, mockDnd(15));
    assert.ok(result.rollResult);
    assert.equal(result.rollResult!.d20, 15);
    assert.equal(result.rollResult!.dc, 13);
  });

  test('crit d20=20 is flagged in result', () => {
    const attack = {
      name: 'Attack', type: 'action',
      roll: 'attackRoll("melee")',
      onHit: 'dealDamage("1d8", "slashing")',
    };
    const result = useAbility(attack, 'player', target, scene, mockDnd(20));
    assert.equal(result.rollResult!.crit, true);
    assert.equal(result.hits, true);
  });

  test('fumble d20=1 is flagged in result', () => {
    const attack = {
      name: 'Attack', type: 'action',
      roll: 'attackRoll("melee")',
      onMiss: 'logMessage("Fumble!")',
    };
    const result = useAbility(attack, 'player', target, scene, mockDnd(1));
    assert.equal(result.rollResult!.fumble, true);
    assert.equal(result.hits, false);
  });
});

// ── 5. Edge cases ──

describe('edge cases', () => {
  test('ability with no slots is a no-op that succeeds', () => {
    const noop = { name: 'Nothing', type: 'action' };
    const result = useAbility(noop, 'player', target, scene, mockDnd());
    assert.equal(result.executed, true);
    assert.equal(result.hits, null);
    assert.equal(scene.calls.length, 0);
  });

  test('bad roll string does not crash', () => {
    const bad = {
      name: 'Bad', type: 'action',
      roll: 'throw new Error("boom")',
    };
    assert.doesNotThrow(() => {
      useAbility(bad, 'player', target, scene, mockDnd());
    });
  });

  test('ability without onHit still succeeds on hit', () => {
    const rollOnly = {
      name: 'Probe', type: 'action',
      roll: 'attackRoll("melee")',
    };
    const result = useAbility(rollOnly, 'player', target, scene, mockDnd(18));
    assert.equal(result.executed, true);
    assert.equal(result.hits, true);
  });
});
