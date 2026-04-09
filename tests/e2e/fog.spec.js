const { test, expect } = require('@playwright/test');
const { waitForScene, tapTile, waitUntilIdle } = require('./helpers');

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

  await tapTile(page, 3, 2);
  await waitUntilIdle(page);

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
