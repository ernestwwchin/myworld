import { test, expect } from '@playwright/test';
import { waitForScene, tapTile } from './helpers.js';

test.describe('Inventory interactions', () => {
  test('pickup item from chest', async ({ page }) => {
    await page.goto('/?map=ts_chest_pickup', { waitUntil: 'networkidle' });
    await waitForScene(page);

    const before = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const inv = Array.isArray(scene.pStats?.inventory) ? scene.pStats.inventory : [];
      return {
        invCount: inv.length,
        invQtyTotal: inv.reduce((sum, item) => sum + Math.max(1, Number(item?.qty || 1)), 0),
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
      const inv = Array.isArray(scene.pStats?.inventory) ? scene.pStats.inventory : [];
      return {
        invCount: inv.length,
        invQtyTotal: inv.reduce((sum, item) => sum + Math.max(1, Number(item?.qty || 1)), 0),
        chestOpen: !!scene.getChestEntity(2, 2)?.open,
      };
    });

    expect(after.chestOpen).toBe(true);
    expect(after.invQtyTotal).toBeGreaterThan(before.invQtyTotal);
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

  test('stacking respects maxStack and overflows into new stacks', async ({ page }) => {
    await page.goto('/?map=ts_potion_heal', { waitUntil: 'networkidle' });
    await waitForScene(page);

    const result = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      scene.pStats.inventory = [];

      scene.addItemToInventory({
        id: 'arrow_bundle',
        name: 'Arrows',
        type: 'misc',
        icon: 'A',
        maxStack: 5,
      }, 12);

      if (typeof Hotbar !== 'undefined' && typeof Hotbar.refreshItems === 'function') Hotbar.refreshItems();
      const slot0 = (typeof Hotbar !== 'undefined' && typeof Hotbar.getSlot === 'function')
        ? Hotbar.getSlot('items', 0, 0)
        : null;
      const slot0Name = (typeof Hotbar !== 'undefined' && typeof Hotbar._getSlotName === 'function' && slot0)
        ? Hotbar._getSlotName(slot0)
        : '';

      const stacks = scene.pStats.inventory
        .filter(i => i.id === 'arrow_bundle')
        .map(i => Number(i.qty || 1));

      return { stacks, slot0Name };
    });

    expect(result.stacks).toEqual([5, 5, 2]);
    expect(result.slot0Name).toContain('x5');
  });

  test('using stacked consumable decrements qty by one', async ({ page }) => {
    await page.goto('/?map=ts_potion_heal', { waitUntil: 'networkidle' });
    await waitForScene(page);

    const before = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      scene.pStats.inventory = [];
      const max = scene.playerMaxHP || 20;
      scene.playerHP = Math.max(1, max - 6);
      scene.addItemToInventory({
        id: 'potion_heal',
        name: 'Healing Potion',
        type: 'consumable',
        icon: 'P',
        heal: '2d4+2',
        maxStack: 20,
      }, 3);
      const potion = scene.pStats.inventory.find(i => i.id === 'potion_heal');
      return { hp: scene.playerHP, qty: Number(potion?.qty || 0), invLen: scene.pStats.inventory.length };
    });

    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const potion = scene.pStats.inventory.find(i => i.id === 'potion_heal');
      scene.useItem(potion);
    });

    const after = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const potion = scene.pStats.inventory.find(i => i.id === 'potion_heal');
      return { hp: scene.playerHP, qty: Number(potion?.qty || 0), invLen: scene.pStats.inventory.length };
    });

    expect(before.qty).toBe(3);
    expect(after.qty).toBe(2);
    expect(after.invLen).toBe(1);
    expect(after.hp).toBeGreaterThan(before.hp);
  });
});
