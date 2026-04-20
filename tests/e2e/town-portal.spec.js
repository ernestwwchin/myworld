import { test, expect } from '@playwright/test';
import { waitForScene, getState, tapTile, waitUntilIdle, seededUrl } from './helpers.js';

test('fresh town start can enter the Goblin Warren through the portal', async ({ page }) => {
  await page.goto(seededUrl('/', 424242), { waitUntil: 'networkidle' });

  // Force a clean boot path so saved progress cannot hide the town-start regression.
  await page.evaluate(() => {
    localStorage.removeItem('myworld.save.v1');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await waitForScene(page);

  const before = await getState(page);
  expect(before.floor).toBe('TOWN');

  const portal = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const ent = scene.getEntityById('town_portal_w1');
    return ent ? { x: ent.x, y: ent.y, label: ent.getLabel() } : null;
  });

  expect(portal).not.toBeNull();
  expect(portal.label).toContain('Portal');

  await tapTile(page, portal.x, portal.y);

  await page.waitForFunction(() => {
    return window._MAP_META?.floor === 'B1F' && window._MAP_META?.nextStage === 'auto';
  }, { timeout: 15000 });
  await waitForScene(page);
  await waitUntilIdle(page);

  const after = await getState(page);
  expect(after.floor).toBe('B1F');
  expect(after.nextStage).toBe('auto');
});