import { test } from 'vitest';
import assert from 'node:assert/strict';
import { TILE, MODE, dnd } from '../../../src/config.ts';

test('sandbox can load config exports from VM context', () => {
  assert.equal(MODE.EXPLORE, 'explore');
  assert.equal(MODE.COMBAT, 'combat');
  assert.ok(typeof TILE.WALL === 'number');
  assert.ok(typeof dnd.rollDamageSpec === 'function');
});

test('sandbox damage normalization returns stable host objects', () => {
  const normalized = dnd.normalizeDamageSpec('1d12+1d4+3');
  assert.deepEqual(normalized, { dice: [[1, 12], [1, 4]], bonus: 3 });
});
