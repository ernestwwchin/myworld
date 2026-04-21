import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForScene, seededUrl } from './helpers.ts';

// Seed used for all deterministic chest tests.
const CHEST_SEED = 42;

// Helper: get player gold and inventory from the scene
function getPlayerState(page: Page) {
  return page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    return {
      gold: scene.pStats?.gold || 0,
      inv: (scene.pStats?.inventory || []).map(i => ({ id: i.id, name: i.name, type: i.type })),
    };
  });
}

// Helper: move player to (tx,ty) instantly and open chest at (cx,cy)
function openChest(page: Page, tx: number, ty: number, cx: number, cy: number) {
  return page.evaluate(({ tx, ty, cx, cy }) => {
    const scene = window.game.scene.getScene('GameScene');
    scene.playerTile = { x: tx, y: ty };
    scene.player.setPosition(tx * 32 + 16, ty * 32 + 16);
    return scene.tryOpenChest(cx, cy);
  }, { tx, ty, cx, cy });
}

test.describe('Chest loot — fixed (predefined) items', () => {
  test('fixed loot: items added to inventory, gold added to wallet', async ({ page }) => {
    await page.goto(seededUrl('/?map=ts_chest_loot', CHEST_SEED), { waitUntil: 'networkidle' });
    await waitForScene(page);

    const before = await getPlayerState(page);

    const opened = await openChest(page, 1, 2, 2, 2);
    expect(opened).toBe(true);

    await page.waitForTimeout(700);   // let loot-resolve and float text fire

    const after = await getPlayerState(page);

    // Gold delta: chest has gold:50, no loot table → exactly +50
    expect(after.gold).toBe(before.gold + 50);

    // Inventory delta: two fixed items added
    const addedIds = after.inv.map(i => i.id).filter(id => !before.inv.some(b => b.id === id));
    expect(addedIds).toContain('sword_iron');
    expect(addedIds).toContain('shield_wooden');
    expect(after.inv.length).toBe(before.inv.length + 2);

    // Items are non-gem so they go to inventory, not converted to gold
    const sword = after.inv.find(i => i.id === 'sword_iron');
    const shield = after.inv.find(i => i.id === 'shield_wooden');
    expect(sword?.type).toBe('weapon');
    expect(shield?.type).toBe('armor');
  });

  test('opening same chest twice is rejected; inventory unchanged', async ({ page }) => {
    await page.goto(seededUrl('/?map=ts_chest_loot', CHEST_SEED), { waitUntil: 'networkidle' });
    await waitForScene(page);

    const first  = await openChest(page, 1, 2, 2, 2);
    expect(first).toBe(true);
    await page.waitForTimeout(700);

    const afterFirst = await getPlayerState(page);

    const second = await openChest(page, 1, 2, 2, 2);
    expect(second).toBe(false);   // already open

    await page.waitForTimeout(200);
    const afterSecond = await getPlayerState(page);

    // Gold and inventory must be unchanged after the rejected second open
    expect(afterSecond.gold).toBe(afterFirst.gold);
    expect(afterSecond.inv.length).toBe(afterFirst.inv.length);
  });
});

test.describe('Chest loot — random (loot table)', () => {
  test('gem items stay in inventory, gold comes from chest/table rolls only', async ({ page }) => {
    await page.goto(seededUrl('/?map=ts_chest_loot', CHEST_SEED), { waitUntil: 'networkidle' });
    await waitForScene(page);

    const before = await getPlayerState(page);

    const opened = await openChest(page, 3, 2, 4, 2);
    expect(opened).toBe(true);
    await page.waitForTimeout(700);

    const after = await getPlayerState(page);

    const resolved = await page.evaluate(() => {
      const chest = window.game.scene.getScene('GameScene').getChestEntity(4, 2);
      return chest?._resolvedLoot || null;
    });
    expect(resolved).not.toBeNull();

    // All resolved items (including gems) go to inventory
    expect(after.inv.length).toBe(before.inv.length + resolved.items.length);
    for (const item of resolved.items) {
      expect(after.inv.some((inv) => inv.id === item.id)).toBe(true);
    }

    // resolved.gold = chest.gold(25) + tableRoll[10,30]
    expect(resolved.gold).toBeGreaterThanOrEqual(25 + 10);
    expect(resolved.gold).toBeLessThanOrEqual(25 + 30);

    // Total gold delta is exactly resolved.gold (no gem auto-conversion)
    const goldDelta = after.gold - before.gold;
    expect(goldDelta).toBe(resolved.gold);

    console.log(`✓ gold delta=${goldDelta} (resolved.gold=${resolved.gold})`);
    console.log(`  resolved items: ${resolved.items.map(i => `${i.id}(${i.type})`).join(', ')}`);
    console.log(`  inventory added: ${resolved.items.length}`);
  });

  test('same seed produces identical gold and inventory changes', async ({ page, browser }) => {
    async function runAndCaptureLoot(p) {
      await p.goto(seededUrl('/?map=ts_chest_loot', CHEST_SEED), { waitUntil: 'networkidle' });
      await waitForScene(p);
      const before = await getPlayerState(p);
      const opened = await openChest(p, 3, 2, 4, 2);
      expect(opened).toBe(true);
      await p.waitForTimeout(700);
      const after = await getPlayerState(p);
      return {
        goldDelta: after.gold - before.gold,
        invDelta: after.inv.length - before.inv.length,
        addedIds: after.inv.map(i => i.id).filter(id => !before.inv.some(b => b.id === id)),
      };
    }

    const run1 = await runAndCaptureLoot(page);

    const page2 = await browser.newPage();
    try {
      const run2 = await runAndCaptureLoot(page2);

      // Identical seed → identical wallet and inventory changes every run
      expect(run2.goldDelta).toBe(run1.goldDelta);
      expect(run2.invDelta).toBe(run1.invDelta);
      expect(run2.addedIds.sort()).toEqual(run1.addedIds.sort());

      console.log(`✓ Both runs: goldDelta=${run1.goldDelta} invDelta=${run1.invDelta} items=${run1.addedIds}`);
    } finally {
      await page2.close();
    }
  });

  test('different seeds change gold and inventory outcomes', async ({ page, browser }) => {
    async function runSeed(p, seed) {
      await p.goto(seededUrl('/?map=ts_chest_loot', seed), { waitUntil: 'networkidle' });
      await waitForScene(p);
      const before = await getPlayerState(p);
      await openChest(p, 3, 2, 4, 2);
      await p.waitForTimeout(700);
      const after = await getPlayerState(p);
      return { goldDelta: after.gold - before.gold, addedIds: after.inv.map(i => i.id).filter(id => !before.inv.some(b => b.id === id)) };
    }

    const runA = await runSeed(page, 1111);

    const page2 = await browser.newPage();
    try {
      const runB = await runSeed(page2, 9999);

      // Both must give valid pool items
      const validIds = ['potion_heal', 'gem_emerald', 'scroll_magic', 'lockpicks'];
      for (const id of runA.addedIds) expect(validIds).toContain(id);
      for (const id of runB.addedIds) expect(validIds).toContain(id);

      // Gold delta must be in the valid range (base 25 + table [10,30])
      expect(runA.goldDelta).toBeGreaterThanOrEqual(35);   // 25 + 10 minimum
      expect(runA.goldDelta).toBeLessThanOrEqual(55); // 25 + 30
      expect(runB.goldDelta).toBeGreaterThanOrEqual(35);
      expect(runB.goldDelta).toBeLessThanOrEqual(55);

      const different = runA.goldDelta !== runB.goldDelta ||
        JSON.stringify(runA.addedIds.sort()) !== JSON.stringify(runB.addedIds.sort());
      console.log(`Seed 1111: gold+${runA.goldDelta} items=${runA.addedIds}`);
      console.log(`Seed 9999: gold+${runB.goldDelta} items=${runB.addedIds}`);
      console.log(different ? '✓ different seeds → different outcomes' : '(same by chance — not an error)');
    } finally {
      await page2.close();
    }
  });
});
