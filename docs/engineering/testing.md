---
tags: [myworld, engineering, testing]
---

# Testing & Debugging

How tests are organized and patterns for writing new ones. Read when adding tests or debugging.

## Test layers

| Layer | Path | What it covers |
|---|---|---|
| Contracts | `tests/contracts/` | Schema/structural assertions on YAML, mod metadata, registry resolution. Custom runner: `node tests/contracts/run-contracts.js`. |
| Unit / pure | `tests/unit/pure/` | Pure helper logic — no game globals required. |
| Unit / sandbox | `tests/unit/sandbox/` | Loads browser-only files (e.g. `js/modloader.js`) into a `vm.createContext` sandbox. Use this for any browser-dependent code. |
| E2E | `tests/e2e/` | Playwright against a live server on port 3100. Shared boot/teardown in `tests/e2e/helpers.js`. |

## Commands

```bash
npm test                    # contracts + unit (fast, no browser)
npm run test:contracts      # contracts only
npm run test:unit           # unit/pure + unit/sandbox
npm run test:e2e            # Playwright (boots server on 3100)
npm run test:e2e:headed     # headed + single worker (debugging)

# Run one test:
node --test tests/unit/sandbox/modloader-auto-transition.test.js
npx playwright test tests/e2e/combat-attacks.spec.js --config tests/e2e/playwright.config.js
```

If Playwright reports a missing browser: `npx playwright install chromium`. If `node_modules/.bin/playwright` is 0 bytes, restore with `ln -s ../playwright/cli.js node_modules/.bin/playwright`.

## Sandbox test pattern

For browser-only files (no `require`/`module.exports`), load into a vm sandbox:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readText } = require('../_shared/io');

function loadModLoader() {
  const src = readText('js/modloader.js');
  const sandbox = {
    console, Math, JSON, Date,
    PLAYER_STATS: { inventory: [], gold: 0 },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${src}\nthis.__ModLoader = ModLoader;`, sandbox);
  return sandbox.__ModLoader;
}

test('descriptive name', () => {
  const mod = loadModLoader();
  // ... arrange / act / assert
});
```

Reference: `tests/unit/sandbox/modloader-auto-transition.test.js` for a fully worked example covering 15 edge cases.

## Mixin/method binding pattern

For systems that mix into `GameScene.prototype` and rely on `this`, bind to a mock scene:

```javascript
const bound = system.someMethod.bind(scene);
const result = bound(arg1, arg2);
```

## Debugging helpers

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

## Common pitfalls

1. **Forgot to bind `this`** — extracted methods need `.bind(scene)` in tests.
2. **Missing globals in sandbox** — add all required constants to the `vm.createContext` sandbox.
3. **Array bounds** — always validate `tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS`.
4. **Stale mocks** — create a fresh mock scene per test function.
5. **Phaser refs after destroy** — null them out and guard with `.active` (root cause of post-kill freeze bugs).
