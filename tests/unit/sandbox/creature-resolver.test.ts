import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { resolveCreature, resolveAllCreatures } from '../../../src/systems/creature-resolver.ts';
import type { CreatureDef } from '../../../src/systems/creature-resolver.ts';

const registry: Record<string, CreatureDef> = {
  goblin: {
    type: 'goblin',
    name: 'Goblin',
    hp: 7,
    ac: 13,
    speed: 2,
    sight: 5,
    fov: 120,
    xp: 25,
    level: 1,
    stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    attack: { weaponId: 'shortsword', dice: '1d6', range: 1 },
    ai: { profile: 'basic' },
    skillProficiencies: ['stealth'],
  },
  goblin_archer: {
    extends: 'goblin',
    name: 'Goblin Archer',
    attack: { weaponId: 'shortbow', dice: '1d6', range: 6 },
    ai: { profile: 'ranged', preferredRange: 6 },
    skillProficiencies: ['stealth', 'perception'],
  },
  goblin_shaman: {
    extends: 'goblin',
    name: 'Goblin Shaman',
    hp: 12,
    ac: 12,
    stats: { str: 6, dex: 14, con: 10, int: 14, wis: 12, cha: 12 },
    ai: { profile: 'support', preferredRange: 4 },
    abilities: ['firebolt', 'cure_wounds'],
  },
  goblin_boss: {
    extends: 'goblin',
    name: 'Goblin Boss',
    hp: 21,
    ac: 15,
    xp: 100,
    abilities: ['multiattack'],
    resistances: ['poison'],
  },
  // multi-level chain
  elite_goblin_boss: {
    extends: 'goblin_boss',
    name: 'Elite Goblin Boss',
    hp: 40,
    resistances: ['poison', 'cold'],
  },
};

// ── 1. Basic resolution ──

describe('basic resolution', () => {
  test('creature without extends returns itself', () => {
    const r = resolveCreature('goblin', registry)!;
    assert.equal(r.name, 'Goblin');
    assert.equal(r.hp, 7);
    assert.equal(r.id, 'goblin');
    assert.equal(r.extends, undefined);
  });

  test('returns null for unknown id', () => {
    assert.equal(resolveCreature('nonexistent', registry), null);
  });
});

// ── 2. Single-level inheritance ──

describe('single-level inheritance', () => {
  test('goblin_archer inherits goblin fields', () => {
    const r = resolveCreature('goblin_archer', registry)!;
    assert.equal(r.name, 'Goblin Archer');
    assert.equal(r.hp, 7);
    assert.equal(r.ac, 13);
    assert.equal(r.speed, 2);
    assert.equal(r.xp, 25);
  });

  test('child overrides parent fields', () => {
    const r = resolveCreature('goblin_shaman', registry)!;
    assert.equal(r.hp, 12);
    assert.equal(r.ac, 12);
  });

  test('nested objects are deep-merged', () => {
    const r = resolveCreature('goblin_archer', registry)!;
    assert.equal((r.attack as Record<string, unknown>).weaponId, 'shortbow');
    assert.equal((r.attack as Record<string, unknown>).range, 6);
  });

  test('ai profile is deep-merged', () => {
    const r = resolveCreature('goblin_archer', registry)!;
    assert.equal((r.ai as Record<string, unknown>).profile, 'ranged');
    assert.equal((r.ai as Record<string, unknown>).preferredRange, 6);
  });

  test('arrays are replaced, not merged', () => {
    const r = resolveCreature('goblin_archer', registry)!;
    assert.deepEqual(r.skillProficiencies, ['stealth', 'perception']);
  });

  test('child-only fields are added', () => {
    const r = resolveCreature('goblin_boss', registry)!;
    assert.deepEqual(r.abilities, ['multiattack']);
    assert.deepEqual(r.resistances, ['poison']);
  });

  test('stats deep-merge overrides individual keys', () => {
    const r = resolveCreature('goblin_shaman', registry)!;
    const stats = r.stats as Record<string, number>;
    assert.equal(stats.str, 6);
    assert.equal(stats.int, 14);
    assert.equal(stats.wis, 12);
    assert.equal(stats.dex, 14);
  });
});

// ── 3. Multi-level chain ──

describe('multi-level inheritance', () => {
  test('elite_goblin_boss chains goblin_boss → goblin', () => {
    const r = resolveCreature('elite_goblin_boss', registry)!;
    assert.equal(r.name, 'Elite Goblin Boss');
    assert.equal(r.hp, 40);
    assert.equal(r.ac, 15);
    assert.equal(r.xp, 100);
    assert.equal(r.speed, 2);
    assert.equal(r.sight, 5);
  });

  test('chain overrides accumulate (child wins)', () => {
    const r = resolveCreature('elite_goblin_boss', registry)!;
    assert.deepEqual(r.resistances, ['poison', 'cold']);
  });
});

// ── 4. Edge cases ──

describe('edge cases', () => {
  test('missing parent logs warning and resolves what it can', () => {
    const broken: Record<string, CreatureDef> = {
      orphan: { extends: 'nonexistent', name: 'Orphan', hp: 5 },
    };
    const r = resolveCreature('orphan', broken)!;
    assert.equal(r.name, 'Orphan');
    assert.equal(r.hp, 5);
  });

  test('circular reference stops at maxDepth', () => {
    const circular: Record<string, CreatureDef> = {
      a: { extends: 'b', name: 'A' },
      b: { extends: 'a', name: 'B' },
    };
    const r = resolveCreature('a', circular, 5)!;
    assert.ok(r);
    assert.equal(r.id, 'a');
  });

  test('extends field is removed from resolved', () => {
    const r = resolveCreature('goblin_archer', registry)!;
    assert.equal(r.extends, undefined);
    assert.equal('extends' in r, false);
  });
});

// ── 5. Batch resolution ──

describe('resolveAllCreatures', () => {
  test('resolves all creatures in registry', () => {
    const all = resolveAllCreatures(registry);
    assert.equal(Object.keys(all).length, 5);
    assert.equal(all.goblin.name, 'Goblin');
    assert.equal(all.goblin_archer.name, 'Goblin Archer');
    assert.equal(all.goblin_shaman.name, 'Goblin Shaman');
    assert.equal(all.goblin_boss.name, 'Goblin Boss');
    assert.equal(all.elite_goblin_boss.name, 'Elite Goblin Boss');
  });

  test('all resolved have id set and no extends', () => {
    const all = resolveAllCreatures(registry);
    for (const [id, def] of Object.entries(all)) {
      assert.equal(def.id, id);
      assert.equal(def.extends, undefined);
    }
  });
});
