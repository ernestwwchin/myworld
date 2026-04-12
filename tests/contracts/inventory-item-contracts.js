const assert = require('assert');
const { fs, path, root, loadYaml, loadConfigExports, toHostObject } = require('./helpers');

function testInventoryContracts() {
  const configSrc = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  assert.ok(configSrc.includes('gold: 0'));
  assert.ok(configSrc.includes('inventory: []'));

  const invSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'inventory-system.js'), 'utf8');
  assert.ok(invSrc.includes('useItem(item)'));
  assert.ok(invSrc.includes('equipItem(item)'));
  assert.ok(invSrc.includes('dropItem(item)'));

  const tables = loadYaml('data/00_core/loot-tables.yaml');
  const { dnd } = loadConfigExports();
  for (const table of Object.values(tables)) {
    if (!Array.isArray(table.pool)) continue;
    for (const item of table.pool) {
      assert.ok(item.type);
      if (item.type === 'consumable' && item.heal) {
        const parsed = toHostObject(dnd.normalizeDamageSpec(item.heal));
        assert.ok(parsed.dice.length > 0);
      }
    }
  }
}

function testItemDefinitionContracts() {
  const configSrc = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  assert.ok(configSrc.includes('const ITEM_DEFS'));

  const items = loadYaml('data/00_core/items.yaml');
  assert.ok(items?.items && typeof items.items === 'object');
  for (const [id, item] of Object.entries(items.items)) {
    assert.ok(item.name, `item '${id}' missing name`);
    assert.ok(item.type, `item '${id}' missing type`);
    assert.ok(item.onUse, `item '${id}' missing onUse`);
  }

  const modloaderSrc = fs.readFileSync(path.join(root, 'js', 'modloader.js'), 'utf8');
  assert.ok(modloaderSrc.includes('applyItems(modData)'));

   const invSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'inventory-system.js'), 'utf8');
  assert.ok(invSrc.includes('ITEM_DEFS[item.id]'));
}

function runInventoryItemContracts() {
  testInventoryContracts();
  testItemDefinitionContracts();
}

module.exports = {
  runInventoryItemContracts,
};
