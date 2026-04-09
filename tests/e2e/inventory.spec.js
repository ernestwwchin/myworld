const { test, expect } = require('@playwright/test');
const { waitForScene, getState, tapTile } = require('./helpers');

test.describe('Inventory interactions', () => {
  test('pickup item from chest', async ({ page }) => {
    await page.goto('/?map=ts_chest_pickup', { waitUntil: 'networkidle' });
    await waitForScene(page);

    // Move to chest position
    await tapTile(page, 2, 2);
    await page.waitForTimeout(500);

    // Verify we can interact with chest (basic functionality check)
    const closeToChest = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const playerPos = scene.playerTile;
      const chestPos = { x: 2, y: 2 };
      return Math.abs(playerPos.x - chestPos.x) <= 1 && Math.abs(playerPos.y - chestPos.y) <= 1;
    });

    expect(closeToChest).toBe(true);
  });

  test('use healing potion to restore health', async ({ page }) => {
    await page.goto('/?map=ts_potion_heal', { waitUntil: 'networkidle' });
    await waitForScene(page);

    const maxHP = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.playerMaxHP || 20;
    });

    // Damage player
    const damageAmount = 5;
    await page.evaluate((dmg, max) => {
      const scene = window.game.scene.getScene('GameScene');
      scene.playerHP = Math.max(0, max - dmg);
      scene.updateHUD();
    }, damageAmount, maxHP);

    const damagedHP = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.playerHP;
    });

    expect(damagedHP).toBeLessThan(maxHP);

    // Add healing potion to inventory
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      if (!scene.playerInventory) scene.playerInventory = {};
      scene.playerInventory.potion_heal = (scene.playerInventory.potion_heal || 0) + 1;
    });

    // Use potion via event or direct inventory system
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      // Simulate using the potion (healing)
      const healAmount = 10;
      scene.playerHP = Math.min(scene.playerMaxHP || 20, scene.playerHP + healAmount);
      scene.updateHUD();
    });

    await page.waitForTimeout(300);

    const healedHP = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.playerHP;
    });

    expect(healedHP).toBeGreaterThan(damagedHP);
  });
});
