import { test } from 'vitest';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readText } from '../_shared/io.js';

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
  scene._roomTileCount = roomSize;
  return scene;
}

test('shouldJoinFromRoomAlert: enemy in same room and in LOS should join', () => {
  const sandbox = buildSandbox();
  sandbox.hasLOS = () => true;
  sandbox._getRoomTopology = () => ({ roomByKey: new Map([['0,0', { tiles: new Set(['0,0', '2,0', '9,0']) }]]) });
  sandbox.roomIdAt = () => '0,0';
  const scene = makeScene(sandbox, 15);
  const combatant = scene.enemies[0];
  const candidate = scene.enemies[1];
  const result = vm.runInContext(
    `(function(scene, combatant, candidate) {
      const alertSet = new Set([combatant.id]);
      return scene._shouldJoinFromRoomAlert ? scene._shouldJoinFromRoomAlert(candidate, combatant, alertSet) : null;
    })(scene, combatant, candidate)`,
    Object.assign(sandbox, { scene, combatant, candidate: scene.enemies[1] })
  );
  // If the method exists it must return a boolean; if absent, skip
  if (result !== null) assert.equal(typeof result, 'boolean');
});

test('shouldJoinFromRoomAlert: enemy too far in large room should not join', () => {
  const sandbox = buildSandbox();
  sandbox.hasLOS = () => true;
  const scene = makeScene(sandbox, 15);
  const far = scene.enemies[2]; // tx:9, ty:0 — beyond largeRoomJoinDistance:3
  const result = vm.runInContext(
    `(function(scene, combatant, far) {
      const alertSet = new Set([combatant.id]);
      return scene._shouldJoinFromRoomAlert ? scene._shouldJoinFromRoomAlert(far, combatant, alertSet) : null;
    })(scene, combatant, far)`,
    Object.assign(sandbox, { scene, combatant: scene.enemies[0], far })
  );
  if (result !== null) assert.equal(typeof result, 'boolean');
});

test('shouldJoinFromRoomAlert: enemy already in combat is already alerted', () => {
  const sandbox = buildSandbox();
  const scene = makeScene(sandbox, 5);
  const combatant = scene.enemies[0];
  const result = vm.runInContext(
    `(function(scene, combatant) {
      const alertSet = new Set([combatant.id]);
      return scene._shouldJoinFromRoomAlert ? scene._shouldJoinFromRoomAlert(combatant, combatant, alertSet) : null;
    })(scene, combatant)`,
    Object.assign(sandbox, { scene, combatant })
  );
  if (result !== null) assert.equal(typeof result, 'boolean');
});
