import assert from 'node:assert';
import { fs, path, root, loadYaml } from './helpers.js';

function testSystemArchitectureContracts() {
  const combatSrc = fs.readFileSync(path.join(root, 'src', 'modes', 'mode-combat.ts'), 'utf8');
  assert.ok(combatSrc.includes('findApproachPathToEnemy('));
  assert.ok(combatSrc.includes('tryEngageEnemyFromExplore('));
  assert.ok(combatSrc.includes('executeEngageOpenerAttack('));

  const abilitySrc = fs.readFileSync(path.join(root, 'src', 'systems', 'ability-system.ts'), 'utf8');
  assert.ok(abilitySrc.includes('checkStealthVsEnemies('));
  assert.ok(!abilitySrc.includes('this.add.sprite('));

  const entitySrc = fs.readFileSync(path.join(root, 'src', 'systems', 'entity-system.ts'), 'utf8');
  assert.ok(entitySrc.includes('getEntitiesAt('));

  const movementSrc = fs.readFileSync(path.join(root, 'src', 'systems', 'movement-system.ts'), 'utf8');
  assert.ok(movementSrc.includes('setDestination('));
  assert.ok(movementSrc.includes('advancePath('));
}

function testUiAndTargetingContracts() {
  const uiSrc = fs.readFileSync(path.join(root, 'src', 'ui', 'core-ui.ts'), 'utf8');
  assert.ok(uiSrc.includes('_showEnemyInfoPopup'));

  const autoplaySrc = fs.readFileSync(path.join(root, 'src', 'autoplay.ts'), 'utf8');
  assert.ok(autoplaySrc.includes('test_engage_flow'));

  const combatSrc = fs.readFileSync(path.join(root, 'src', 'modes', 'mode-combat.ts'), 'utf8');
  assert.ok(
    combatSrc.includes('this._targetingAutoTB=false;') || combatSrc.includes('_targetingAutoTB = false'),
    'clearPendingAction must still clear _targetingAutoTB flag',
  );
}

function testBugRegressions() {
  const stage = loadYaml('data/01_goblin_invasion/stages/gw_b1f/stage.yaml');
  assert.ok(stage.nextStage === 'auto' || stage.nextStage === 'gw_b2f');

  const moveSrc = fs.readFileSync(path.join(root, 'src', 'systems', 'movement-system.ts'), 'utf8');
  assert.ok(moveSrc.includes('_MAP_META') && moveSrc.includes('nextStage'), 'movement-system must handle _MAP_META nextStage');
  assert.ok(moveSrc.includes('transitionToStage'), 'movement-system must call transitionToStage');

  const gameSrc = fs.readFileSync(path.join(root, 'src', 'game.ts'), 'utf8');
  assert.ok(gameSrc.includes("e.type||e.id||'Unknown'") || gameSrc.includes('e.type || e.id'));

  const rangesSrc = fs.readFileSync(path.join(root, 'src', 'modes', 'combat-ranges.ts'), 'utf8');

  assert.ok(rangesSrc.includes('_drawSurface('), 'combat-ranges must use _drawSurface for tile-accurate overlays');
  assert.ok(rangesSrc.includes('_floodReachable('), 'combat-ranges must use _floodReachable for Dijkstra flood');
  assert.ok(rangesSrc.includes('turnStartTile'), 'combat-ranges must use turnStartTile for BG3-style free movement');
  assert.ok(rangesSrc.includes('turnStartMoves'), 'combat-ranges must use turnStartMoves for full budget');

  const fleeZoneBlock = rangesSrc.substring(rangesSrc.indexOf('showFleeZone('));
  assert.ok(fleeZoneBlock.includes('_drawSurface('), 'showFleeZone must use _drawSurface');
  assert.ok(fleeZoneBlock.includes('0x2ecc71'), 'showFleeZone must use green color');
}

function testWorldPositionContracts() {
  const wpSrc = fs.readFileSync(path.join(root, 'src', 'systems', 'world-position-system.ts'), 'utf8');
  assert.ok(wpSrc.includes('function tileToWorld('), 'world-position must define tileToWorld');
  assert.ok(wpSrc.includes('function worldToTile('), 'world-position must define worldToTile');
  assert.ok(wpSrc.includes('worldLightLevel('), 'world-position must define worldLightLevel');
  assert.ok(wpSrc.includes('playerWorldPos('), 'world-position must define playerWorldPos');
  assert.ok(wpSrc.includes('enemyWorldPos('), 'world-position must define enemyWorldPos');

  const combatSrc = fs.readFileSync(path.join(root, 'src', 'modes', 'mode-combat.ts'), 'utf8');
  const enemyFloats = combatSrc.match(/spawnFloat\([^)]*enemy\.tx\s*\*\s*S/g);
  assert.ok(!enemyFloats, 'mode-combat spawnFloat must not use enemy.tx*S (use enemyWorldPos)');

  const dmgSrc = fs.readFileSync(path.join(root, 'src', 'systems', 'damage-system.ts'), 'utf8');
  assert.ok(dmgSrc.includes('enemyWorldPos('), 'damage-system must use enemyWorldPos for actor floats');

  const uiSrc2 = fs.readFileSync(path.join(root, 'src', 'ui', 'core-ui.ts'), 'utf8');
  assert.ok(uiSrc2.includes('enemyWorldPos'), 'core-ui popup must use enemyWorldPos');
}

export function runUiSystemContracts() {
  testSystemArchitectureContracts();
  testUiAndTargetingContracts();
  testBugRegressions();
  testWorldPositionContracts();
}
