import { test, expect } from '@playwright/test';
import { waitForScene, getState, tapTile } from './helpers.js';

test('floor transition moves to the next stage', async ({ page }) => {
  await page.goto('/?map=ts_floor_transition_a', { waitUntil: 'networkidle' });
  await waitForScene(page);

  const before = await getState(page);
  expect(before.floor).toBe('TFA');
  expect(before.stairsPos).toEqual({ x: 5, y: 4 });
  expect(before.nextStage).toBe('ts_floor_transition_b');

  await tapTile(page, 5, 4);
  await page.waitForFunction(() => window._MAP_META?.floor === 'TFB');

  const after = await getState(page);
  expect(after.floor).toBe('TFB');
  expect(after.playerTile).toEqual({ x: 5, y: 4 });
});
