const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfigExportsInVm, toHostObject } = require('../_shared/vm');

test('sandbox can load config exports from VM context', () => {
  const cfg = loadConfigExportsInVm();
  assert.equal(cfg.MODE.EXPLORE, 'explore');
  assert.equal(cfg.MODE.COMBAT, 'combat');
  assert.ok(typeof cfg.TILE.WALL === 'number');
  assert.ok(typeof cfg.dnd.rollDamageSpec === 'function');
});

test('sandbox damage normalization returns stable host objects', () => {
  const cfg = loadConfigExportsInVm();
  const normalized = toHostObject(cfg.dnd.normalizeDamageSpec('1d12+1d4+3'));
  assert.deepEqual(normalized, { dice: [[1, 12], [1, 4]], bonus: 3 });
});
