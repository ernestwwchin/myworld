import { describe, test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { AbilityRunner } from '../../../src/systems/ability-runner.ts';
import type { SceneAdapter, RollResult } from '../../../src/systems/ability-runner.ts';
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
    calls,
    effects,
    flags,
    stats,
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
    showStatus(msg) {
      calls.push({ method: 'status', args: [msg] });
    },
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
    setFlag(name, value) {
      flags[name] = value;
    },
    getFlag(name) {
      return flags[name];
    },
  };
}

function mockDnd(fixedD20 = 15) {
  return {
    roll: (_n: number, _d: number) => fixedD20,
    mod: dnd.mod,
    rollDamageSpec: (spec: unknown, crit = false) => {
      const result = dnd.rollDamageSpec(spec as Parameters<typeof dnd.rollDamageSpec>[0], crit);
      return { total: result.total };
    },
    profBonus: dnd.profBonus,
  };
}

const enemy = (): Actor => ({
  hp: 20,
  maxHp: 20,
  tx: 3,
  ty: 4,
  sight: 5,
  alive: true,
  type: 'goblin',
});

let scene: ReturnType<typeof mockScene>;
let runner: AbilityRunner;
let target: Actor;

beforeEach(() => {
  scene = mockScene();
  runner = new AbilityRunner(scene, mockDnd(10));
  target = enemy();
  runner.setContext({ source: 'player', target });
});

// ── 1. Compile + execute ──

describe('compile and execute', () => {
  test('exec runs logMessage and records status call', () => {
    runner.exec('this.logMessage("hello world")');
    assert.equal(scene.calls.length, 1);
    assert.equal(scene.calls[0].method, 'status');
    assert.equal(scene.calls[0].args[0], 'hello world');
  });

  test('bare call resolves to this.method via fn.call(runner)', () => {
    runner.exec('logMessage("bare call works")');
    assert.equal(scene.calls[0].args[0], 'bare call works');
  });

  test('multiline body executes all lines', () => {
    runner.exec('logMessage("line1")\nlogMessage("line2")');
    assert.equal(scene.calls.length, 2);
    assert.equal(scene.calls[0].args[0], 'line1');
    assert.equal(scene.calls[1].args[0], 'line2');
  });

  test('exec with dealDamage records damage call', () => {
    runner.exec('dealDamage("2d6", "fire")');
    const dmgCall = scene.calls.find(c => c.method === 'damage');
    assert.ok(dmgCall, 'should have recorded a damage call');
    assert.equal(dmgCall.args[0], target);
  });
});

// ── 2. dealDamage routing ──

describe('dealDamage', () => {
  test('dealDamage(dice, type) targets this.target', () => {
    runner.dealDamage('1d6', 'fire');
    const call = scene.calls.find(c => c.method === 'damage')!;
    assert.equal(call.args[0], target);
    assert.ok((call.args[1] as number) > 0);
    assert.ok((call.args[2] as string).startsWith('#'));
  });

  test('dealDamage(self, dice, type) targets this.source', () => {
    runner.dealDamage(runner.self, '1d4', 'necrotic');
    const call = scene.calls.find(c => c.method === 'damage')!;
    assert.equal(call.args[0], 'player');
  });

  test('dealDamage with enemy actor redirects to that actor', () => {
    const other = enemy();
    runner.dealDamage(other, '1d8', 'cold');
    const call = scene.calls.find(c => c.method === 'damage')!;
    assert.equal(call.args[0], other);
  });

  test('dealWeaponDamage uses source weapon', () => {
    const src = { hp: 30, maxHp: 30, tx: 0, ty: 0, sight: 5, alive: true, type: 'fighter',
      weapon: { damageDice: '1d8', damageType: 'slashing' } };
    runner.setContext({ source: src as Actor, target });
    runner.dealWeaponDamage();
    const call = scene.calls.find(c => c.method === 'damage')!;
    assert.equal(call.args[0], target);
  });
});

// ── 3. applyStatus / removeStatus ──

describe('applyStatus and removeStatus', () => {
  test('applyStatus(id, dur) adds to target effects', () => {
    runner.applyStatus('burning', 2);
    const fx = scene.actorEffects(target);
    assert.equal(fx.length, 1);
    assert.equal(fx[0].id, 'burning');
    assert.equal(fx[0].duration, 2);
  });

  test('applyStatus(self, id, dur) adds to source effects', () => {
    runner.applyStatus(runner.self, 'blessed', 3);
    const fx = scene.actorEffects('player');
    assert.equal(fx.length, 1);
    assert.equal(fx[0].id, 'blessed');
    assert.equal(fx[0].duration, 3);
  });

  test('removeStatus(id) removes from target', () => {
    runner.applyStatus('poisoned', 5);
    assert.equal(scene.actorEffects(target).length, 1);
    runner.removeStatus('poisoned');
    assert.equal(scene.actorEffects(target).length, 0);
  });

  test('removeStatus(self, id) removes from source', () => {
    runner.applyStatus(runner.self, 'haste', 2);
    assert.equal(scene.actorEffects('player').length, 1);
    runner.removeStatus(runner.self, 'haste');
    assert.equal(scene.actorEffects('player').length, 0);
  });

  test('removeStatus with no matching effect is a no-op', () => {
    const before = scene.calls.length;
    runner.removeStatus('nonexistent');
    assert.equal(scene.actorEffects(target).length, 0);
    assert.equal(scene.calls.length, before);
  });
});

// ── 4. Check functions ──

describe('check functions', () => {
  test('isHit / isMiss reflect this.hits', () => {
    runner.hits = true;
    assert.equal(runner.isHit(), true);
    assert.equal(runner.isMiss(), false);

    runner.hits = false;
    assert.equal(runner.isHit(), false);
    assert.equal(runner.isMiss(), true);
  });

  test('isCrit reflects rollResult.crit', () => {
    assert.equal(runner.isCrit(), false);
    runner.rollResult = { d20: 20, total: 25, dc: 13, crit: true, fumble: false };
    assert.equal(runner.isCrit(), true);
  });

  test('hasStatus checks actor effects', () => {
    assert.equal(runner.hasStatus(target, 'burning'), false);
    runner.applyStatus('burning', 2);
    assert.equal(runner.hasStatus(target, 'burning'), true);
  });

  test('stacks returns count of matching effects', () => {
    assert.equal(runner.stacks(target, 'bleeding'), 0);
    runner.applyStatus('bleeding', 3);
    runner.applyStatus('bleeding', 3);
    assert.equal(runner.stacks(target, 'bleeding'), 2);
  });

  test('hasHpBelow checks percentage threshold', () => {
    scene.stats.enemy.hp = 8;
    scene.stats.enemy.maxHp = 20;
    assert.equal(runner.hasHpBelow(target, 50), true);
    assert.equal(runner.hasHpBelow(target, 30), false);
  });

  test('isDead when hp is 0', () => {
    scene.stats.enemy.hp = 0;
    assert.equal(runner.isDead(target), true);
  });

  test('isDamageType checks context damageType', () => {
    runner.damageType = 'fire';
    assert.equal(runner.isDamageType('fire'), true);
    assert.equal(runner.isDamageType('cold'), false);
  });

  test('isTarget / isSource identify actors', () => {
    assert.equal(runner.isTarget(target), true);
    assert.equal(runner.isTarget('player'), false);
    assert.equal(runner.isSource('player'), true);
    assert.equal(runner.isSource(target), false);
  });
});

// ── 5. Roll functions ──

describe('roll functions', () => {
  test('attackRoll melee: hit when total >= AC', () => {
    const r = new AbilityRunner(scene, mockDnd(15));
    r.setContext({ source: 'player', target });
    r.attackRoll('melee');
    assert.equal(r.hits, true);
    assert.ok(r.rollResult);
    assert.equal(r.rollResult!.d20, 15);
    assert.equal(r.rollResult!.dc, 13);
  });

  test('attackRoll melee: miss when total < AC', () => {
    const r = new AbilityRunner(scene, mockDnd(2));
    r.setContext({ source: 'player', target });
    r.attackRoll('melee');
    assert.equal(r.hits, false);
  });

  test('attackRoll: nat 20 always hits (crit)', () => {
    const r = new AbilityRunner(scene, mockDnd(20));
    r.setContext({ source: 'player', target });
    scene.stats.enemy.ac = 99;
    r.attackRoll('melee');
    assert.equal(r.hits, true);
    assert.equal(r.rollResult!.crit, true);
  });

  test('attackRoll: nat 1 always misses (fumble)', () => {
    const r = new AbilityRunner(scene, mockDnd(1));
    r.setContext({ source: 'player', target });
    scene.stats.enemy.ac = 1;
    r.attackRoll('melee');
    assert.equal(r.hits, false);
    assert.equal(r.rollResult!.fumble, true);
  });

  test('savingThrow: target fails save → hits = true', () => {
    const r = new AbilityRunner(scene, mockDnd(5));
    r.setContext({ source: 'player', target });
    r.savingThrow('dex', 15);
    assert.equal(r.hits, true);
    assert.equal(r.rollResult!.dc, 15);
  });

  test('savingThrow: target passes save → hits = false', () => {
    const r = new AbilityRunner(scene, mockDnd(18));
    r.setContext({ source: 'player', target });
    r.savingThrow('dex', 15);
    assert.equal(r.hits, false);
  });
});

// ── 6. Context isolation ──

describe('context isolation', () => {
  test('resetContext clears all properties', () => {
    runner.hits = true;
    runner.rollResult = { d20: 20, total: 25, dc: 13, crit: true, fumble: false };
    runner.damageType = 'fire';
    runner.ability = { name: 'Fireball', type: 'spell' };

    runner.resetContext();

    assert.equal(runner.hits, false);
    assert.equal(runner.rollResult, null);
    assert.equal(runner.damageType, undefined);
    assert.equal(runner.ability, null);
    assert.equal(runner.source, 'player');
    assert.equal(runner.target, 'player');
    assert.equal(runner.self, 'player');
  });

  test('sequential executions do not bleed state', () => {
    const target2 = enemy();
    (target2 as { type: string }).type = 'orc';

    runner.setContext({ source: 'player', target, hits: true,
      rollResult: { d20: 20, total: 25, dc: 13, crit: true, fumble: false } });
    runner.exec('if (isCrit()) dealDamage("2d6", "fire")');

    const callsAfterFirst = scene.calls.length;

    runner.setContext({ source: 'player', target: target2 });
    assert.equal(runner.hits, false);
    assert.equal(runner.rollResult, null);
    runner.exec('if (isCrit()) dealDamage("2d6", "fire")');

    assert.equal(scene.calls.length, callsAfterFirst,
      'second execution should not fire crit damage');
  });
});

// ── 7. Error handling ──

describe('error handling', () => {
  test('compile returns null on syntax error', () => {
    const fn = runner.compile('if (');
    assert.equal(fn, null);
  });

  test('exec swallows runtime errors', () => {
    assert.doesNotThrow(() => {
      runner.exec('throw new Error("boom")');
    });
  });

  test('exec swallows undefined method calls', () => {
    assert.doesNotThrow(() => {
      runner.exec('nonExistentMethod()');
    });
  });

  test('compile caches results', () => {
    const fn1 = runner.compile('logMessage("cached")');
    const fn2 = runner.compile('logMessage("cached")');
    assert.equal(fn1, fn2);
  });

  test('compile caches null for bad syntax', () => {
    runner.compile('if (');
    const fn2 = runner.compile('if (');
    assert.equal(fn2, null);
  });
});

// ── 8. Integrated YAML-style exec ──

describe('integrated YAML-style execution', () => {
  test('fireball onHit pattern', () => {
    runner.hits = true;
    runner.exec('dealDamage("8d6", "fire")\napplyStatus("burning", 2)');
    const dmg = scene.calls.find(c => c.method === 'damage');
    assert.ok(dmg);
    assert.equal(scene.actorEffects(target).length, 1);
    assert.equal(scene.actorEffects(target)[0].id, 'burning');
  });

  test('conditional crit bonus damage via JS if', () => {
    runner.hits = true;
    runner.rollResult = { d20: 20, total: 25, dc: 13, crit: true, fumble: false };
    runner.exec('dealDamage("2d6", "fire")\nif (isCrit()) dealDamage("2d6", "fire")');
    const dmgCalls = scene.calls.filter(c => c.method === 'damage');
    assert.equal(dmgCalls.length, 2);
  });

  test('status combo check in onHit', () => {
    runner.applyStatus('wet', 3);
    scene.calls.length = 0;
    runner.damageType = 'lightning';
    runner.exec('if (hasStatus(target, "wet")) dealDamage("1d6", "lightning")');
    assert.equal(scene.calls.filter(c => c.method === 'damage').length, 1);
  });

  test('self-buff pattern in onCast', () => {
    runner.exec('applyStatus(self, "haste", 3)\ngrantResource("movement", 5)');
    const fx = scene.actorEffects('player');
    assert.equal(fx.length, 1);
    assert.equal(fx[0].id, 'haste');
  });

  test('regainHitPoints on self', () => {
    runner.exec('regainHitPoints(self, "2d8")');
    const heal = scene.calls.find(c => c.method === 'heal');
    assert.ok(heal);
    assert.equal(heal.args[0], 'player');
  });

  test('setFlag from ability hook', () => {
    runner.exec('setFlag("door_opened", true)');
    assert.equal(scene.flags.door_opened, true);
  });
});
