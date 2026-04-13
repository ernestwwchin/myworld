const { test, expect } = require('@playwright/test');
const { waitForScene, getState, tapTile, waitUntilIdle, seededUrl } = require('./helpers');

test('run progression smoke: town portal -> auto floor -> extract to town', async ({ page }) => {
  await page.goto(seededUrl('/', 314159), { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    localStorage.removeItem('myworld.save.v1');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await waitForScene(page);

  const boot = await getState(page);
  expect(boot.floor).toBe('TOWN');

  const portal = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const ent = scene.getEntityById('town_portal_w1');
    return ent ? { x: ent.x, y: ent.y } : null;
  });
  expect(portal).not.toBeNull();

  await tapTile(page, portal.x, portal.y);
  await page.waitForFunction(() => window._MAP_META?.floor === 'B1F', { timeout: 20000 });
  await waitForScene(page);
  await waitUntilIdle(page);

  const expectedNext = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    return ModLoader.resolveNextStage(window._MAP_META?.nextStage, scene);
  });
  expect(expectedNext).toBe('gw_b2f');

  const hasExtract = await page.evaluate(() => {
    return (window._MAP_META?.interactables || []).some((it) => String(it?.state?.targetStage || '').toLowerCase() === 'town');
  });
  expect(hasExtract).toBe(true);

  await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    ModLoader.resolveRunOutcome(scene, 'extract');
  });

  await page.waitForFunction(() => window._MAP_META?.floor === 'TOWN', { timeout: 20000 });
  await waitForScene(page);
  await waitUntilIdle(page);

  const finalState = await getState(page);
  expect(finalState.floor).toBe('TOWN');
});
