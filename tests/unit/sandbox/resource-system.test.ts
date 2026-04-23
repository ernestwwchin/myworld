import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import {
  createResources,
  resetResources,
  canAfford,
  spendResource,
  grantResource,
  consumeMovement,
  hasMovement,
  getMovement,
  DEFAULT_RESOURCES,
} from '../../../src/systems/resource-system.ts';

// ── 1. Defaults ──

describe('defaults', () => {
  test('DEFAULT_RESOURCES has action=1, bonusAction=1, movement=5, reaction=1', () => {
    assert.equal(DEFAULT_RESOURCES.action, 1);
    assert.equal(DEFAULT_RESOURCES.bonusAction, 1);
    assert.equal(DEFAULT_RESOURCES.movement, 5);
    assert.equal(DEFAULT_RESOURCES.reaction, 1);
  });

  test('createResources returns defaults', () => {
    const r = createResources();
    assert.deepEqual(r, { action: 1, bonusAction: 1, movement: 5, reaction: 1 });
  });

  test('createResources with overrides', () => {
    const r = createResources({ movement: 8 });
    assert.equal(r.movement, 8);
    assert.equal(r.action, 1);
  });
});

// ── 2. canAfford ──

describe('canAfford', () => {
  test('action: true when action >= 1', () => {
    const r = createResources();
    assert.equal(canAfford(r, 'action'), true);
  });

  test('action: false when action = 0', () => {
    const r = createResources();
    r.action = 0;
    assert.equal(canAfford(r, 'action'), false);
  });

  test('bonusAction: true when >= 1', () => {
    const r = createResources();
    assert.equal(canAfford(r, 'bonusAction'), true);
  });

  test('free: always true', () => {
    const r = createResources();
    r.action = 0;
    r.bonusAction = 0;
    assert.equal(canAfford(r, 'free'), true);
  });

  test('reaction: true when >= 1', () => {
    const r = createResources();
    assert.equal(canAfford(r, 'reaction'), true);
  });
});

// ── 3. spendResource ──

describe('spendResource', () => {
  test('spend action decrements', () => {
    const r = createResources();
    assert.equal(spendResource(r, 'action'), true);
    assert.equal(r.action, 0);
  });

  test('spend action fails when 0', () => {
    const r = createResources();
    r.action = 0;
    assert.equal(spendResource(r, 'action'), false);
    assert.equal(r.action, 0);
  });

  test('spend bonusAction decrements', () => {
    const r = createResources();
    assert.equal(spendResource(r, 'bonusAction'), true);
    assert.equal(r.bonusAction, 0);
  });

  test('spend free does nothing', () => {
    const r = createResources();
    assert.equal(spendResource(r, 'free'), true);
    assert.equal(r.action, 1);
    assert.equal(r.bonusAction, 1);
  });

  test('spend reaction decrements', () => {
    const r = createResources();
    assert.equal(spendResource(r, 'reaction'), true);
    assert.equal(r.reaction, 0);
  });
});

// ── 4. grantResource ──

describe('grantResource', () => {
  test('grants additional movement', () => {
    const r = createResources();
    grantResource(r, 'movement', 3);
    assert.equal(r.movement, 8);
  });

  test('grants additional action', () => {
    const r = createResources();
    grantResource(r, 'action', 1);
    assert.equal(r.action, 2);
  });
});

// ── 5. Movement ──

describe('movement', () => {
  test('consumeMovement subtracts tiles', () => {
    const r = createResources();
    assert.equal(consumeMovement(r, 3), true);
    assert.equal(r.movement, 2);
  });

  test('consumeMovement fails if not enough', () => {
    const r = createResources();
    assert.equal(consumeMovement(r, 6), false);
    assert.equal(r.movement, 5);
  });

  test('hasMovement returns true when > 0', () => {
    const r = createResources();
    assert.equal(hasMovement(r), true);
  });

  test('hasMovement returns false when 0', () => {
    const r = createResources();
    r.movement = 0;
    assert.equal(hasMovement(r), false);
  });

  test('getMovement returns current', () => {
    const r = createResources();
    assert.equal(getMovement(r), 5);
    consumeMovement(r, 2);
    assert.equal(getMovement(r), 3);
  });
});

// ── 6. Reset ──

describe('resetResources', () => {
  test('resets all to defaults', () => {
    const r = createResources();
    r.action = 0;
    r.bonusAction = 0;
    r.movement = 0;
    r.reaction = 0;
    resetResources(r);
    assert.equal(r.action, 1);
    assert.equal(r.bonusAction, 1);
    assert.equal(r.movement, 5);
    assert.equal(r.reaction, 1);
  });

  test('resets with custom base movement', () => {
    const r = createResources();
    r.movement = 0;
    resetResources(r, 8);
    assert.equal(r.movement, 8);
  });
});

// ── 7. Action economy flow ──

describe('action economy flow', () => {
  test('full turn: action + bonusAction + movement', () => {
    const r = createResources();
    assert.equal(spendResource(r, 'action'), true);
    assert.equal(spendResource(r, 'bonusAction'), true);
    consumeMovement(r, 3);
    assert.equal(r.action, 0);
    assert.equal(r.bonusAction, 0);
    assert.equal(r.movement, 2);
    assert.equal(canAfford(r, 'action'), false);
    assert.equal(canAfford(r, 'bonusAction'), false);
    assert.equal(hasMovement(r), true);
  });

  test('dash grants extra movement', () => {
    const r = createResources();
    spendResource(r, 'action');
    grantResource(r, 'movement', 5);
    assert.equal(r.movement, 10);
    assert.equal(r.action, 0);
  });
});
