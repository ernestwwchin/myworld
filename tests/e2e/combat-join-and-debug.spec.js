const { test, expect } = require('@playwright/test');
const { waitForScene } = require('./helpers');

test('combat start logs one join-reasons line', async ({ page }) => {
  await page.goto('/?map=ts_combat_join_reasons', { waitUntil: 'networkidle' });
  await waitForScene(page);

  const result = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const trigger = scene.enemies.find((e) => e.alive && e.tx === 5 && e.ty === 4);
    if (!trigger) throw new Error('Trigger enemy not found');

    // Force this small test map into the large-room branch deterministically.
    COMBAT_RULES.largeRoomTileThreshold = 1;
    COMBAT_RULES.largeRoomJoinDistance = 3;

    scene.enterCombat([trigger]);

    const lines = Array.from(document.querySelectorAll('#combat-log-body .cl-line')).map((el) => el.textContent || '');
    const reasonLines = lines.filter((t) => t.includes('Join reasons:'));

    return {
      reasonCount: reasonLines.length,
      reasonLine: reasonLines[0] || '',
    };
  });

  expect(result.reasonCount).toBe(1);
  expect(result.reasonLine).toContain('Join reasons:');
  expect(result.reasonLine).toContain('trigger');
});

test('enemy sight debug renders overlays in combat mode', async ({ page }) => {
  await page.goto('/?map=ts_combat_join_reasons', { waitUntil: 'networkidle' });
  await waitForScene(page);

  const debugState = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const trigger = scene.enemies.find((e) => e.alive && e.tx === 5 && e.ty === 4);
    if (!trigger) throw new Error('Trigger enemy not found');

    scene.enemySightEnabled = false;
    scene.enterCombat([trigger]);
    scene.toggleEnemySight();

    const hasLines = (scene.sightTiles || []).length > 0;
    const combatRingVisible = scene.enemies.some((e) => e.alive && e.inCombat && e.sightRing && e.sightRing.alpha > 0);
    return {
      hasLines,
      combatRingVisible,
      enemySightEnabled: !!scene.enemySightEnabled,
      mode: scene.mode,
    };
  });

  expect(debugState.mode).toBe('combat');
  expect(debugState.enemySightEnabled).toBe(true);
  expect(debugState.hasLines).toBe(true);
  expect(debugState.combatRingVisible).toBe(true);
});
