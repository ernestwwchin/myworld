import { test, expect } from '@playwright/test';
import { waitForScene } from './helpers.ts';

test('generated floor keeps layout and valid spawn after save + refresh', async ({ page }) => {
  await page.goto('/?map=gw_b1f&ignoreSave=1', { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    localStorage.removeItem('myworld.save.v1');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await waitForScene(page);

  const before = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const grid = MAP.map((row) => row.join(',')).join(';');
    const px = scene.playerTile.x;
    const py = scene.playerTile.y;
    const tile = MAP[py]?.[px];
    const isWalkable = tile === TILE.FLOOR || tile === TILE.GRASS || tile === TILE.WATER || tile === TILE.STAIRS;

    ModLoader.persistGameState(scene);

    return {
      floor: window._MAP_META?.floor || null,
      grid,
      playerTile: { ...scene.playerTile },
      isWalkable,
      seed: Number(ModLoader._generatedMapSeeds?.gw_b1f || 0),
    };
  });

  expect(before.floor).toBe('B1F');
  expect(before.isWalkable).toBe(true);
  expect(before.seed).toBeGreaterThan(0);

  await page.goto('/', { waitUntil: 'networkidle' });
  await waitForScene(page);

  const after = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const grid = MAP.map((row) => row.join(',')).join(';');
    const px = scene.playerTile.x;
    const py = scene.playerTile.y;
    const tile = MAP[py]?.[px];
    const isWalkable = tile === TILE.FLOOR || tile === TILE.GRASS || tile === TILE.WATER || tile === TILE.STAIRS;

    return {
      floor: window._MAP_META?.floor || null,
      grid,
      playerTile: { ...scene.playerTile },
      isWalkable,
      seed: Number(ModLoader._generatedMapSeeds?.gw_b1f || 0),
    };
  });

  expect(after.floor).toBe('B1F');
  expect(after.grid).toBe(before.grid);
  expect(after.playerTile).toEqual(before.playerTile);
  expect(after.isWalkable).toBe(true);
  expect(after.seed).toBe(before.seed);
});
