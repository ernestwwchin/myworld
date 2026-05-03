import { describe, test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { BoostRunner, recalcBoosts, clearBoostCache } from '../../../src/systems/boost-runner.ts';
import type { BoostSceneAdapter } from '../../../src/systems/boost-runner.ts';
import type { Actor, StatusEffect } from '../../../src/types/actors.ts';

function mockScene(): BoostSceneAdapter & {
  effects: Map<Actor, StatusEffect[]>;
  stats: Record<string, { hp: number; maxHp: number }>;
} {
  const effects = new Map<Actor, StatusEffect[]>();
  const stats: Record<string, { hp: number; maxHp: number }> = {
    player: { hp: 30, maxHp: 30 },
    enemy: { hp: 20, maxHp: 20 },
  };

  return {
    effects,
    stats,
    actorEffects(actor) {
      if (!effects.has(actor)) effects.set(actor, []);
      return effects.get(actor)!;
    },
    getActorHP(actor) {
      const key = actor === 'player' ? 'player' : 'enemy';
      return stats[key]?.hp ?? 10;
    },
    getActorMaxHP(actor) {
      const key = actor === 'player' ? 'player' : 'enemy';
      return stats[key]?.maxHp ?? 10;
    },
  };
}

const enemy = (): Actor => ({
  hp: 20, maxHp: 20, tx: 3, ty: 4, sight: 5, alive: true, type: 'goblin',
});

let scene: ReturnType<typeof mockScene>;

beforeEach(() => {
  scene = mockScene();
  clearBoostCache();
});

// ── 1. Stat modifiers ──

describe('stat modifiers', () => {
  test('ac adds to derived AC', () => {
    const r = new BoostRunner('player', scene);
    r.ac(2);
    r.ac(1);
    assert.equal(r.result().ac, 3);
  });

  test('ability score modifiers accumulate', () => {
    const r = new BoostRunner('player', scene);
    r.str(2);
    r.dex(-1);
    r.con(3);
    r.wis(1);
    r.int_(2);
    r.cha(-2);
    const d = r.result();
    assert.equal(d.str, 2);
    assert.equal(d.dex, -1);
    assert.equal(d.con, 3);
    assert.equal(d.wis, 1);
    assert.equal(d.int, 2);
    assert.equal(d.cha, -2);
  });

  test('maxHp and damage modifiers', () => {
    const r = new BoostRunner('player', scene);
    r.maxHp(10);
    r.damage(3);
    assert.equal(r.result().maxHp, 10);
    assert.equal(r.result().damage, 3);
  });

  test('movement additive and multiplicative', () => {
    const r = new BoostRunner('player', scene);
    r.movement(2);
    r.multiplyMovement(2);
    const d = r.result();
    assert.equal(d.movement, 2);
    assert.equal(d.movementMultiplier, 2);
  });

  test('save and saveAll', () => {
    const r = new BoostRunner('player', scene);
    r.save('dex', 2);
    r.save('dex', 1);
    r.saveAll(3);
    const d = r.result();
    assert.equal(d.saves.dex, 3);
    assert.equal(d.saveAll, 3);
  });
});

// ── 2. Advantage / Disadvantage ──

describe('advantage and disadvantage', () => {
  test('advantage adds to set', () => {
    const r = new BoostRunner('player', scene);
    r.advantage('attacks');
    r.advantage('save_dex');
    assert.ok(r.result().advantages.has('attacks'));
    assert.ok(r.result().advantages.has('save_dex'));
  });

  test('disadvantage adds to set', () => {
    const r = new BoostRunner('player', scene);
    r.disadvantage('attacks');
    assert.ok(r.result().disadvantages.has('attacks'));
  });

  test('both advantage and disadvantage can coexist', () => {
    const r = new BoostRunner('player', scene);
    r.advantage('attacks');
    r.disadvantage('attacks');
    assert.ok(r.result().advantages.has('attacks'));
    assert.ok(r.result().disadvantages.has('attacks'));
  });
});

// ── 3. Special modifiers ──

describe('special modifiers', () => {
  test('autoFail adds to set', () => {
    const r = new BoostRunner('player', scene);
    r.autoFail('save_str');
    r.autoFail('save_dex');
    assert.ok(r.result().autoFails.has('save_str'));
    assert.ok(r.result().autoFails.has('save_dex'));
  });

  test('immunity, resistance, vulnerability', () => {
    const r = new BoostRunner('player', scene);
    r.immunity('fire');
    r.resistance('cold');
    r.vulnerability('lightning');
    assert.ok(r.result().immunities.has('fire'));
    assert.ok(r.result().resistances.has('cold'));
    assert.ok(r.result().vulnerabilities.has('lightning'));
  });
});

// ── 4. Check functions ──

describe('check functions', () => {
  test('hasHpBelow checks percentage', () => {
    scene.stats.player.hp = 8;
    scene.stats.player.maxHp = 20;
    const r = new BoostRunner('player', scene);
    assert.equal(r.hasHpBelow(50), true);
    assert.equal(r.hasHpBelow(30), false);
  });

  test('hasStatus checks effects', () => {
    const r = new BoostRunner('player', scene);
    assert.equal(r.hasStatus('burning'), false);
    scene.actorEffects('player').push({ id: 'burning', duration: 2, trigger: 'turn_start' } as StatusEffect);
    assert.equal(r.hasStatus('burning'), true);
  });

  test('stacks returns count', () => {
    const r = new BoostRunner('player', scene);
    const fx = scene.actorEffects('player');
    fx.push({ id: 'bleeding', duration: 3, trigger: 'turn_start' } as StatusEffect);
    fx.push({ id: 'bleeding', duration: 3, trigger: 'turn_start' } as StatusEffect);
    assert.equal(r.stacks('bleeding'), 2);
  });
});

// ── 5. Eval+call execution ──

describe('eval+call via boosts string', () => {
  test('recalcBoosts runs status boost strings', () => {
    const fx = scene.actorEffects('player');
    fx.push({ id: 'haste', duration: 10, trigger: 'turn_start', boosts: 'ac(2)\nmultiplyMovement(2)' } as unknown as StatusEffect);
    const d = recalcBoosts('player', scene);
    assert.equal(d.ac, 2);
    assert.equal(d.movementMultiplier, 2);
  });

  test('recalcBoosts runs equipment boost strings', () => {
    const actor = enemy() as Record<string, unknown>;
    actor.equipment = [{ boosts: 'ac(1)\nresistance("fire")' }];
    scene.effects.set(actor as unknown as Actor, []);
    const d = recalcBoosts(actor as unknown as Actor, scene);
    assert.equal(d.ac, 1);
    assert.ok(d.resistances.has('fire'));
  });

  test('multiple statuses stack additively', () => {
    const fx = scene.actorEffects('player');
    fx.push({ id: 'shield', duration: 1, trigger: 'turn_start', boosts: 'ac(5)' } as unknown as StatusEffect);
    fx.push({ id: 'barkskin', duration: 5, trigger: 'turn_start', boosts: 'ac(2)' } as unknown as StatusEffect);
    const d = recalcBoosts('player', scene);
    assert.equal(d.ac, 7);
  });

  test('status and equipment boosts combine', () => {
    const actor = enemy() as Record<string, unknown>;
    scene.effects.set(actor as unknown as Actor, [
      { id: 'blessed', duration: 3, trigger: 'turn_start', boosts: 'damage(2)' } as unknown as StatusEffect,
    ]);
    actor.equipment = [{ boosts: 'damage(1)' }];
    const d = recalcBoosts(actor as unknown as Actor, scene);
    assert.equal(d.damage, 3);
  });

  test('recalcBoosts stores result on actor.derived', () => {
    const actor = enemy() as Record<string, unknown>;
    scene.effects.set(actor as unknown as Actor, [
      { id: 'haste', duration: 10, trigger: 'turn_start', boosts: 'movement(3)' } as unknown as StatusEffect,
    ]);
    recalcBoosts(actor as unknown as Actor, scene);
    const derived = actor.derived as { movement: number };
    assert.equal(derived.movement, 3);
  });

  test('bad boost string does not crash', () => {
    const fx = scene.actorEffects('player');
    fx.push({ id: 'buggy', duration: 1, trigger: 'turn_start', boosts: 'if (' } as unknown as StatusEffect);
    assert.doesNotThrow(() => recalcBoosts('player', scene));
  });

  test('runtime error in boost string does not crash', () => {
    const fx = scene.actorEffects('player');
    fx.push({ id: 'bad', duration: 1, trigger: 'turn_start', boosts: 'throw new Error("boom")' } as unknown as StatusEffect);
    assert.doesNotThrow(() => recalcBoosts('player', scene));
  });
});

// ── 6. Haste/poisoned YAML patterns ──

describe('YAML status patterns', () => {
  test('haste: ac(2) + multiplyMovement(2) + advantage(save_dex)', () => {
    const fx = scene.actorEffects('player');
    fx.push({
      id: 'haste', duration: 10, trigger: 'turn_start',
      boosts: 'ac(2)\nmultiplyMovement(2)\nadvantage("save_dex")',
    } as unknown as StatusEffect);
    const d = recalcBoosts('player', scene);
    assert.equal(d.ac, 2);
    assert.equal(d.movementMultiplier, 2);
    assert.ok(d.advantages.has('save_dex'));
  });

  test('poisoned: disadvantage(attacks) + disadvantage(ability_checks)', () => {
    const fx = scene.actorEffects('player');
    fx.push({
      id: 'poisoned', duration: 3, trigger: 'turn_start',
      boosts: 'disadvantage("attacks")\ndisadvantage("ability_checks")',
    } as unknown as StatusEffect);
    const d = recalcBoosts('player', scene);
    assert.ok(d.disadvantages.has('attacks'));
    assert.ok(d.disadvantages.has('ability_checks'));
  });

  test('paralyzed: autoFail(save_str) + autoFail(save_dex)', () => {
    const fx = scene.actorEffects('player');
    fx.push({
      id: 'paralyzed', duration: 1, trigger: 'turn_start',
      boosts: 'autoFail("save_str")\nautoFail("save_dex")',
    } as unknown as StatusEffect);
    const d = recalcBoosts('player', scene);
    assert.ok(d.autoFails.has('save_str'));
    assert.ok(d.autoFails.has('save_dex'));
  });

  test('restrained: movement(-99) + disadvantage(attacks) + disadvantage(save_dex)', () => {
    const fx = scene.actorEffects('player');
    fx.push({
      id: 'restrained', duration: 1, trigger: 'turn_start',
      boosts: 'movement(-99)\ndisadvantage("attacks")\ndisadvantage("save_dex")',
    } as unknown as StatusEffect);
    const d = recalcBoosts('player', scene);
    assert.equal(d.movement, -99);
    assert.ok(d.disadvantages.has('attacks'));
    assert.ok(d.disadvantages.has('save_dex'));
  });
});
