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

  // Re-confirm it's still our turn after the move
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
  }, { timeout: 15000 });

  const beforeAttack = await getState(page);
  expect(beforeAttack.playerTile).toEqual({ x: 2, y: 3 });
  expect(beforeAttack.playerMoves).toBe(4);
  expect(beforeAttack.playerAP).toBe(1);

  const atkResult = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const enemy = scene.enemies.find(enemy => enemy.alive);
    const pt = scene.playerTile;
    const dist = Math.sqrt((pt.x - enemy.tx) ** 2 + (pt.y - enemy.ty) ** 2);
    const isPlayerTurn = scene.isPlayerTurn();
    const ap = scene.playerAP;
    const atkRange = scene.pStats.atkRange || 1;

    if (!isPlayerTurn || ap <= 0) {
      return { skipped: true, isPlayerTurn, ap, dist, atkRange, enemyTile: { x: enemy.tx, y: enemy.ty }, playerTile: pt };
    }

    const originalRoll = dnd.roll;
    let d20Used = false;
    dnd.roll = (count, sides) => {
      if (count === 1 && sides === 20 && !d20Used) { d20Used = true; return 19; }
      if (sides !== 20) return 1;
      return originalRoll(count, sides);
    };
    try {
      scene.playerAttackEnemy(enemy);
    } finally {
      dnd.roll = originalRoll;
    }
    return { skipped: false, isPlayerTurn, ap, dist, atkRange, enemyTile: { x: enemy.tx, y: enemy.ty }, playerTile: pt, apAfter: scene.playerAP };
  });
  console.log('Attack result:', JSON.stringify(atkResult));

  await page.waitForTimeout(250);
  await dismissDiceIfNeeded(page);
  await page.waitForTimeout(250);

  const afterAttack = await getState(page);
  expect(afterAttack.playerTile).toEqual({ x: 2, y: 3 });
  expect(afterAttack.playerMoves).toBeGreaterThanOrEqual(0);
  expect(afterAttack.playerAP).toBe(0);
  expect(afterAttack.aliveEnemies).toHaveLength(1);
  expect(afterAttack.aliveEnemies[0].hp).toBeLessThan(13);

  await tapTile(page, 5, 3);
  await waitUntilIdle(page);

  const afterMove = await getState(page);
  expect(afterMove.playerTile).toEqual({ x: 5, y: 3 });
  expect(afterMove.playerMoves).toBeLessThan(beforeAttack.playerMoves);
  expect(afterMove.playerMovesUsed).toBeGreaterThan(afterAttack.playerMovesUsed);

  await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    scene.resetMove();
  });

  const afterReset = await getState(page);
  expect(afterReset.playerTile).toEqual(
    expect.objectContaining({ y: 3 })
  );
  expect(afterReset.playerMoves).toBeGreaterThanOrEqual(afterMove.playerMoves);
  expect(afterReset.playerMovesUsed).toBeLessThan(afterMove.playerMovesUsed);
});
