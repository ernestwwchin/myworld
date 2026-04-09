const { test, expect } = require('@playwright/test');
const { waitForScene, tapTile } = require('./helpers');

test.describe('Inventory interactions', () => {
  test('pickup item from chest', async ({ page }) => {
    await page.goto('/?map=ts_chest_pickup', { waitUntil: 'networkidle' });
    await waitForScene(page);

    const before = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      return {
        invCount: Array.isArray(scene.pStats?.inventory) ? scene.pStats.inventory.length : 0,
        chestOpen: !!scene.getChestEntity(2, 2)?.open,
      };
    });
    expect(before.chestOpen).toBe(false);

    // Keep player adjacent and open chest via supported scene interaction paths.
    await tapTile(page, 2, 1);
    await page.waitForTimeout(250);

    const openResult = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const viaTry = scene.tryOpenChest(2, 2);
      const viaInteract = viaTry ? null : scene.interactAtTile(2, 2);
      const chest = scene.getChestEntity(2, 2);
      return {
        viaTry,
        viaInteract,
        chestExists: !!chest,
        chestOpen: !!chest?.open,
      };
    });
    expect(openResult.chestExists).toBe(true);
    expect(openResult.chestOpen).toBe(true);

    await page.waitForTimeout(700);

    const after = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      return {
        invCount: Array.isArray(scene.pStats?.inventory) ? scene.pStats.inventory.length : 0,
        chestOpen: !!scene.getChestEntity(2, 2)?.open,
      };
    });

    expect(after.chestOpen).toBe(true);
    expect(after.invCount).toBeGreaterThan(before.invCount);
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
    await page.evaluate(({ dmg, max }) => {
      const scene = window.game.scene.getScene('GameScene');
      scene.playerHP = Math.max(0, max - dmg);
      scene.updateHUD();
    }, { dmg: damageAmount, max: maxHP });

    const damagedHP = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.playerHP;
    });

    expect(damagedHP).toBeLessThan(maxHP);

    // Add healing potion to inventory
    await page.evaluate((max) => {
      const scene = window.game.scene.getScene('GameScene');
      if (!Array.isArray(scene.pStats.inventory)) scene.pStats.inventory = [];
      scene.pStats.inventory.push({
        id: 'potion_heal',
        name: 'Healing Potion',
        type: 'consumable',
        icon: 'P',
        onUse: {
          effects: [{ type: 'heal', amount: '2d4+2' }],
        },
      });

      // Ensure max HP exists for heal cap in case some fixtures omit it.
      if (typeof scene.playerMaxHP !== 'number' || !Number.isFinite(scene.playerMaxHP)) {
        scene.playerMaxHP = max;
      }
    }, maxHP);

    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const potion = scene.pStats.inventory.find((it) => it.id === 'potion_heal');
      scene.useItem(potion);
    });

    await page.waitForTimeout(300);

    const healedHP = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.playerHP;
    });

    expect(healedHP).toBeGreaterThan(damagedHP);
  });
});
