const { test, expect } = require('@playwright/test');
const { waitForScene, getState, dismissDiceIfNeeded } = require('./helpers');

test('enemy turn damage and flee exit in one flow', async ({ page }) => {
  await page.goto('/?map=ts_enemy_attack', { waitUntil: 'networkidle' });
  await waitForScene(page);

  await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const enemy = scene.enemies.find((e) => e.alive);
    scene.enterCombat([enemy]);
  });

  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
  });

  const beforeEnemyTurn = await getState(page);
  const combatMode = beforeEnemyTurn.mode;

  // Force enemy d20 attacks to hit for deterministic damage on enemy turn.
  await page.evaluate(() => {
    const roller = (typeof dnd !== 'undefined' && dnd) || window.dnd;
    if (!roller || typeof roller.roll !== 'function') throw new Error('dnd roller unavailable');
    window.__e2eOriginalRoll = roller.roll;
    roller.roll = (count, sides) => {
      if (count === 1 && sides === 20) return 19;
      return window.__e2eOriginalRoll(count, sides);
    };
  });

  await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    scene.endPlayerTurn();
  });

  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
  });

  await dismissDiceIfNeeded(page);

  await page.evaluate(() => {
    const roller = (typeof dnd !== 'undefined' && dnd) || window.dnd;
    if (window.__e2eOriginalRoll && roller) {
      roller.roll = window.__e2eOriginalRoll;
      delete window.__e2eOriginalRoll;
    }
  });

  const afterEnemyTurn = await getState(page);
  expect(afterEnemyTurn.playerHP).toBeLessThan(beforeEnemyTurn.playerHP);

  // Relax flee requirements for deterministic verification of flee flow.
  const fleeCheck = await page.evaluate(() => {
    window.__e2eFleeRules = {
      minDistance: COMBAT_RULES.fleeMinDistance,
      requireNoLOS: COMBAT_RULES.fleeRequiresNoLOS,
    };
    COMBAT_RULES.fleeMinDistance = 1;
    COMBAT_RULES.fleeRequiresNoLOS = false;

    const scene = window.game.scene.getScene('GameScene');
    scene.playerAP = 1;
    const chk = scene.canFleeCombat();
    scene.tryFleeCombat();
    return {
      chkOk: chk.ok,
      reason: chk.reason,
      isPlayerTurn: scene.isPlayerTurn(),
    };
  });

  expect(fleeCheck.isPlayerTurn).toBe(true);
  expect(fleeCheck.chkOk).toBe(true);

  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene.mode !== MODE.COMBAT;
  }, { timeout: 10000 });

  const afterFlee = await getState(page);
  expect(afterFlee.mode).not.toBe(combatMode);

  await page.evaluate(() => {
    if (window.__e2eFleeRules) {
      COMBAT_RULES.fleeMinDistance = window.__e2eFleeRules.minDistance;
      COMBAT_RULES.fleeRequiresNoLOS = window.__e2eFleeRules.requireNoLOS;
      delete window.__e2eFleeRules;
    }
  });
});
