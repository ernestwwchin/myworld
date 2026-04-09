const TILE_SIZE = 48;

async function waitForScene(page) {
  await page.waitForFunction(() => {
    const scene = window.game?.scene?.getScene?.('GameScene');
    return !!scene?.playerTile;
  });
}

async function getState(page) {
  return page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    return {
      mode: scene.mode,
      playerTile: { ...scene.playerTile },
      playerMoves: scene.playerMoves,
      playerMovesUsed: scene.playerMovesUsed,
      playerAP: scene.playerAP,
      floor: window._MAP_META?.floor || null,
      nextStage: window._MAP_META?.nextStage || null,
      stairsPos: window._MAP_META?.stairsPos || null,
      rangeTiles: (scene.rangeTiles || []).map(tile => ({ x: tile.x, y: tile.y })),
      aliveEnemies: (scene.enemies || []).filter(enemy => enemy.alive).map(enemy => ({
        type: enemy.type,
        tile: { x: enemy.tx, y: enemy.ty },
        hp: enemy.hp,
      })),
    };
  });
}

async function waitUntilIdle(page) {
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene && !scene.isMoving;
  });
}

async function tapTile(page, x, y) {
  await page.evaluate(({ x, y, tileSize }) => {
    const scene = window.game.scene.getScene('GameScene');
    scene.onTap({ worldX: x * tileSize + tileSize / 2, worldY: y * tileSize + tileSize / 2 });
  }, { x, y, tileSize: TILE_SIZE });
}

async function dismissDiceIfNeeded(page) {
  const hasDice = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    return !!scene?.diceWaiting;
  });
  if (hasDice) {
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      scene._handleDiceDismiss();
    });
  }
}

module.exports = {
  waitForScene,
  getState,
  waitUntilIdle,
  tapTile,
  dismissDiceIfNeeded,
};
