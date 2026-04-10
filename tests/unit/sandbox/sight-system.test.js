const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readText } = require('../_shared/io');

// ── Load config globals from config.js ──────────────
function loadConfig() {
  const code = readText('js/config.js');
  const ctx = { console, Math, Object };
  vm.createContext(ctx);
  vm.runInContext(code + '\nglobalThis.__cfg={COMBAT_RULES,LIGHT_RULES,S,MODE};', ctx);
  return ctx.__cfg;
}

// ── Load sight-system methods into a vm sandbox ──────
function loadSightSystem(extraGlobals = {}) {
  const cfg = loadConfig();
  const code = readText('js/systems/sight-system.js');
  const sandbox = {
    console, Math, Object,
    GameScene: { prototype: {} },
    S: cfg.S,
    ROWS: 20, COLS: 30,
    COMBAT_RULES: cfg.COMBAT_RULES,
    LIGHT_RULES: cfg.LIGHT_RULES,
    // Stub Phaser/global helpers — only needed for non-pure methods
    inFOV: (enemy, tx, ty) => true,
    hasLOS: () => true,
    ...extraGlobals,
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.GameScene.prototype;
}

// ── effectiveEnemySight ──────────────────────────────

test('effectiveEnemySight: bright light, not hidden → base sight', () => {
  const sys = loadSightSystem();
  const scene = {
    playerTile: { x: 5, y: 5 },
    playerHidden: false,
    tileLightLevel: () => 2, // bright
  };
  const result = sys.effectiveEnemySight.call(scene, { sight: 8 });
  assert.equal(result, 8);
});

test('effectiveEnemySight: dim light applies dimSightPenalty', () => {
  const sys = loadSightSystem();
  const cfg = loadConfig();
  const scene = {
    playerTile: { x: 5, y: 5 },
    playerHidden: false,
    tileLightLevel: () => 1, // dim
  };
  const result = sys.effectiveEnemySight.call(scene, { sight: 8 });
  assert.equal(result, 8 - cfg.LIGHT_RULES.dimSightPenalty);
});

test('effectiveEnemySight: dark applies darkSightPenalty', () => {
  const sys = loadSightSystem();
  const cfg = loadConfig();
  const scene = {
    playerTile: { x: 5, y: 5 },
    playerHidden: false,
    tileLightLevel: () => 0, // dark
  };
  const result = sys.effectiveEnemySight.call(scene, { sight: 8 });
  assert.equal(result, 8 - cfg.LIGHT_RULES.darkSightPenalty);
});

test('effectiveEnemySight: hidden player reduces sight by hiddenSightPenalty', () => {
  const sys = loadSightSystem();
  const cfg = loadConfig();
  const scene = {
    playerTile: { x: 5, y: 5 },
    playerHidden: true,
    tileLightLevel: () => 2, // bright
  };
  const result = sys.effectiveEnemySight.call(scene, { sight: 8 });
  assert.equal(result, 8 - cfg.LIGHT_RULES.hiddenSightPenalty);
});

test('effectiveEnemySight: dark + hidden stacks both penalties', () => {
  const sys = loadSightSystem();
  const cfg = loadConfig();
  const scene = {
    playerTile: { x: 5, y: 5 },
    playerHidden: true,
    tileLightLevel: () => 0, // dark
  };
  const result = sys.effectiveEnemySight.call(scene, { sight: 8 });
  const expected = Math.max(1, 8 - cfg.LIGHT_RULES.darkSightPenalty - cfg.LIGHT_RULES.hiddenSightPenalty);
  assert.equal(result, expected);
});

test('effectiveEnemySight: never returns less than 1', () => {
  const sys = loadSightSystem();
  const scene = {
    playerTile: { x: 5, y: 5 },
    playerHidden: true,
    tileLightLevel: () => 0, // dark
  };
  // sight=1 with penalties should floor at 1
  const result = sys.effectiveEnemySight.call(scene, { sight: 1 });
  assert.ok(result >= 1, `expected >= 1, got ${result}`);
});

// ── checkSight ───────────────────────────────────────

test('checkSight: does nothing when not in explore mode', () => {
  const sys = loadSightSystem();
  let combatEntered = false;
  const scene = {
    playerTile: { x: 5, y: 5 },
    playerHidden: false,
    enemies: [{ alive: true, inCombat: false, tx: 5, ty: 6, sight: 8, facing: 0, fov: 360 }],
    isExploreMode: () => false,
    effectiveEnemySight: sys.effectiveEnemySight.bind({ playerTile: { x: 5, y: 5 }, playerHidden: false, tileLightLevel: () => 2 }),
    tileLightLevel: () => 2,
    enterCombat: () => { combatEntered = true; },
    checkStealthVsEnemies: () => ({ broken: false, spotters: [] }),
  };
  sys.checkSight.call(scene);
  assert.equal(combatEntered, false);
});

test('checkSight: enters combat when enemy sees player', () => {
  const sys = loadSightSystem({ inFOV: () => true, hasLOS: () => true });
  let combatEnemies = null;
  const enemy = { alive: true, inCombat: false, tx: 5, ty: 6, sight: 8, facing: 0, fov: 360 };
  const scene = {
    playerTile: { x: 5, y: 5 },
    playerHidden: false,
    enemies: [enemy],
    isExploreMode: () => true,
    tileLightLevel: () => 2,
    effectiveEnemySight: sys.effectiveEnemySight,
    enterCombat: (list) => { combatEnemies = list; },
    checkStealthVsEnemies: () => ({ broken: false, spotters: [] }),
  };
  // Bind effectiveEnemySight with scene context for the inner call
  scene.effectiveEnemySight = sys.effectiveEnemySight.bind(scene);
  sys.checkSight.call(scene);
  assert.ok(combatEnemies !== null, 'enterCombat should have been called');
  assert.ok(combatEnemies.includes(enemy));
});

test('checkSight: enemy too far away does not trigger combat', () => {
  const sys = loadSightSystem({ inFOV: () => true, hasLOS: () => true });
  let combatEntered = false;
  const enemy = { alive: true, inCombat: false, tx: 25, ty: 5, sight: 2, facing: 0, fov: 360 };
  const scene = {
    playerTile: { x: 5, y: 5 }, // distance = 20, enemy sight = 2
    playerHidden: false,
    enemies: [enemy],
    isExploreMode: () => true,
    tileLightLevel: () => 2,
    effectiveEnemySight: null,
    enterCombat: () => { combatEntered = true; },
    checkStealthVsEnemies: () => ({ broken: false, spotters: [] }),
  };
  scene.effectiveEnemySight = sys.effectiveEnemySight.bind(scene);
  sys.checkSight.call(scene);
  assert.equal(combatEntered, false);
});

test('checkSight: hidden player triggers stealth check instead of direct combat', () => {
  const sys = loadSightSystem({ inFOV: () => true, hasLOS: () => true });
  let stealthChecked = false;
  let combatEntered = false;
  const enemy = { alive: true, inCombat: false, tx: 5, ty: 6, sight: 8, facing: 0, fov: 360 };
  const scene = {
    playerTile: { x: 5, y: 5 },
    playerHidden: true,
    enemies: [enemy],
    isExploreMode: () => true,
    tileLightLevel: () => 2,
    effectiveEnemySight: null,
    enterCombat: () => { combatEntered = true; },
    checkStealthVsEnemies: (list) => { stealthChecked = true; return { broken: false, spotters: [] }; },
  };
  scene.effectiveEnemySight = sys.effectiveEnemySight.bind(scene);
  sys.checkSight.call(scene);
  assert.equal(stealthChecked, true, 'stealth check should have been called');
  assert.equal(combatEntered, false, 'combat should not have been entered when stealth holds');
});
