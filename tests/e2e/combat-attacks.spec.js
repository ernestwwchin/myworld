const { test, expect } = require('@playwright/test');
const { waitForScene, getState, waitUntilIdle, tapTile, dismissDiceIfNeeded } = require('./helpers');

test.describe('Attack scenarios', () => {
  test('hit and kill weak monster in one hit', async ({ page }) => {
    await page.goto('/?map=ts_melee_attack', { waitUntil: 'networkidle' });
    await waitForScene(page);

    const before = await getState(page);
    expect(before.aliveEnemies).toHaveLength(1);
    expect(before.aliveEnemies[0].type).toBe('goblin');

    // Enter combat
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const enemy = scene.enemies.find(enemy => enemy.alive);
      scene.enterCombat([enemy]);
    });

    await page.waitForFunction(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
    });

    const enemy = (await getState(page)).aliveEnemies[0];
    expect(enemy.tile).toEqual({ x: 2, y: 2 });

    // Attack with guaranteed hit
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const enemy = scene.enemies.find(enemy => enemy.alive);
      const originalRoll = dnd.roll;
      dnd.roll = (count, sides) => (count === 1 && sides === 20 ? 19 : originalRoll(count, sides));
      try {
        scene.playerAttackEnemy(enemy);
      } finally {
        dnd.roll = originalRoll;
      }
    });

    await page.waitForTimeout(250);
    await dismissDiceIfNeeded(page);
    await page.waitForTimeout(250);

    const after = await getState(page);
    expect(after.aliveEnemies).toHaveLength(0);
  });

  test('hit with guaranteed success', async ({ page }) => {
    await page.goto('/?map=ts_combat_reset', { waitUntil: 'networkidle' });
    await waitForScene(page);

    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const enemy = scene.enemies.find(enemy => enemy.alive);
      scene.enterCombat([enemy]);
    });

    await page.waitForFunction(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
    });

    const before = await getState(page);
    expect(before.aliveEnemies).toHaveLength(1);
    const hpBefore = before.aliveEnemies[0].hp;

    // Move closer first to ensure in range
    await tapTile(page, 2, 3);
    await page.waitForTimeout(300);

    // Attack with guaranteed hit (natural 19 on d20)
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const enemy = scene.enemies.find(enemy => enemy.alive);
      if (enemy) {
        const originalRoll = window.dnd.roll;
        window.dnd.roll = (count, sides) => {
          if (count === 1 && sides === 20) return 19;
          return originalRoll(count, sides);
        };
        try {
          scene.playerAttackEnemy(enemy);
        } finally {
          window.dnd.roll = originalRoll;
        }
      }
    });

    await page.waitForTimeout(400);
    await dismissDiceIfNeeded(page);
    await page.waitForTimeout(400);

    const after = await getState(page);
    expect(after.aliveEnemies).toHaveLength(1);
    expect(after.aliveEnemies[0].hp).toBeLessThanOrEqual(hpBefore);
  });

  test('miss attack attack with guaranteed miss', async ({ page }) => {
    await page.goto('/?map=ts_enemy_attack', { waitUntil: 'networkidle' });
    await waitForScene(page);

    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const enemy = scene.enemies.find(enemy => enemy.alive);
      scene.enterCombat([enemy]);
    });

    await page.waitForFunction(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
    });

    const before = await getState(page);
    expect(before.aliveEnemies).toHaveLength(1);

    // Attack with guaranteed miss (natural 1 on d20)
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const enemy = scene.enemies.find(enemy => enemy.alive);
      if (enemy) {
        const originalRoll = window.dnd.roll;
        window.dnd.roll = (count, sides) => {
          if (count === 1 && sides === 20) return 1;
          return originalRoll(count, sides);
        };
        try {
          scene.playerAttackEnemy(enemy);
        } finally {
          window.dnd.roll = originalRoll;
        }
      }
    });

    await page.waitForTimeout(400);
    await dismissDiceIfNeeded(page);
    await page.waitForTimeout(400);

    const after = await getState(page);
    expect(after.aliveEnemies).toHaveLength(1);
  });
});
