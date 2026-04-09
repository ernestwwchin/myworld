const assert = require('assert');
const { loadYaml, loadConfigExports, toHostObject, loadStageInSandbox } = require('./helpers');

function testDiceNotationParsing(dnd) {
  assert.deepStrictEqual(toHostObject(dnd.normalizeDamageSpec('1d8+3')), { dice: [[1, 8]], bonus: 3 });
  assert.deepStrictEqual(toHostObject(dnd.normalizeDamageSpec('1d12+1d4+3')), { dice: [[1, 12], [1, 4]], bonus: 3 });
  assert.deepStrictEqual(toHostObject(dnd.normalizeDamageSpec('2d6-1')), { dice: [[2, 6]], bonus: -1 });
  assert.deepStrictEqual(toHostObject(dnd.normalizeDamageSpec([1, 10, 2])), { dice: [[1, 10]], bonus: 2 });
  assert.deepStrictEqual(toHostObject(dnd.normalizeDamageSpec({ dice: [[2, 4], [1, 6]], bonus: 1 })), { dice: [[2, 4], [1, 6]], bonus: 1 });
}

function testDamageRolling(dnd) {
  const spec = '1d12+1d4+3';
  for (let i = 0; i < 100; i++) {
    const r = dnd.rollDamageSpec(spec, false);
    assert.ok(r.total >= 5 && r.total <= 19);
    assert.strictEqual(r.diceValues.length, 2);
    assert.strictEqual(r.bonus, 3);
    assert.strictEqual(r.isCrit, false);
  }
  const crit = dnd.rollDamageSpec(spec, true);
  assert.strictEqual(crit.diceValues.length, 4);
  assert.strictEqual(crit.isCrit, true);
}

function testWeaponDataReferences(dnd) {
  const weapons = loadYaml('data/00_core/weapons.yaml').weapons;
  const creatures = loadYaml('data/00_core/creatures.yaml').creatures;
  const player = loadYaml('data/player.yaml').player;
  for (const [id, w] of Object.entries(weapons)) {
    const parsed = dnd.normalizeDamageSpec(w.damageDice);
    assert.ok(parsed.dice.length > 0, `weapon ${id} has invalid damageDice`);
    assert.ok(typeof w.range === 'number' && w.range >= 1, `weapon ${id} has invalid range`);
  }
  assert.ok(player.equipment.weaponId in weapons, 'player weaponId not found in weapons');
  for (const [id, c] of Object.entries(creatures)) {
    const weaponId = c.attack && c.attack.weaponId;
    if (weaponId) assert.ok(weaponId in weapons, `creature ${id} has unknown weaponId ${weaponId}`);
  }
}

function testExploreTurnBasedModeConstant(MODE) {
  assert.strictEqual(MODE.EXPLORE, 'explore');
  assert.strictEqual(MODE.COMBAT, 'combat');
  assert.strictEqual(MODE.EXPLORE_TB, 'explore_tb');
}

function testCoreTestMeta() {
  const meta = loadYaml('data/00_core_test/meta.yaml');
  assert.strictEqual(meta.id, '00_core_test');
  assert.strictEqual(meta.enabled, false);
  assert.ok(Array.isArray(meta.stages) && meta.stages.length > 0);
}

function testCoreTestAllStagesStructure() {
  const meta = loadYaml('data/00_core_test/meta.yaml');
  const coreCreatures = loadYaml('data/00_core/creatures.yaml').creatures;
  for (const stageId of meta.stages) {
    const { stage, grid, ROWS, COLS } = loadStageInSandbox(stageId);
    const ps = stage.playerStart;
    assert.ok(stage.name);
    assert.ok(ROWS >= 3);
    assert.ok(ps.x >= 0 && ps.x < COLS);
    assert.ok(ps.y >= 0 && ps.y < ROWS);
    assert.strictEqual(grid[ps.y][ps.x], 0, `${stageId}: player must start on FLOOR`);
    for (const enc of (stage.encounters || [])) {
      assert.ok(coreCreatures[enc.creature], `${stageId}: unknown creature '${enc.creature}'`);
      assert.strictEqual(grid[enc.y][enc.x], 0, `${stageId}: creature placed on non-floor tile`);
    }
  }
}

function testMapScenarios(dnd) {
  const m = loadStageInSandbox('ts_movement');
  const p = m.stage.playerStart;
  assert.ok(require('vm').runInContext(`bfs(${p.x}, ${p.y}, 5, 5, wallBlk).length`, m.sandbox) > 0);
  assert.strictEqual(require('vm').runInContext(`bfs(${p.x}, ${p.y}, 0, 0, wallBlk).length`, m.sandbox), 0);

  const c = loadStageInSandbox('ts_combat_entry');
  const cp = c.stage.playerStart;
  const ce = c.stage.encounters[0];
  assert.strictEqual(require('vm').runInContext(`hasLOS(${cp.x}, ${cp.y}, ${ce.x}, ${ce.y})`, c.sandbox), true);
  const inFov = require('vm').runInContext(`inFOV({tx:${ce.x}, ty:${ce.y}, facing:${ce.facing}, fov:120}, ${cp.x}, ${cp.y})`, c.sandbox);
  assert.strictEqual(inFov, true);

  const ma = loadStageInSandbox('ts_melee_attack');
  const mp = ma.stage.playerStart;
  const me = ma.stage.encounters[0];
  assert.strictEqual(require('vm').runInContext(`bfs(${mp.x}, ${mp.y}, ${me.x}, ${me.y}, wallBlk).length`, ma.sandbox), 1);

  const ea = loadStageInSandbox('ts_enemy_attack');
  const ep = ea.stage.playerStart;
  const ee = ea.stage.encounters[0];
  const pathLen = require('vm').runInContext(`bfs(${ee.x}, ${ee.y}, ${ep.x}, ${ep.y}, wallBlk).length`, ea.sandbox);
  assert.ok(pathLen > 0 && pathLen <= 5);

  const stats = {
    str: 8, dex: 16, con: 12, int: 14, wis: 10, cha: 8,
    level: 1,
    skillProficiencies: new Set(['stealth', 'acrobatics', 'perception']),
    expertiseSkills: new Set(['stealth']),
  };
  assert.strictEqual(dnd.skillMod('stealth', stats), 7);
  assert.strictEqual(dnd.passiveSkill('stealth', stats), 17);
  const check = dnd.skillCheck('stealth', stats, 15);
  assert.strictEqual(check.total, check.roll + check.mod);
  assert.strictEqual(dnd.profBonus(17), 6);
}

function runDndAndMapContracts() {
  const { dnd, MODE } = loadConfigExports();
  testDiceNotationParsing(dnd);
  testDamageRolling(dnd);
  testWeaponDataReferences(dnd);
  testExploreTurnBasedModeConstant(MODE);
  testCoreTestMeta();
  testCoreTestAllStagesStructure();
  testMapScenarios(dnd);
}

module.exports = {
  runDndAndMapContracts,
};
