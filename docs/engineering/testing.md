---
tags: [myworld, engineering, testing]
---

# Testing & Debugging

How tests are organized and patterns for writing new ones. Read when adding tests or debugging.

## Test layers

| Layer | Path | What it covers |
|---|---|---|
| Contracts | `tests/contracts/` | Schema/structural assertions on YAML, mod metadata, registry resolution. Custom runner: `node tests/contracts/run-contracts.mjs`. |
| Unit / pure | `tests/unit/pure/` | Pure helper logic — no game globals required. Run via vitest. |
| Unit / sandbox | `tests/unit/sandbox/` | Imports directly from `src/` like unit/pure, but mutates singleton state (e.g. `ModLoader._modData`) and uses `beforeEach` resets. Run via vitest. |
| E2E | `tests/e2e/` | Playwright against `vite preview` on port 3100. Shared boot/teardown in `tests/e2e/helpers.js`. |

## Commands

```bash
npm test                    # typecheck + contracts + unit (fast, no browser)
npm run test:contracts      # contracts only
npm run test:unit           # unit/pure + unit/sandbox (vitest)
npm run test:e2e            # build + Playwright against vite preview
npm run test:e2e:headed     # headed + single worker (debugging)

# Run one test:
npx vitest run tests/unit/sandbox/modloader-auto-transition.test.js
npx playwright test tests/e2e/combat-attacks.spec.js --config tests/e2e/playwright.config.ts
```

If Playwright reports a missing browser: `npx playwright install chromium`.

## Sandbox test pattern

For tests that mutate singleton state, import directly and reset in `beforeEach`:

```javascript
import { test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { ModLoader } from '../../../src/modloader.ts';
import { PLAYER_STATS } from '../../../src/config.ts';

beforeEach(() => {
  ModLoader._modData = null;
  ModLoader._runState = null;
  ModLoader._activeMap = null;
  PLAYER_STATS.inventory = [];
  PLAYER_STATS.gold = 0;
});

test('descriptive name', () => {
  ModLoader._modData = { /* ... */ };
  // ... arrange / act / assert
});
```

Reference: `tests/unit/sandbox/modloader-auto-transition.test.js` for a fully worked example covering 15 edge cases.

## Mixin/method binding pattern

For systems that mix into `GameScene.prototype` and rely on `this`, bind to a mock scene:

```typescript
const bound = system.someMethod.bind(scene);
const result = bound(arg1, arg2);
```

## Debugging helpers

```typescript
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
