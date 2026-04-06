const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const yaml = require('js-yaml');

const root = process.cwd();

function loadYaml(relPath) {
  const full = path.join(root, relPath);
  return yaml.load(fs.readFileSync(full, 'utf8'));
}

function loadConfigExports() {
  const configPath = path.join(root, 'js', 'config.js');
  const code = fs.readFileSync(configPath, 'utf8');

  const sandbox = { console, Math };
  vm.createContext(sandbox);
  const wrapped = `${code}\n;globalThis.__testExports = { dnd, WEAPON_DEFS, MODE };`;
  vm.runInContext(wrapped, sandbox);
  return sandbox.__testExports;
}

function toHostObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function testDiceNotationParsing(dnd) {
  const c1 = toHostObject(dnd.normalizeDamageSpec('1d8+3'));
  assert.deepStrictEqual(c1, { dice: [[1, 8]], bonus: 3 });

  const c2 = toHostObject(dnd.normalizeDamageSpec('1d12+1d4+3'));
  assert.deepStrictEqual(c2, { dice: [[1, 12], [1, 4]], bonus: 3 });

  const c3 = toHostObject(dnd.normalizeDamageSpec('2d6-1'));
  assert.deepStrictEqual(c3, { dice: [[2, 6]], bonus: -1 });

  // Backward compatibility formats
  const legacy = toHostObject(dnd.normalizeDamageSpec([1, 10, 2]));
  assert.deepStrictEqual(legacy, { dice: [[1, 10]], bonus: 2 });

  const objectForm = toHostObject(dnd.normalizeDamageSpec({ dice: [[2, 4], [1, 6]], bonus: 1 }));
  assert.deepStrictEqual(objectForm, { dice: [[2, 4], [1, 6]], bonus: 1 });
}

function testDamageRolling(dnd) {
  const spec = '1d12+1d4+3';
  for (let i = 0; i < 100; i++) {
    const r = dnd.rollDamageSpec(spec, false);
    assert.ok(r.total >= 5 && r.total <= 19, `out of range: ${r.total}`);
    assert.ok(Array.isArray(r.diceValues));
    assert.strictEqual(r.diceValues.length, 2);
    assert.ok(typeof r.str === 'string' && r.str.includes('='));
  }

  // Crit doubles only dice count (1d12+1d4 -> 4 dice total)
  const crit = dnd.rollDamageSpec(spec, true);
  assert.strictEqual(crit.diceValues.length, 4);
}

function testWeaponDataReferences(dnd) {
  const weapons = loadYaml('data/core/weapons.yaml').weapons;
  const creatures = loadYaml('data/core/creatures.yaml').creatures;
  const player = loadYaml('data/player.yaml').player;

  // Every weapon must have parseable damageDice and range
  for (const [id, w] of Object.entries(weapons)) {
    const parsed = dnd.normalizeDamageSpec(w.damageDice);
    assert.ok(parsed.dice.length > 0, `weapon ${id} has invalid damageDice`);
    assert.ok(typeof w.range === 'number' && w.range >= 1, `weapon ${id} has invalid range`);
  }

  // Player weapon reference must exist
  assert.ok(player.equipment.weaponId in weapons, 'player weaponId not found in weapons');

  // Creature attack weapon references must exist when present
  for (const [id, c] of Object.entries(creatures)) {
    const weaponId = c.attack && c.attack.weaponId;
    if (weaponId) {
      assert.ok(weaponId in weapons, `creature ${id} has unknown weaponId ${weaponId}`);
    }
  }
}

function testExploreTurnBasedModeConstant(MODE) {
  assert.ok(MODE && typeof MODE === 'object', 'MODE export missing');
  assert.strictEqual(MODE.EXPLORE, 'explore');
  assert.strictEqual(MODE.COMBAT, 'combat');
  assert.strictEqual(MODE.EXPLORE_TB, 'explore_tb');
}

function testCombatInitSystemContracts() {
  const combatInitPath = path.join(root, 'js', 'modes', 'mode-combat.js');
  const src = fs.readFileSync(combatInitPath, 'utf8');

  assert.ok(src.includes('findApproachPathToEnemy('), 'combat-init missing approach path helper');
  assert.ok(src.includes('tryEngageEnemyFromExplore('), 'combat-init missing engage flow entry');
  assert.ok(src.includes('executeEngageOpenerAttack('), 'combat-init missing opener attack handler');
  assert.ok(src.includes('this._returnToExploreTB = this.mode === MODE.EXPLORE_TB;'), 'combat-init missing return-to-explore-tb promotion state');
  assert.ok(src.includes('if (!this.isExploreMode()) return;'), 'combat-init should allow both explore modes via isExploreMode');
}

function testExploreTurnBasedContracts() {
  // Methods in mode-explore-tb.js
  const etbPath = path.join(root, 'js', 'modes', 'mode-explore-tb.js');
  const src = fs.readFileSync(etbPath, 'utf8');

  assert.ok(src.includes('toggleExploreTurnBased()'), 'explore-tb-system missing explore TB toggle');
  assert.ok(src.includes('beginExploreTurnBasedPlayerTurn()'), 'explore-tb-system missing explore TB player turn start');
  assert.ok(src.includes('runExploreTurnBasedEnemyPhase()'), 'explore-tb-system missing explore TB enemy phase');
  assert.ok(src.includes('this._exploreTBMovesRemaining = 1;'), 'explore TB should grant bounded movement per turn');
}

function testEngageAndAutoplayContracts() {
  const uiPath = path.join(root, 'js', 'ui', 'core-ui.js');
  const uiSrc = fs.readFileSync(uiPath, 'utf8');
  assert.ok(uiSrc.includes('tryEngageEnemyFromExplore'), 'core-ui engage should use tryEngageEnemyFromExplore');
  assert.ok(!uiSrc.includes('const snap = s.lastCompletedTile'), 'core-ui engage should not snap to stale lastCompletedTile');

  const autoplayPath = path.join(root, 'js', 'autoplay.js');
  const autoplaySrc = fs.readFileSync(autoplayPath, 'utf8');
  assert.ok(autoplaySrc.includes('test_engage_flow'), 'autoplay missing engage_flow scenario');
  assert.ok(autoplaySrc.includes('test_engage_adjacent'), 'autoplay missing engage_adjacent scenario');
  assert.ok(autoplaySrc.includes('test_explore_turn_based'), 'autoplay missing explore_turn_based scenario');
  assert.ok(autoplaySrc.includes('test_alert_locality'), 'autoplay missing alert_locality scenario');
}

function run() {
  const { dnd, MODE } = loadConfigExports();

  testDiceNotationParsing(dnd);
  testDamageRolling(dnd);
  testWeaponDataReferences(dnd);
  testExploreTurnBasedModeConstant(MODE);
  testCombatInitSystemContracts();
  testExploreTurnBasedContracts();
  testEngageAndAutoplayContracts();

  console.log('All tests passed.');
}

run();
