const assert = require('assert');
const { fs, path, root, loadYaml } = require('./helpers');

function testSystemArchitectureContracts() {
  const combatSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'mode-combat.js'), 'utf8');
  assert.ok(combatSrc.includes('findApproachPathToEnemy('));
  assert.ok(combatSrc.includes('tryEngageEnemyFromExplore('));
  assert.ok(combatSrc.includes('executeEngageOpenerAttack('));

  const etbSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'mode-explore-tb.js'), 'utf8');
  assert.ok(etbSrc.includes('toggleExploreTurnBased()'));
  assert.ok(etbSrc.includes('beginExploreTurnBasedPlayerTurn()'));

  const abilitySrc = fs.readFileSync(path.join(root, 'js', 'systems', 'ability-system.js'), 'utf8');
  assert.ok(abilitySrc.includes('checkStealthVsEnemies('));
  assert.ok(!abilitySrc.includes('this.add.sprite('));

  const entitySrc = fs.readFileSync(path.join(root, 'js', 'systems', 'entity-system.js'), 'utf8');
  assert.ok(entitySrc.includes('getEntitiesAt('));

  const movementSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'movement-system.js'), 'utf8');
  assert.ok(movementSrc.includes('setDestination('));
  assert.ok(movementSrc.includes('advancePath('));
}

function testUiAndTargetingContracts() {
  const uiSrc = fs.readFileSync(path.join(root, 'js', 'ui', 'core-ui.js'), 'utf8');
  assert.ok(uiSrc.includes('_showEnemyInfoPopup'));

  const autoplaySrc = fs.readFileSync(path.join(root, 'js', 'autoplay.js'), 'utf8');
  assert.ok(autoplaySrc.includes('test_engage_flow'));

  const combatSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'mode-combat.js'), 'utf8');
  assert.ok(combatSrc.includes('this._targetingAutoTB=true;'));
  assert.ok(combatSrc.includes('this._targetingAutoTB=false;'));

  const htmlSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(htmlSrc.includes('id="cmd-tb"'));
  const hotbarSrc = fs.readFileSync(path.join(root, 'js', 'ui', 'hotbar.js'), 'utf8');
  assert.ok(hotbarSrc.includes('toggleExploreTurnBased'));
}

function testBugRegressions() {
  const stage = loadYaml('data/01_goblin_invasion/stages/gw_b1f/stage.yaml');
  assert.strictEqual(stage.nextStage, 'gw_b2f');

  const moveSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'movement-system.js'), 'utf8');
  assert.ok(moveSrc.includes('_MAP_META?.nextStage'));
  assert.ok(moveSrc.includes('ModLoader.transitionToStage'));

  const gameSrc = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');
  assert.ok(gameSrc.includes('e.type||e.id||\'Unknown\'') || gameSrc.includes('e.type || e.id'));

  const combatSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'mode-combat.js'), 'utf8');
  const fleeZoneBlock = combatSrc.substring(combatSrc.indexOf('showFleeZone('));
  const fleeAddImage = fleeZoneBlock.match(/this\.add\.image[^;]+t_flee[^;]+;/);
  assert.ok(fleeAddImage);
  assert.ok(!fleeAddImage[0].includes('setAlpha('));
}

function runUiSystemContracts() {
  testSystemArchitectureContracts();
  testUiAndTargetingContracts();
  testBugRegressions();
}

module.exports = {
  runUiSystemContracts,
};
