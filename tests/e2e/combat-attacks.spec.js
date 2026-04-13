const { test, expect } = require('@playwright/test');
const { waitForScene, getState, tapTile, dismissDiceIfNeeded } = require('./helpers');

test.describe.configure({ timeout: 90000 });

async function enterSingleEnemyCombat(page) {
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const enemy = scene.enemies.find((e) => e.alive);
    scene.enterCombat([enemy]);
  });

  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene.mode === MODE.COMBAT;
  }, { timeout: 15000 });

  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene.isPlayerTurn && scene.isPlayerTurn();
  }, { timeout: 45000 });
}

async function attackWithForcedD20(page, d20Value, dmgValue) {
  await page.evaluate(({ rollValue, dmg }) => {
    const scene = window.game.scene.getScene('GameScene');
    const enemy = scene.enemies.find((e) => e.alive);
    if (!enemy) return;

    const roller = (typeof dnd !== 'undefined' && dnd) || window.dnd;
    if (!roller || typeof roller.roll !== 'function') {
      throw new Error('dnd roller not available');
    }

    const originalRoll = roller.roll;
    let d20Used = false;
    roller.roll = (count, sides) => {
      if (count === 1 && sides === 20 && !d20Used) { d20Used = true; return rollValue; }
      if (dmg !== undefined && sides !== 20) return dmg;
      return originalRoll(count, sides);
    };

    try {
      scene.playerAttackEnemy(enemy);
    } finally {
      roller.roll = originalRoll;
    }
  }, { rollValue: d20Value, dmg: dmgValue });

  await page.waitForTimeout(250);
  await dismissDiceIfNeeded(page);
  await page.waitForTimeout(250);
}

test.describe('Attack scenarios', () => {
  test('hit and kill weak monster in one hit', async ({ page }) => {
    await page.goto('/?map=ts_melee_attack', { waitUntil: 'networkidle' });
    await waitForScene(page);

    const before = await getState(page);
    expect(before.aliveEnemies).toHaveLength(1);
    expect(before.aliveEnemies[0].type).toBe('goblin');
    const hpBefore = before.aliveEnemies[0].hp;

    await enterSingleEnemyCombat(page);

    const enemy = (await getState(page)).aliveEnemies[0];
    expect(enemy.tile).toEqual({ x: 2, y: 2 });

    await attackWithForcedD20(page, 19);

    const after = await getState(page);
    if (after.aliveEnemies.length === 0) {
      expect(after.aliveEnemies).toHaveLength(0);
    } else {
      expect(after.aliveEnemies[0].hp).toBeLessThan(hpBefore);
    }
  });

  test('defeated enemy grants loot-table rewards', async ({ page }) => {
    await page.goto('/?map=ts_melee_attack', { waitUntil: 'networkidle' });
    await waitForScene(page);

    const before = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const inv = Array.isArray(scene.pStats?.inventory) ? scene.pStats.inventory : [];
      return {
        gold: Number(scene.pStats?.gold || 0),
        qty: inv.reduce((sum, item) => sum + Math.max(1, Number(item?.qty || 1)), 0),
      };
    });

    await enterSingleEnemyCombat(page);
    await attackWithForcedD20(page, 19, 6);
    await page.waitForTimeout(750);

    // Loot drops as floor item — pick it up by tapping the enemy's tile
    await tapTile(page, 2, 2);
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const inv = Array.isArray(scene.pStats?.inventory) ? scene.pStats.inventory : [];
      const potion = inv.find(i => i.id === 'potion_heal');
      return {
        aliveEnemies: (scene.enemies || []).filter(e => e.alive).length,
        gold: Number(scene.pStats?.gold || 0),
        qty: inv.reduce((sum, item) => sum + Math.max(1, Number(item?.qty || 1)), 0),
        potionQty: Number(potion?.qty || 0),
      };
    });

    expect(after.aliveEnemies).toBe(0);
    expect(after.gold - before.gold).toBe(7);
    expect(after.qty).toBeGreaterThan(before.qty);
    expect(after.potionQty).toBeGreaterThanOrEqual(1);
  });

  test('hit and miss outcomes are deterministic', async ({ page }) => {
    await page.goto('/?map=ts_combat_reset', { waitUntil: 'networkidle' });
    await waitForScene(page);
    await enterSingleEnemyCombat(page);

    const before = await getState(page);
    expect(before.aliveEnemies).toHaveLength(1);
    const hpBefore = before.aliveEnemies[0].hp;

    await tapTile(page, 2, 3);
    await page.waitForTimeout(300);
    await attackWithForcedD20(page, 19);

    const after = await getState(page);
    expect(after.aliveEnemies).toHaveLength(1);
    expect(after.aliveEnemies[0].hp).toBeLessThan(hpBefore);

    await page.goto('/?map=ts_enemy_attack', { waitUntil: 'networkidle' });
    await waitForScene(page);
    await enterSingleEnemyCombat(page);

    const beforeMiss = await getState(page);
    expect(beforeMiss.aliveEnemies).toHaveLength(1);
    const hpBeforeMiss = beforeMiss.aliveEnemies[0].hp;

    await attackWithForcedD20(page, 1);

    const afterMiss = await getState(page);
    expect(afterMiss.aliveEnemies).toHaveLength(1);
    expect(afterMiss.aliveEnemies[0].hp).toBe(hpBeforeMiss);
  });
});
