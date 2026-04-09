const { test, expect } = require('@playwright/test');
const { waitForScene, getState, tapTile, dismissDiceIfNeeded } = require('./helpers');

async function enterSingleEnemyCombat(page) {
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const enemy = scene.enemies.find((e) => e.alive);
    scene.enterCombat([enemy]);
  });

  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
  });
}

async function attackWithForcedD20(page, d20Value) {
  await page.evaluate((rollValue) => {
    const scene = window.game.scene.getScene('GameScene');
    const enemy = scene.enemies.find((e) => e.alive);
    if (!enemy) return;

    const roller = (typeof dnd !== 'undefined' && dnd) || window.dnd;
    if (!roller || typeof roller.roll !== 'function') {
      throw new Error('dnd roller not available');
    }

    const originalRoll = roller.roll;
    roller.roll = (count, sides) => {
      if (count === 1 && sides === 20) return rollValue;
      return originalRoll(count, sides);
    };

    try {
      scene.playerAttackEnemy(enemy);
    } finally {
      roller.roll = originalRoll;
    }
  }, d20Value);

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

    await enterSingleEnemyCombat(page);

    const enemy = (await getState(page)).aliveEnemies[0];
    expect(enemy.tile).toEqual({ x: 2, y: 2 });

    await attackWithForcedD20(page, 19);

    const after = await getState(page);
    expect(after.aliveEnemies).toHaveLength(0);
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
