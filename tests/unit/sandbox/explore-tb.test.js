const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readText } = require('../_shared/io');

// ── Load MODE constant ────────────────────────────────
function loadMode() {
  const code = readText('js/config.js');
  const ctx = { console, Math, Object };
  vm.createContext(ctx);
  vm.runInContext(code + '\nglobalThis.__MODE=MODE;', ctx);
  return ctx.__MODE;
}

// ── Load explore-tb methods ───────────────────────────
function loadExploreTB(extraGlobals = {}) {
  const MODE = loadMode();
  const code = readText('js/modes/mode-explore-tb.js');
  const sandbox = {
    console, Math, Object,
    GameScene: { prototype: {} },
    MODE,
    ROWS: 20, COLS: 30,
    bfs: () => [],
    document: { getElementById: () => null },
    ...extraGlobals,
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return { proto: sandbox.GameScene.prototype, MODE };
}

function makeScene(MODE, overrides = {}) {
  return {
    mode: MODE.EXPLORE_TB,
    _exploreTBEnemyPhase: false,
    _exploreTBMovesRemaining: 0,
    _exploreTBInputLatch: false,
    _manualExploreTurnBased: false,
    _targetingAutoTB: false,
    enemies: [],
    playerTile: { x: 5, y: 5 },
    isMoving: false,
    keyDelay: 0,
    pendingAction: null,
    showStatus: () => {},
    drawSightOverlays: () => {},
    updateFogOfWar: () => {},
    wanderEnemies: () => {},
    checkSight: () => {},
    clearPendingAction: () => {},
    setDestination: () => {},
    interactAtTile: () => null,
    buildTileMenu: () => {},
    getEntitiesAt: () => [],
    onTapEnemy: () => {},
    enterCombat: () => {},
    tryEngageEnemyFromExplore: undefined,
    isWallTile: () => false,
    isDoorTile: () => false,
    isDoorClosed: () => false,
    isDoorPassable: () => true,
    endExploreTurnBasedPlayerTurn: () => {},
    time: { delayedCall: (delay, cb) => { cb(); } },
    cursors: { left: {isDown:false}, right: {isDown:false}, up: {isDown:false}, down: {isDown:false} },
    wasd: { left: {isDown:false}, right: {isDown:false}, up: {isDown:false}, down: {isDown:false} },
    ...overrides,
  };
}

// ── beginExploreTurnBasedPlayerTurn ──────────────────

test('beginExploreTurnBasedPlayerTurn: sets move and clears enemy phase', () => {
  const { proto, MODE } = loadExploreTB();
  const scene = makeScene(MODE, { mode: MODE.EXPLORE_TB, _exploreTBEnemyPhase: true, _exploreTBMovesRemaining: 0 });
  proto.beginExploreTurnBasedPlayerTurn.call(scene);
  assert.equal(scene._exploreTBMovesRemaining, 1);
  assert.equal(scene._exploreTBEnemyPhase, false);
  assert.equal(scene._exploreTBInputLatch, false);
});

test('beginExploreTurnBasedPlayerTurn: does nothing when not in EXPLORE_TB mode', () => {
  const { proto, MODE } = loadExploreTB();
  const scene = makeScene(MODE, { mode: MODE.EXPLORE, _exploreTBMovesRemaining: 0 });
  proto.beginExploreTurnBasedPlayerTurn.call(scene);
  assert.equal(scene._exploreTBMovesRemaining, 0, 'should not set moves in non-TB mode');
});

// ── endExploreTurnBasedPlayerTurn ────────────────────

test('endExploreTurnBasedPlayerTurn: clears moves and triggers enemy phase', () => {
  const { proto, MODE } = loadExploreTB();
  let enemyPhaseRan = false;
  const scene = makeScene(MODE, {
    mode: MODE.EXPLORE_TB,
    _exploreTBMovesRemaining: 1,
    _exploreTBEnemyPhase: false,
    wanderEnemies: () => { enemyPhaseRan = true; },
    time: { delayedCall: (delay, cb) => {} }, // don't auto-run callback
  });
  scene.runExploreTurnBasedEnemyPhase = proto.runExploreTurnBasedEnemyPhase.bind(scene);
  proto.endExploreTurnBasedPlayerTurn.call(scene);
  assert.equal(scene._exploreTBMovesRemaining, 0);
  assert.equal(scene._exploreTBEnemyPhase, true, 'enemy phase should be active');
});

test('endExploreTurnBasedPlayerTurn: does nothing if already in enemy phase', () => {
  const { proto, MODE } = loadExploreTB();
  let called = false;
  const scene = makeScene(MODE, {
    mode: MODE.EXPLORE_TB,
    _exploreTBEnemyPhase: true,
    wanderEnemies: () => { called = true; },
  });
  scene.runExploreTurnBasedEnemyPhase = proto.runExploreTurnBasedEnemyPhase.bind(scene);
  proto.endExploreTurnBasedPlayerTurn.call(scene);
  assert.equal(called, false, 'should not run enemy phase again when already running');
});

// ── runExploreTurnBasedEnemyPhase ────────────────────

test('runExploreTurnBasedEnemyPhase: calls wanderEnemies and restores player turn', () => {
  const { proto, MODE } = loadExploreTB();
  let wanderCalled = false;
  let sightChecked = false;
  const scene = makeScene(MODE, {
    mode: MODE.EXPLORE_TB,
    _exploreTBEnemyPhase: false,
    wanderEnemies: (force) => { wanderCalled = true; assert.equal(force, true); },
    checkSight: () => { sightChecked = true; },
    // Synchronous delayedCall for testability
    time: { delayedCall: (delay, cb) => { cb(); } },
  });
  proto.runExploreTurnBasedEnemyPhase.call(scene);
  assert.equal(wanderCalled, true, 'wanderEnemies should be called');
  assert.equal(sightChecked, true, 'checkSight should be called after enemy phase');
  assert.equal(scene._exploreTBEnemyPhase, false, 'enemy phase should be cleared after completion');
  assert.equal(scene._exploreTBMovesRemaining, 1, 'player moves should be restored');
});

test('runExploreTurnBasedEnemyPhase: does nothing if already in enemy phase', () => {
  const { proto, MODE } = loadExploreTB();
  let wanderCalled = false;
  const scene = makeScene(MODE, {
    mode: MODE.EXPLORE_TB,
    _exploreTBEnemyPhase: true,
    wanderEnemies: () => { wanderCalled = true; },
  });
  proto.runExploreTurnBasedEnemyPhase.call(scene);
  assert.equal(wanderCalled, false, 'should not double-run enemy phase');
});

// ── onTapExploreTB ───────────────────────────────────

test('onTapExploreTB: blocks input during enemy phase', () => {
  const { proto, MODE } = loadExploreTB();
  let statusShown = null;
  const scene = makeScene(MODE, {
    mode: MODE.EXPLORE_TB,
    _exploreTBEnemyPhase: true,
    showStatus: (msg) => { statusShown = msg; },
  });
  proto.onTapExploreTB.call(scene, 6, 5, null, {});
  assert.ok(statusShown && statusShown.includes('Enemy phase'), `expected 'Enemy phase' message, got: ${statusShown}`);
});

test('onTapExploreTB: blocks move when no moves remaining', () => {
  const { proto, MODE } = loadExploreTB();
  let statusShown = null;
  const scene = makeScene(MODE, {
    mode: MODE.EXPLORE_TB,
    _exploreTBEnemyPhase: false,
    _exploreTBMovesRemaining: 0,
    showStatus: (msg) => { statusShown = msg; },
  });
  proto.onTapExploreTB.call(scene, 6, 5, null, {});
  assert.ok(statusShown && statusShown.includes('No movement'), `expected 'No movement' message, got: ${statusShown}`);
});
