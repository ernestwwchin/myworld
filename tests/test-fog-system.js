const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();

// Mock global constants and functions for testing
const mockGlobals = {
  ROWS: 20,
  COLS: 30,
  S: 32,
  FOG_RULES: { enabled: true, radius: 7, unvisitedAlpha: 0.78, exploredAlpha: 0.48, exploredColor: 0x3a3f46 },
  COMBAT_RULES: { enemySightScale: 1 },
  LIGHT_RULES: { darkSightPenalty: 3, dimSightPenalty: 1, hiddenSightPenalty: 2 },
  hasLOS: (sx, sy, tx, ty) => {
    // More realistic LOS - only true within a reasonable range
    const dx = Math.abs(tx - sx);
    const dy = Math.abs(ty - sy);
    return dx <= 8 && dy <= 8; // Simple range check
  }
};

function loadFogSystem() {
  const fogSystemPath = path.join(root, 'js', 'systems', 'fog-system.js');
  const code = fs.readFileSync(fogSystemPath, 'utf8');
  
  const sandbox = { 
    console, 
    Math, 
    Object,
    GameScene: { prototype: {} }, // Mock GameScene to prevent reference error
    ...mockGlobals
  };
  vm.createContext(sandbox);
  
  // Execute the fog system code
  vm.runInContext(code, sandbox);
  
  return sandbox;
}

function createMockScene() {
  return {
    playerTile: { x: 5, y: 5 },
    fogLayer: { visible: true },
    _fogCtx: {
      clearRect: () => {},
      fillRect: () => {},
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      createRadialGradient: () => ({ addColorStop: () => {} }),
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      rect: () => {},
      clip: () => {},
      save: () => {},
      restore: () => {},
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData: () => {}
    },
    _fogCanvasTex: { refresh: () => {} },
    fogVisible: null,
    fogVisited: Array.from({length: mockGlobals.ROWS}, () => Array(mockGlobals.COLS).fill(false)),
    enemies: [
      { 
        alive: true, 
        tx: 7, 
        ty: 5, 
        img: { setAlpha: () => {} },
        hpBg: { setAlpha: () => {} },
        hpFg: { setAlpha: () => {} },
        lbl: { setAlpha: () => {} },
        fa: { setAlpha: () => {} }
      },
      { 
        alive: false, 
        tx: 10, 
        ty: 10, 
        img: { setAlpha: () => {} },
        hpBg: { setAlpha: () => {} },
        hpFg: { setAlpha: () => {} },
        lbl: { setAlpha: () => {} },
        fa: { setAlpha: () => {} }
      }
    ],
    mapLights: [
      { x: 8, y: 8, radius: 3, level: 'bright' },
      { x: 2, y: 2, radius: 2, level: 'dim' }
    ],
    globalLight: 'normal',
    playerHidden: false,
    isExploreMode: () => true,
    // Track calls for testing
    calls: {
      updateEnemyVisibilityByFog: 0
    }
  };
}

function testComputeVisibleTiles() {
  const sandbox = loadFogSystem();
  const fogSystem = sandbox.GameScene.prototype;
  const scene = createMockScene();
  
  // Bind method to scene context
  const boundComputeVisibleTiles = fogSystem.computeVisibleTiles.bind(scene);
  
  const visible = boundComputeVisibleTiles();
  
  // Check that visibility array is correct dimensions
  assert.strictEqual(visible.length, mockGlobals.ROWS, 'Visibility array should have correct number of rows');
  assert.strictEqual(visible[0].length, mockGlobals.COLS, 'Visibility array should have correct number of columns');
  
  // Check that tiles within radius are visible
  assert.strictEqual(visible[5][5], true, 'Player tile should be visible');
  assert.strictEqual(visible[5][6], true, 'Adjacent tile should be visible');
  assert.strictEqual(visible[5][4], true, 'Adjacent tile should be visible');
  assert.strictEqual(visible[4][5], true, 'Adjacent tile should be visible');
  assert.strictEqual(visible[6][5], true, 'Adjacent tile should be visible');
  
  // Check that tiles outside radius are not visible (player at 5,5, radius 7)
  assert.strictEqual(visible[5][14], false, 'Tile beyond radius should not be visible'); // Distance 9 from player
  
  console.log('✓ computeVisibleTiles test passed');
}

function testUpdateFogOfWar() {
  const sandbox = loadFogSystem();
  const fogSystem = sandbox.GameScene.prototype;
  const scene = createMockScene();
  
  // Mock updateEnemyVisibilityByFog to track calls
  scene.updateEnemyVisibilityByFog = () => {
    scene.calls.updateEnemyVisibilityByFog++;
  };
  
  const boundUpdateFogOfWar = fogSystem.updateFogOfWar.bind(scene);
  boundUpdateFogOfWar();
  
  // Check that fogVisible was computed
  assert.ok(scene.fogVisible !== null, 'fogVisible should be computed');
  assert.strictEqual(scene.fogVisible.length, mockGlobals.ROWS, 'fogVisible should have correct dimensions');
  
  // Check that updateEnemyVisibilityByFog was called
  assert.strictEqual(scene.calls.updateEnemyVisibilityByFog, 1, 'updateEnemyVisibilityByFog should be called');
  
  console.log('✓ updateFogOfWar test passed');
}

function testUpdateEnemyVisibilityByFog() {
  const sandbox = loadFogSystem();
  const fogSystem = sandbox.GameScene.prototype;
  const scene = createMockScene();
  
  // Set up fogVisible to make enemy at (7,5) visible
  scene.fogVisible = Array.from({length: mockGlobals.ROWS}, () => Array(mockGlobals.COLS).fill(false));
  scene.fogVisible[5][7] = true; // Enemy at (7,5) is visible
  
  // Track alpha calls
  const alphaCalls = [];
  scene.enemies[0].img.setAlpha = (a) => alphaCalls.push({ enemy: 0, component: 'img', alpha: a });
  scene.enemies[0].lbl.setAlpha = (a) => alphaCalls.push({ enemy: 0, component: 'lbl', alpha: a });
  
  const boundUpdateEnemyVisibilityByFog = fogSystem.updateEnemyVisibilityByFog.bind(scene);
  boundUpdateEnemyVisibilityByFog();
  
  // Check that alive enemy visibility was updated
  const enemy0Calls = alphaCalls.filter(c => c.enemy === 0);
  assert.ok(enemy0Calls.length > 0, 'Alive enemy should have visibility updated');
  
  // Check that dead enemy was not processed
  const enemy1Calls = alphaCalls.filter(c => c.enemy === 1);
  assert.strictEqual(enemy1Calls.length, 0, 'Dead enemy should not be processed');
  
  console.log('✓ updateEnemyVisibilityByFog test passed');
}

function testIsTileVisibleToPlayer() {
  const sandbox = loadFogSystem();
  const fogSystem = sandbox.GameScene.prototype;
  const scene = createMockScene();

  // Test with fogVisible not set (should fall back to LOS)
  const boundIsTileVisibleToPlayer = fogSystem.isTileVisibleToPlayer.bind(scene);
  assert.strictEqual(boundIsTileVisibleToPlayer(5, 5), true, 'Player tile should be visible without fogVisible');

  // Test with fogVisible set
  scene.fogVisible = Array.from({length: mockGlobals.ROWS}, () => Array(mockGlobals.COLS).fill(false));
  scene.fogVisible[5][6] = true;

  assert.strictEqual(boundIsTileVisibleToPlayer(5, 6), true, 'Tile set in fogVisible should be visible');
  assert.strictEqual(boundIsTileVisibleToPlayer(5, 7), false, 'Tile not set in fogVisible should not be visible');

  // Test with invalid coordinates
  assert.strictEqual(boundIsTileVisibleToPlayer(-1, 5), false, 'Invalid coordinates should return false');
  assert.strictEqual(boundIsTileVisibleToPlayer(5, 100), false, 'Invalid coordinates should return false');
  
  console.log('✓ isTileVisibleToPlayer test passed');
}

function testTileLightLevel() {
  const sandbox = loadFogSystem();
  const fogSystem = sandbox.GameScene.prototype;
  const scene = createMockScene();

  const boundTileLightLevel = fogSystem.tileLightLevel.bind(scene);

  // Test with global light
  scene.globalLight = 'bright';
  assert.strictEqual(boundTileLightLevel(0, 0), 2, 'Global bright light should return level 2');

  scene.globalLight = 'dim';
  assert.strictEqual(boundTileLightLevel(0, 0), 1, 'Global dim light should return level 1');

  scene.globalLight = 'normal';
  assert.strictEqual(boundTileLightLevel(0, 0), 0, 'Global normal light should return level 0');

  // Test with map lights
  scene.globalLight = 'normal';
  assert.strictEqual(boundTileLightLevel(8, 8), 2, 'Tile at bright light source should return level 2');
  assert.strictEqual(boundTileLightLevel(2, 2), 1, 'Tile at dim light source should return level 1');

  // Test outside light radius
  assert.strictEqual(boundTileLightLevel(15, 15), 0, 'Tile far from lights should return level 0');
  
  console.log('✓ tileLightLevel test passed');
}

function testEffectiveEnemySight() {
  const sandbox = loadFogSystem();
  const fogSystem = sandbox.GameScene.prototype;
  const scene = createMockScene();

  const boundEffectiveEnemySight = fogSystem.effectiveEnemySight.bind(scene);
  const enemy = { sight: 10 };

  // Test base sight
  assert.strictEqual(boundEffectiveEnemySight(enemy), 10, 'Base enemy sight should be returned');

  // Test with darkness penalty
  scene.globalLight = 'normal';
  scene.playerTile = { x: 15, y: 15 }; // Far from lights
  assert.strictEqual(boundEffectiveEnemySight(enemy), 7, 'Darkness should reduce sight by 3');

  // Test with dim light penalty
  scene.mapLights = [{ x: 15, y: 15, radius: 5, level: 'dim' }];
  assert.strictEqual(boundEffectiveEnemySight(enemy), 9, 'Dim light should reduce sight by 1');

  // Test with hidden penalty
  scene.playerHidden = true;
  assert.strictEqual(boundEffectiveEnemySight(enemy), 7, 'Hidden should reduce sight by 2 in dim light');

  // Test minimum sight of 1
  scene.playerHidden = true;
  scene.globalLight = 'normal';
  scene.mapLights = [];
  const weakEnemy = { sight: 2 };
  assert.strictEqual(boundEffectiveEnemySight(weakEnemy), 1, 'Sight should not go below 1');
  
  console.log('✓ effectiveEnemySight test passed');
}

function testSyncEnemySightRings() {
  const sandbox = loadFogSystem();
  const fogSystem = sandbox.GameScene.prototype;
  const scene = createMockScene();

  // Add sight rings to enemies
  scene.enemies[0].sightRing = { 
    setRadius: () => {},
    setAlpha: (a) => { scene.enemies[0].sightRing.alpha = a; }
  };
  scene.enemies[1].sightRing = { 
    setRadius: () => {},
    setAlpha: (a) => { scene.enemies[1].sightRing.alpha = a; }
  };

  const boundSyncEnemySightRings = fogSystem.syncEnemySightRings.bind(scene);

  // Test show = true
  boundSyncEnemySightRings(true);
  assert.strictEqual(scene.enemies[0].sightRing.alpha, 0.3, 'Alive enemy sight ring should be shown');

  // Test show = false
  boundSyncEnemySightRings(false);
  assert.strictEqual(scene.enemies[0].sightRing.alpha, 0, 'Alive enemy sight ring should be hidden');

  // Test enemy in combat
  scene.enemies[0].inCombat = true;
  boundSyncEnemySightRings(true);
  assert.strictEqual(scene.enemies[0].sightRing.alpha, 0, 'Enemy in combat should not show sight ring');
  
  console.log('✓ syncEnemySightRings test passed');
}

function run() {
  console.log('Running fog-system.js tests...');
  
  testComputeVisibleTiles();
  testUpdateFogOfWar();
  testUpdateEnemyVisibilityByFog();
  testIsTileVisibleToPlayer();
  testTileLightLevel();
  testEffectiveEnemySight();
  testSyncEnemySightRings();
  
  console.log('All fog-system.js tests passed!\n');
}

if (require.main === module) {
  run();
}

module.exports = { run };
