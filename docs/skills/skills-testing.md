# Skills: Testing & Debugging

Patterns for writing tests and debugging issues. Load when writing tests or investigating bugs.

## Test Structure

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();

function loadSystem(systemFile, extraGlobals = {}) {
  const code = fs.readFileSync(path.join(root, 'js', 'systems', systemFile), 'utf8');
  const sandbox = {
    console, Math, Object,
    GameScene: { prototype: {} },
    // Add required globals (ROWS, COLS, S, FOG_RULES, etc.)
    ...extraGlobals
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}
```

## Method Binding Pattern

Extracted modules use `this` — bind methods to a mock scene for testing:

```javascript
function testSomeMethod() {
  const sandbox = loadSystem('fog-system.js', { ROWS: 20, COLS: 30, ... });
  const system = sandbox.GameScene.prototype;
  const scene = createMockScene();

  const bound = system.someMethod.bind(scene);
  const result = bound(arg1, arg2);

  assert.strictEqual(result, expected, 'Description');
  console.log('✓ someMethod test passed');
}
```

## Mock Scene Template

```javascript
function createMockScene() {
  return {
    playerTile: { x: 5, y: 5 },
    fogLayer: { clear: () => {}, fillStyle: () => {}, fillRect: () => {} },
    fogVisible: null,
    fogVisited: Array.from({ length: ROWS }, () => Array(COLS).fill(false)),
    enemies: [
      { alive: true, tx: 7, ty: 5, sight: 8,
        img: { setAlpha: () => {} }, hpBg: { setAlpha: () => {} },
        hpFg: { setAlpha: () => {} }, lbl: { setAlpha: () => {} } }
    ],
    mapLights: [],
    globalLight: 'normal',
    playerHidden: false,
    isExploreMode: () => true,
  };
}
```

## Debugging Helpers

```javascript
// Context-tagged logging
console.log('[FogSystem] computeVisibleTiles:', { px, py, radius });

// State validation guard
if (!this.fogVisible) {
  console.warn('[FogSystem] fogVisible not initialized');
  return;
}

// Performance timing
const t0 = performance.now();
// ... operation ...
console.log(`[Perf] Operation took ${(performance.now() - t0).toFixed(1)}ms`);
```

## Running Tests

```bash
node tests/run-tests.js          # All tests
node tests/test-fog-system.js    # Specific system
```

## Common Pitfalls

1. **Forgot to bind `this`** — extracted methods need `.bind(scene)` in tests
2. **Missing globals in sandbox** — add all required constants to `vm.createContext`
3. **Array bounds** — always validate `tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS`
4. **Stale mocks** — create fresh mock scene per test function
