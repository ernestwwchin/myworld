const test = require('node:test');
const assert = require('node:assert/strict');
const { loadYaml } = require('../_shared/io');

test('core mod metadata includes required yaml modules', () => {
  const coreMeta = loadYaml('data/00_core/meta.yaml');
  assert.equal(coreMeta.id, '00_core');
  assert.ok(Array.isArray(coreMeta.includes), 'core includes must be an array');

  const required = ['rules.yaml', 'abilities.yaml', 'creatures.yaml', 'classes.yaml', 'weapons.yaml', 'statuses.yaml'];
  for (const rel of required) {
    assert.ok(coreMeta.includes.includes(rel), `core meta missing include ${rel}`);
  }
});

test('mod settings keep 00_core enabled', () => {
  const settings = loadYaml('data/modsettings.yaml');
  assert.ok(Array.isArray(settings.mods));
  assert.ok(settings.mods.includes('00_core'), 'modsettings must include 00_core');
});
