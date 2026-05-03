import { describe, test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import {
  CORE_COMBAT_ABILITIES,
  getCombatAbility,
  listCombatAbilities,
  getAbilitiesByGroup,
} from '../../../src/systems/combat-abilities.ts';
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
  weapon: { damageDice: '1d8', damageType: 'slashing' },
});

let scene: ReturnType<typeof mockScene>;
let target: Actor;

beforeEach(() => {
  scene = mockScene();
  target = enemy();
});

// ── 1. Registry ──

describe('ability registry', () => {
  test('all 7 core combat abilities are defined', () => {
    const ids = Object.keys(CORE_COMBAT_ABILITIES);
    assert.ok(ids.includes('attack'));
    assert.ok(ids.includes('dash'));
    assert.ok(ids.includes('disengage'));
    assert.ok(ids.includes('hide'));
    assert.ok(ids.includes('flee'));
    assert.ok(ids.includes('dodge'));
    assert.ok(ids.includes('help'));
    assert.equal(ids.length, 7);
  });

  test('getCombatAbility returns def by id', () => {
    const atk = getCombatAbility('attack');
    assert.ok(atk);
    assert.equal(atk!.name, 'Attack');
    assert.equal(atk!.actionCost, 'action');
  });

  test('getCombatAbility returns undefined for unknown', () => {
    assert.equal(getCombatAbility('fireball'), undefined);
  });

  test('listCombatAbilities returns all', () => {
    assert.equal(listCombatAbilities().length, 7);
  });

  test('getAbilitiesByGroup filters by uiGroup', () => {
    const common = getAbilitiesByGroup('common');
    assert.equal(common.length, 7);
  });
});

// ── 2. Attack through useAbility ──

describe('attack via useAbility', () => {
  test('attack hits: deals weapon damage', () => {
    const atk = getCombatAbility('attack')!;
    const result = useAbility(atk, 'player', target, scene, mockDnd(18));
    assert.equal(result.hits, true);
    assert.ok(scene.calls.some(c => c.method === 'damage'));
  });

  test('attack misses: logs miss, no damage', () => {
    const atk = getCombatAbility('attack')!;
    const result = useAbility(atk, 'player', target, scene, mockDnd(2));
    assert.equal(result.hits, false);
    assert.ok(!scene.calls.some(c => c.method === 'damage'));
    assert.ok(scene.calls.some(c => c.args[0] === 'Miss!'));
  });
});

// ── 3. Dash through useAbility ──

describe('dash via useAbility', () => {
  test('dash grants movement resource', () => {
    const dash = getCombatAbility('dash')!;
    const src = { hp: 30, maxHp: 30, tx: 0, ty: 0, sight: 5, alive: true, type: 'player' } as unknown as Actor;
    useAbility(dash, src, target, scene, mockDnd());
    assert.equal((src as Record<string, unknown>).resource_movement, 5);
  });
});

// ── 4. Disengage through useAbility ──

describe('disengage via useAbility', () => {
  test('disengage applies disengaged status to self', () => {
    const dis = getCombatAbility('disengage')!;
    useAbility(dis, 'player', target, scene, mockDnd());
    const fx = scene.actorEffects('player');
    assert.equal(fx.length, 1);
    assert.equal(fx[0].id, 'disengaged');
  });
});

// ── 5. Hide through useAbility ──

describe('hide via useAbility', () => {
  test('hide applies hidden status to self', () => {
    const hide = getCombatAbility('hide')!;
    const result = useAbility(hide, 'player', target, scene, mockDnd());
    assert.equal(result.executed, true);
    assert.equal(result.hits, null);
    assert.equal(scene.actorEffects('player').some(e => e.id === 'hidden'), true);
  });
});

// ── 6. Flee through useAbility ──

describe('flee via useAbility', () => {
  test('flee applies fleeing status to self', () => {
    const flee = getCombatAbility('flee')!;
    useAbility(flee, 'player', target, scene, mockDnd());
    const fx = scene.actorEffects('player');
    assert.equal(fx[0].id, 'fleeing');
  });
});

// ── 7. Dodge through useAbility ──

describe('dodge via useAbility', () => {
  test('dodge applies dodging status to self', () => {
    const dodge = getCombatAbility('dodge')!;
    useAbility(dodge, 'player', target, scene, mockDnd());
    assert.equal(scene.actorEffects('player')[0].id, 'dodging');
  });
});
