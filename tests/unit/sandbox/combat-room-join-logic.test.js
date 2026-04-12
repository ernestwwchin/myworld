const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readText } = require('../_shared/io');

function buildSandbox() {
  const modeCombatCode = readText('js/modes/mode-combat.js');
  const sandbox = {
    console,
    Math,
    GameScene: function GameScene() {},
    COMBAT_RULES: {
      roomAlertMaxDistance: 8,
      largeRoomTileThreshold: 10,
      largeRoomJoinDistance: 3,
    },
    roomIdAt: () => 1,
    _getRoomTopology: () => ({ roomByKey: new Map() }),
    hasLOS: () => false,
    inFOV: () => true,
    tileDist: (x0, y0, x1, y1) => Math.hypot(x1 - x0, y1 - y0),
    bfs: () => [],
    wallBlk: () => false,
    pathTileCost: () => 0,
    MODE: { EXPLORE: 'explore', COMBAT: 'combat' },
    CombatLog: { log: () => {}, logSep: () => {}, logRoll: () => {} },
    document: { getElementById: () => ({ classList: { add: () => {}, remove: () => {} }, style: {} }) },
    window: { _MAP_META: { floor: 0 } },
    COLS: 30,
    ROWS: 30,
    S: 48,
    withHotbar: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(modeCombatCode, sandbox);
  return sandbox;
}

function makeScene(sandbox, roomSize) {
  const scene = new sandbox.GameScene();
  scene.playerTile = { x: 0, y: 0 };
  scene.enemies = [
    { id: 'combatant', displayName: 'Combatant', tx: 1, ty: 0, alive: true, inCombat: true },
    { id: 'near', displayName: 'Near', tx: 2, ty: 0, alive: true, inCombat: false },
    { id: 'far', displayName: 'Far', tx: 9, ty: 0, alive: true, inCombat: false },
  ];
  scene.combatGroup = [scene.enemies[0]];
  scene.canEnemySeeTile = () => false;
  scene.effectiveEnemySight = () => 6;

  const roomByKey = new Map();
  for (let i = 0; i < roomSize; i++) roomByKey.set(`k${i}`, 1);
  sandbox._getRoomTopology = () => ({ roomByKey, sideByRoom: new Map() });
  sandbox.roomIdAt = () => 1;

  return scene;
}

test('same room joins fully when room is not large', () => {
  const sandbox = buildSandbox();
  const scene = makeScene(sandbox, 5);
  const ids = JSON.parse(JSON.stringify(scene._predictNewAlertedAtTile(0, 0).map((e) => e.id).sort()));
  assert.deepEqual(ids, ['far', 'near']);
});

test('large room requires perceiving active combatants', () => {
  const sandbox = buildSandbox();
  const scene = makeScene(sandbox, 20);
  const ids = JSON.parse(JSON.stringify(scene._predictNewAlertedAtTile(0, 0).map((e) => e.id).sort()));
  assert.deepEqual(ids, []);
});

test('large room joins nearby enemy when combat is perceivable', () => {
  const sandbox = buildSandbox();
  const scene = makeScene(sandbox, 20);
  sandbox.hasLOS = (x0, y0, x1, y1) => Math.abs(x0 - x1) + Math.abs(y0 - y1) <= 3;
  sandbox.inFOV = () => true;
  const ids = JSON.parse(JSON.stringify(scene._predictNewAlertedAtTile(0, 0).map((e) => e.id).sort()));
  assert.deepEqual(ids, ['near']);
});

test('detailed prediction includes called-by source for area joins', () => {
  const sandbox = buildSandbox();
  const scene = makeScene(sandbox, 20);
  sandbox.hasLOS = (x0, y0, x1, y1) => Math.abs(x0 - x1) + Math.abs(y0 - y1) <= 3;
  sandbox.inFOV = () => true;
  const details = JSON.parse(JSON.stringify(scene._predictNewAlertedAtTileDetailed(0, 0).map((p) => ({
    id: p.enemy.id,
    reason: p.reason,
    source: p.source && p.source.id,
  }))));
  assert.deepEqual(details, [{ id: 'near', reason: 'area', source: 'combatant' }]);
});
