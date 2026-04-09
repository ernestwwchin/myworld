const { test, expect } = require('@playwright/test');
const { waitForScene, getState, waitUntilIdle, tapTile, dismissDiceIfNeeded } = require('./helpers');

test('combat reset restores post-action anchor', async ({ page }) => {
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

  await tapTile(page, 2, 3);
  await waitUntilIdle(page);

  const beforeAttack = await getState(page);
  expect(beforeAttack.playerTile).toEqual({ x: 2, y: 3 });
  expect(beforeAttack.playerMoves).toBe(4);
  expect(beforeAttack.playerAP).toBe(1);

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

  const afterAttack = await getState(page);
  expect(afterAttack.playerTile).toEqual({ x: 2, y: 3 });
  expect(afterAttack.playerMoves).toBe(4);
  expect(afterAttack.playerAP).toBe(0);
  expect(afterAttack.aliveEnemies).toHaveLength(1);
  expect(afterAttack.aliveEnemies[0].hp).toBeLessThan(13);
  expect(afterAttack.rangeTiles.length).toBeGreaterThan(0);

  await tapTile(page, 5, 3);
  await waitUntilIdle(page);

  const afterMove = await getState(page);
  expect(afterMove.playerTile).toEqual({ x: 5, y: 3 });
  expect(afterMove.playerMoves).toBe(1);
  expect(afterMove.playerMovesUsed).toBe(4);

  await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    scene.resetMove();
  });

  const afterReset = await getState(page);
  expect(afterReset.playerTile).toEqual({ x: 2, y: 3 });
  expect(afterReset.playerMoves).toBe(4);
  expect(afterReset.playerMovesUsed).toBe(1);
  expect(afterReset.rangeTiles.length).toBeGreaterThan(0);
});
