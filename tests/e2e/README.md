# E2E Tests (Playwright)

## Overview
End-to-end tests exercise full gameplay flows using a real browser instance. Tests use Playwright to interact with the DOM and game state via `window.game`.

## Running E2E Tests

### Prerequisites
- Game server must be accessible at `http://127.0.0.1:3000`
- Tests automatically start the server via npm start (see `playwright.config.js`)

### Run all e2e tests
```bash
npm run test:e2e
```

### Run with browser visible (headed mode)
```bash
npx playwright test --config tests/e2e/playwright.config.js --headed
```

### Run a single test file
```bash
npx playwright test tests/e2e/combat.spec.js --config tests/e2e/playwright.config.js
```

## Test Structure

**Shared helpers** (`helpers.js`):
- `waitForScene(page)` — Wait for game to fully load
- `getState(page)` — Snapshot current game state
- `tapTile(page, x, y)` — Player movement
- `dismissDiceIfNeeded(page)` — Handle dice UI

**Test files** (each test is independent):
- `combat.spec.js` — Combat mechanics (reset anchors, cleanup)
- `combat-attacks.spec.js` — Attack scenarios (hit, miss, kill)
- `movement.spec.js` — Stage transitions and floor changes
- `inventory.spec.js` — Item pickup and potion usage

## Browser Locking

**Q: Are tests locked to the browser?**  
**A: Yes, intentionally.** E2E tests verify full browser integration. Unlike unit tests (pure JS, fast), e2e tests:
- Run against real game render (Phaser)
- Test DOM interactions (clicks, taps)
- Verify game state changes via `window.game`
- Execute full gameplay flows

This is correct for e2e. Unit tests (`tests/unit/`) remain browser-independent.

## Test Stages

Deterministic test stages in `data/00_core_test/stages/`:
- `ts_combat_reset` — Combat test setup
- `ts_melee_attack` — Single weak enemy
- `ts_enemy_attack` — Enemy turns
- `ts_chest_pickup` — Chest interaction
- `ts_potion_heal` — Healing mechanics
- `ts_floor_transition_a/b` — Stage transition

All stages are disabled in normal gameplay (`enabled: false` in meta.yaml).

## Common Issues

### Tests timeout/hang
- Check that local server is accessible: `curl http://127.0.0.1:3000`
- Increase playwright timeout: `test.setTimeout(60000)` in spec files
- Run with `--headed` to see what's happening in the browser

### `window.game is undefined`
- Game hasn't loaded yet — `waitForScene()` should handle this
- Check network requests in headed mode (`--headed`)
- Verify `data/00_core_test/stages/<stage>/stage.yaml` exists

### Tests fail intermittently
- Browser timing may be slow — e2e tests have built-in waits but can be flaky
- Better approach: use deterministic test data (fixed enemy HP, fixed rolls)
- See `tests/e2e/combat-attacks.spec.js` for roll mocking example

## Architecture

```
tests/e2e/
├── helpers.js              # Shared utilities (waitForScene, getState, tapTile)
├── combat.spec.js          # Combat reset & cleanup tests
├── combat-attacks.spec.js  # Attack outcome tests (hit/miss/kill)
├── movement.spec.js        # Floor transition tests
├── inventory.spec.js       # Item & potion tests
└── playwright.config.js    # Browser config (headless, timeout, server)
```

## Adding New Tests

1. Create `new-feature.spec.js` in `tests/e2e/`
2. Import helpers: `const { waitForScene, getState, tapTile } = require('./helpers');`
3. Create deterministic test stage in `data/00_core_test/stages/ts_feature_name/`
4. Use `page.goto('/?map=ts_feature_name')` to load stage
5. Call helpers for robustness (waitForScene, waits, evaluation)

Example:
```javascript
const { test, expect } = require('@playwright/test');
const { waitForScene, getState, tapTile } = require('./helpers');

test('feature works correctly', async ({ page }) => {
  await page.goto('/?map=ts_feature_name', { waitUntil: 'networkidle' });
  await waitForScene(page);
  
  const before = await getState(page);
  // ... test actions ...
  const after = await getState(page);
  
  expect(after.playerTile).toEqual({ x: 3, y: 4 });
});
```
