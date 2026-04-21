/**
 * floor-transition-crash.spec.js — Regression test for BUG: fog-system crash
 * on floor transition when map dimensions change.
 *
 * Root cause: transitionToStage() calls applyMap() which updates the global
 * MAP, ROWS, COLS to the new map's dimensions BEFORE the scene restarts.
 * During the 400ms fade-out, the old scene's callbacks can fire
 * updateFogOfWar(), which loops using new ROWS/COLS but fogVisited is still
 * sized for the old map. This causes:
 *   "Cannot read properties of undefined (reading 'N')" at fog-system.js
 *
 * This test deterministically reproduces the crash by:
 *   1. Loading a small test map (ts_autorun_f1, 11×9)
 *   2. Calling applyMap for a large map (gw_b1f, 56×36)
 *   3. Calling updateFogOfWar() on the old scene with stale fogVisited
 */
import { test, expect } from '@playwright/test';
import { waitForScene, seededUrl } from './helpers.ts';

test('floor transition: updateFogOfWar with stale fogVisited does not crash', async ({ page }) => {
  // 1. Load a SMALL test map (ts_autorun_f1 is 11×9)
  await page.goto(seededUrl('/?map=ts_autorun_f1&ignoreSave=1', 42), { waitUntil: 'networkidle' });
  await waitForScene(page);

  const boot = await page.evaluate(() => ({
    floor: window._MAP_META?.floor,
    rows: ROWS,
    cols: COLS,
    fogRows: window.game.scene.getScene('GameScene').fogVisited.length,
  }));
  expect(boot.floor).toBe('TAR1');
  // Confirm the map is small
  expect(boot.rows).toBeLessThan(20);

  // 2. Simulate the race condition:
  //    - Load and apply a LARGE map (changes ROWS/COLS to ~36×56)
  //    - Call updateFogOfWar() on the OLD scene (fogVisited is still 9 rows)
  const result = await page.evaluate(async () => {
    const scene = window.game.scene.getScene('GameScene');
    const oldRows = ROWS;
    const oldFogRows = scene.fogVisited.length;

    // Load and apply the large cave map
    const stageData = await ModLoader.tryLoadStage('gw_b1f');
    if (!stageData) return { error: 'stage not found' };

    const modData = ModLoader._modData;
    modData.maps['gw_b1f'] = {
      name: stageData.name,
      floor: stageData.floor,
      grid: stageData.grid || null,
      generator: stageData.generator || null,
      playerStart: stageData.playerStart || null,
      encounters: stageData.encounters || [],
      lights: stageData.lights || [],
      globalLight: stageData.globalLight || 'dark',
      doors: stageData.doors || [],
      interactables: stageData.interactables || [],
      lootTables: stageData.lootTables || {},
      stageSprites: stageData.stageSprites || [],
      tileAnimations: stageData.tileAnimations || {},
      nextStage: stageData.nextStage || null,
    };
    ModLoader.applyMap(modData, 'gw_b1f');

    const newRows = ROWS;
    const mismatch = oldFogRows !== newRows;

    // Now fogVisited has oldRows entries but ROWS = newRows.
    // This is the exact state that causes the crash.
    try {
      scene.updateFogOfWar();
      return { crashed: false, oldRows, newRows, mismatch };
    } catch (e) {
      return { crashed: true, error: e.message, oldRows, newRows, mismatch };
    }
  });

  // 3. Verify the dimension mismatch existed
  expect(result.mismatch).toBe(true);
  expect(result.newRows).toBeGreaterThan(result.oldRows);

  // 4. The bug: this should NOT crash. Before the fix, crashed = true.
  expect(result.crashed).toBe(false);
});
