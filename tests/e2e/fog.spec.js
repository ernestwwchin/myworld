import { test, expect } from '@playwright/test';
import { waitForScene, tapTile, waitUntilIdle } from './helpers.js';

test('fog visibility updates and visited memory persists', async ({ page }) => {
  await page.goto('/?map=ts_fog', { waitUntil: 'networkidle' });
  await waitForScene(page, 15000);

  const before = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const start = { ...scene.playerTile };

    const visibleAtStart = !!scene.fogVisible?.[start.y]?.[start.x];
    const visitedAtStart = !!scene.fogVisited?.[start.y]?.[start.x];

    // Sample a far wall-adjacent tile expected to be outside initial radius.
    const far = { x: 24, y: 24 };
    const farVisible = !!scene.fogVisible?.[far.y]?.[far.x];

    const visitedCount = (scene.fogVisited || []).reduce(
      (acc, row) => acc + row.filter(Boolean).length,
      0
    );

    return { start, visibleAtStart, visitedAtStart, farVisible, visitedCount };
  });

  expect(before.visibleAtStart).toBe(true);
  expect(before.visitedAtStart).toBe(true);
  expect(before.farVisible).toBe(false);

  // Move player directly via setDestination to avoid timing issues with tapTile
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    scene.setDestination(3, 2);
  });
  await page.waitForTimeout(500);
  await waitUntilIdle(page);

  // Wait for player to actually arrive at (3,2)
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene.playerTile.x === 3 && scene.playerTile.y === 2;
  }, { timeout: 10000 });

  const after = await page.evaluate((start) => {
    const scene = window.game.scene.getScene('GameScene');
    const now = { ...scene.playerTile };

    const startStillVisited = !!scene.fogVisited?.[start.y]?.[start.x];
    const nowVisible = !!scene.fogVisible?.[now.y]?.[now.x];

    const visitedCount = (scene.fogVisited || []).reduce(
      (acc, row) => acc + row.filter(Boolean).length,
      0
    );

    return { now, startStillVisited, nowVisible, visitedCount };
  }, before.start);

  expect(after.now).toEqual({ x: 3, y: 2 });
  expect(after.startStillVisited).toBe(true);
  expect(after.nowVisible).toBe(true);
  expect(after.visitedCount).toBeGreaterThan(before.visitedCount);
});
