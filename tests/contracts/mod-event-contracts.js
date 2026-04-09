const assert = require('assert');
const { fs, path, root, loadYaml } = require('./helpers');

function testModContracts() {
  const coreMeta = loadYaml('data/00_core/meta.yaml');
  assert.strictEqual(coreMeta.id, '00_core');
  for (const file of ['rules.yaml', 'abilities.yaml', 'creatures.yaml', 'classes.yaml', 'weapons.yaml', 'statuses.yaml']) {
    assert.ok(coreMeta.includes.includes(file), `core meta missing include: ${file}`);
  }

  const settings = loadYaml('data/modsettings.yaml');
  assert.ok(settings.mods.includes('00_core'));

  const modList = ['00_core', ...(settings.mods || []).filter((m) => m !== '00_core')];
  assert.strictEqual(modList[0], '00_core');
  assert.strictEqual(modList.filter((m) => m === '00_core').length, 1);

  const meta = loadYaml('data/01_goblin_invasion/meta.yaml');
  assert.strictEqual(meta.id, '01_goblin_invasion');
  assert.ok(meta.stages.includes(meta.startMap));

  const stage = loadYaml('data/01_goblin_invasion/stages/gw_b1f/stage.yaml');
  assert.ok(Array.isArray(stage.grid) && stage.grid.length > 0);
  assert.ok(Array.isArray(stage.encounters));
}

function testEventContracts() {
  const flagsSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'flags.js'), 'utf8');
  assert.ok(flagsSrc.includes('registerMod('));
  assert.ok(flagsSrc.includes('applyOverrides('));

  const eventSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'event-runner.js'), 'utf8');
  for (const action of ['move', 'wait', 'waitIdle', 'attack', 'flee', 'hide', 'spawn', 'say', 'setFlag', 'branch', 'goto', 'assert', 'dialog']) {
    assert.ok(eventSrc.includes(`'${action}'`), `event-runner missing action handler: ${action}`);
  }

  const dialogSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'dialog-runner.js'), 'utf8');
  assert.ok(dialogSrc.includes('skillCheck'));

  const meta = loadYaml('data/00_core_test/meta.yaml');
  for (const stageId of meta.stages) {
    const evts = loadYaml(`data/00_core_test/stages/${stageId}/events.yaml`);
    assert.ok(Array.isArray(evts.autoplay) && evts.autoplay.length > 0, `${stageId} autoplay must be non-empty`);
    for (const step of evts.autoplay) assert.ok(step.do, `${stageId} event step missing do`);
  }
}

function testGoblinInvasionFlagsAndPatrol() {
  const meta = loadYaml('data/01_goblin_invasion/meta.yaml');
  assert.ok(meta.flags.entered_warren);
  assert.ok(meta.flags.goblin_captain_dead);
  assert.ok(meta.flags.goblins_killed);

  const stage = loadYaml('data/01_goblin_invasion/stages/gw_b1f/stage.yaml');
  const patrolEncs = stage.encounters.filter((enc) => enc.ai && enc.ai.patrolPath);
  assert.ok(patrolEncs.length > 0);
  for (const enc of patrolEncs) {
    assert.ok(Array.isArray(enc.ai.patrolPath));
    assert.ok(enc.ai.patrolPath.length >= 2);
  }
}

function runModEventContracts() {
  testModContracts();
  testEventContracts();
  testGoblinInvasionFlagsAndPatrol();
}

module.exports = {
  runModEventContracts,
};
