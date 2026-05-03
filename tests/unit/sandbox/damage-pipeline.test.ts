import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import {
  resolveDamage,
  hasAdvantageOnRoll,
  isAutoFail,
  getSaveBonus,
  DAMAGE_TYPES,
} from '../../../src/systems/damage-pipeline.ts';
import type { DerivedStats } from '../../../src/systems/boost-runner.ts';

function emptyDerived(): DerivedStats {
  return {
    ac: 0, str: 0, dex: 0, con: 0, wis: 0, int: 0, cha: 0,
    maxHp: 0, damage: 0, movement: 0, movementMultiplier: 1,
    saves: {}, saveAll: 0,
    advantages: new Set(), disadvantages: new Set(), autoFails: new Set(),
    immunities: new Set(), resistances: new Set(), vulnerabilities: new Set(),
  };
}

// ── 1. Damage types ──

describe('damage types', () => {
  test('10 damage types are defined', () => {
    assert.equal(DAMAGE_TYPES.length, 10);
  });

  test('includes physical types', () => {
    assert.ok(DAMAGE_TYPES.includes('slashing'));
    assert.ok(DAMAGE_TYPES.includes('piercing'));
    assert.ok(DAMAGE_TYPES.includes('bludgeoning'));
  });

  test('includes magical types', () => {
    assert.ok(DAMAGE_TYPES.includes('fire'));
    assert.ok(DAMAGE_TYPES.includes('cold'));
    assert.ok(DAMAGE_TYPES.includes('poison'));
    assert.ok(DAMAGE_TYPES.includes('radiant'));
    assert.ok(DAMAGE_TYPES.includes('necrotic'));
    assert.ok(DAMAGE_TYPES.includes('lightning'));
    assert.ok(DAMAGE_TYPES.includes('psychic'));
  });
});

// ── 2. Normal damage ──

describe('normal damage resolution', () => {
  test('no derived stats: raw = final, min 1', () => {
    const r = resolveDamage({ amount: 10, type: 'fire' });
    assert.equal(r.final, 10);
    assert.equal(r.multiplier, 1);
  });

  test('0 damage floors to 1 (non-immune)', () => {
    const r = resolveDamage({ amount: 0, type: 'fire' });
    assert.equal(r.final, 1);
  });

  test('bonus damage adds to raw', () => {
    const r = resolveDamage({ amount: 10, type: 'fire', bonusDamage: 3 });
    assert.equal(r.raw, 13);
    assert.equal(r.final, 13);
  });

  test('source derived damage bonus adds to raw', () => {
    const src = emptyDerived();
    src.damage = 5;
    const r = resolveDamage({ amount: 10, type: 'fire' }, null, src);
    assert.equal(r.raw, 15);
    assert.equal(r.final, 15);
  });
});

// ── 3. Immunity ──

describe('immunity', () => {
  test('immune: damage is 0', () => {
    const d = emptyDerived();
    d.immunities.add('fire');
    const r = resolveDamage({ amount: 20, type: 'fire' }, d);
    assert.equal(r.final, 0);
    assert.equal(r.immune, true);
    assert.equal(r.multiplier, 0);
  });

  test('immune to one type, not another', () => {
    const d = emptyDerived();
    d.immunities.add('fire');
    const fire = resolveDamage({ amount: 10, type: 'fire' }, d);
    const cold = resolveDamage({ amount: 10, type: 'cold' }, d);
    assert.equal(fire.final, 0);
    assert.equal(cold.final, 10);
  });
});

// ── 4. Resistance ──

describe('resistance', () => {
  test('resistant: damage halved, floor', () => {
    const d = emptyDerived();
    d.resistances.add('cold');
    const r = resolveDamage({ amount: 15, type: 'cold' }, d);
    assert.equal(r.final, 7);
    assert.equal(r.resistant, true);
    assert.equal(r.multiplier, 0.5);
  });

  test('resistant: odd number floors correctly', () => {
    const d = emptyDerived();
    d.resistances.add('cold');
    const r = resolveDamage({ amount: 7, type: 'cold' }, d);
    assert.equal(r.final, 3);
  });

  test('resistant: min 1', () => {
    const d = emptyDerived();
    d.resistances.add('cold');
    const r = resolveDamage({ amount: 1, type: 'cold' }, d);
    assert.equal(r.final, 1);
  });
});

// ── 5. Vulnerability ──

describe('vulnerability', () => {
  test('vulnerable: damage doubled', () => {
    const d = emptyDerived();
    d.vulnerabilities.add('lightning');
    const r = resolveDamage({ amount: 8, type: 'lightning' }, d);
    assert.equal(r.final, 16);
    assert.equal(r.vulnerable, true);
    assert.equal(r.multiplier, 2);
  });
});

// ── 6. Resistance + Vulnerability cancel ──

describe('resistance + vulnerability cancel', () => {
  test('both cancel: normal damage', () => {
    const d = emptyDerived();
    d.resistances.add('fire');
    d.vulnerabilities.add('fire');
    const r = resolveDamage({ amount: 10, type: 'fire' }, d);
    assert.equal(r.final, 10);
    assert.equal(r.resistant, true);
    assert.equal(r.vulnerable, true);
    assert.equal(r.multiplier, 1);
  });
});

// ── 7. Immunity trumps all ──

describe('immunity trumps resistance/vulnerability', () => {
  test('immune overrides vulnerability', () => {
    const d = emptyDerived();
    d.immunities.add('fire');
    d.vulnerabilities.add('fire');
    const r = resolveDamage({ amount: 10, type: 'fire' }, d);
    assert.equal(r.final, 0);
    assert.equal(r.immune, true);
  });

  test('immune overrides resistance', () => {
    const d = emptyDerived();
    d.immunities.add('fire');
    d.resistances.add('fire');
    const r = resolveDamage({ amount: 10, type: 'fire' }, d);
    assert.equal(r.final, 0);
  });
});

// ── 8. Advantage/disadvantage ──

describe('advantage and disadvantage', () => {
  test('no derived: normal', () => {
    const r = hasAdvantageOnRoll('attacks');
    assert.equal(r.net, 'normal');
  });

  test('advantage only', () => {
    const d = emptyDerived();
    d.advantages.add('attacks');
    const r = hasAdvantageOnRoll('attacks', d);
    assert.equal(r.net, 'advantage');
  });

  test('disadvantage only', () => {
    const d = emptyDerived();
    d.disadvantages.add('attacks');
    const r = hasAdvantageOnRoll('attacks', d);
    assert.equal(r.net, 'disadvantage');
  });

  test('both cancel to normal', () => {
    const d = emptyDerived();
    d.advantages.add('attacks');
    d.disadvantages.add('attacks');
    const r = hasAdvantageOnRoll('attacks', d);
    assert.equal(r.net, 'normal');
  });
});

// ── 9. Auto-fail ──

describe('auto-fail', () => {
  test('autoFail for save_str', () => {
    const d = emptyDerived();
    d.autoFails.add('save_str');
    assert.equal(isAutoFail('save_str', d), true);
    assert.equal(isAutoFail('save_dex', d), false);
  });

  test('no derived: not auto-fail', () => {
    assert.equal(isAutoFail('save_str'), false);
  });
});

// ── 10. Save bonus ──

describe('save bonus', () => {
  test('specific save bonus + saveAll', () => {
    const d = emptyDerived();
    d.saves.dex = 2;
    d.saveAll = 1;
    assert.equal(getSaveBonus('dex', d), 3);
  });

  test('saveAll only', () => {
    const d = emptyDerived();
    d.saveAll = 3;
    assert.equal(getSaveBonus('str', d), 3);
  });

  test('no derived: 0', () => {
    assert.equal(getSaveBonus('dex'), 0);
  });
});
