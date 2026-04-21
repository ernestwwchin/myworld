/**
 * autorun.spec.js — Automated playthrough E2E test
 *
 * Loads a crafted 2-floor dungeon (ts_autorun_f1 → ts_autorun_f2).
 * The test bot:
 *   1. Kills every enemy on Floor 1
 *   2. Walks to the stairs
 *   3. Verifies the floor transition to Floor 2
 *
 * Uses a hand-crafted map so the layout is deterministic and simple.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForScene, getState, dismissDiceIfNeeded } from './helpers.ts';

test.describe.configure({ timeout: 120000 });

// ── Helpers ─────────────────────────────────────────────

/** Wait until the player has stopped moving. */
async function waitIdle(page: Page, timeout = 10000) {
  await page.waitForFunction(() => {
    const scene = window.game?.scene?.getScene?.('GameScene');
    return scene && !scene.isMoving;
  }, { timeout });
}

/** Wait for explore mode. */
async function waitExplore(page: Page, timeout = 30000) {
  await page.waitForFunction(() => {
    const scene = window.game?.scene?.getScene?.('GameScene');
    return scene?.mode === MODE.EXPLORE;
  }, { timeout });
}

/**
 * Kill all alive enemies by:
 *  - Setting HP to 1
 *  - Teleporting player adjacent to each
 *  - Forcing enterCombat + player turn + forced d20=19 attack
 *  - Repeating until all dead
 */
async function killAllEnemies(page: Page) {
  // Get alive enemy count
  let aliveCount = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    return scene.enemies.filter(e => e.alive).length;
  });

  while (aliveCount > 0) {
    // Set all enemies to 1 HP, teleport player adjacent, enter combat, attack
    const killed = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const S = window.S || 48;
      const target = scene.enemies.find(e => e.alive);
      if (!target) return false;

      // Set target to 1 HP
      target.hp = 1;
      target.maxHp = 1;

      // Teleport player adjacent to this enemy
      const adjX = target.tx - 1;
      const adjY = target.ty;
      scene.playerTile = { x: adjX, y: adjY };
      scene.lastCompletedTile = { x: adjX, y: adjY };
      scene.player.setPosition(adjX * S + S / 2, adjY * S + S / 2);

      // Force d20 = 19
      const roller = (typeof dnd !== 'undefined' && dnd) || window.dnd;
      if (!roller._origRoll) roller._origRoll = roller.roll;
      roller.roll = (n, d) => (n === 1 && d === 20 ? 19 : roller._origRoll(n, d));

      // Enter combat
      if (scene.mode !== 'combat') {
        scene.enterCombat([target]);
      }

      return true;
    });

    if (!killed) break;

    // Wait for combat mode and player turn
    await page.waitForFunction(() => {
      const scene = window.game?.scene?.getScene?.('GameScene');
      return scene?.mode === MODE.COMBAT && scene.isPlayerTurn?.();
    }, { timeout: 45000 });

    // Attack the target
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const target = scene.combatGroup.find(e => e.alive);
      if (target) scene.playerAttackEnemy(target);
    });

    // Wait for attack animation + dismiss dice
    await page.waitForTimeout(500);
    await dismissDiceIfNeeded(page);
    await page.waitForTimeout(500);
    await dismissDiceIfNeeded(page);
    await page.waitForTimeout(300);

    // Check if there are still alive enemies in the combat group
    const aliveInCombat = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.combatGroup.filter(e => e.alive).length;
    });

    // If enemies remain in combat, keep fighting on player turns
    let turns = 15;
    while (aliveInCombat > 0 && turns-- > 0) {
      // Wait for player turn or combat end
      const state = await page.waitForFunction(() => {
        const scene = window.game?.scene?.getScene?.('GameScene');
        if (!scene) return 'error';
        if (scene.mode !== MODE.COMBAT) return 'explore';
        if (scene.isPlayerTurn?.()) return 'player_turn';
        return null;
      }, { timeout: 15000 }).then(h => h.jsonValue()).catch(() => 'timeout');

      if (state === 'explore' || state === 'error' || state === 'timeout') break;

      // Attack next alive enemy
      const didAttack = await page.evaluate(() => {
        const scene = window.game.scene.getScene('GameScene');
        const t = scene.combatGroup.find(e => e.alive);
        if (!t) return false;
        // Teleport adjacent if needed
        const dist = Math.abs(scene.playerTile.x - t.tx) + Math.abs(scene.playerTile.y - t.ty);
        if (dist > 1.5) {
          const S = window.S || 48;
          const adjX = t.tx - 1;
          const adjY = t.ty;
          scene.playerTile = { x: adjX, y: adjY };
          scene.lastCompletedTile = { x: adjX, y: adjY };
          scene.player.setPosition(adjX * S + S / 2, adjY * S + S / 2);
        }
        t.hp = 1; t.maxHp = 1;
        scene.playerAttackEnemy(t);
        return true;
      });

      if (!didAttack) break;

      await page.waitForTimeout(500);
      await dismissDiceIfNeeded(page);
      await page.waitForTimeout(500);
      await dismissDiceIfNeeded(page);

      // End player turn if AP is used up
      await page.evaluate(() => {
        const scene = window.game.scene.getScene('GameScene');
        if (scene.mode === MODE.COMBAT && scene.isPlayerTurn?.() && scene.playerAP <= 0) {
          scene.endPlayerTurn();
        }
      });
      await page.waitForTimeout(300);

      const still = await page.evaluate(() => {
        const scene = window.game?.scene?.getScene?.('GameScene');
        return { combat: scene?.mode === MODE.COMBAT, alive: scene?.combatGroup?.filter(e => e.alive).length || 0 };
      });
      if (!still.combat || still.alive === 0) break;
    }

    // Restore d20
    await page.evaluate(() => {
      const roller = (typeof dnd !== 'undefined' && dnd) || window.dnd;
      if (roller._origRoll) { roller.roll = roller._origRoll; delete roller._origRoll; }
    });

    // Wait for explore mode
    await waitExplore(page, 20000);
    await page.waitForTimeout(500);

    // Update alive count
    aliveCount = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      return scene.enemies.filter(e => e.alive).length;
    });
  }
}

/** Move player to a specific tile via pathfinding. */
async function moveToTile(page: Page, tx: number, ty: number) {
  // Use setDestination for reliable pathfinding + step callbacks (triggers stairs etc.)
  await page.evaluate(({ x, y }) => {
    const scene = window.game.scene.getScene('GameScene');
    scene.setDestination(x, y);
  }, { x: tx, y: ty });
  await waitIdle(page, 15000);
  await page.waitForTimeout(500);
}

/** Teleport player to a tile (instant, no animation/callbacks). */
async function teleportPlayer(page: Page, tx: number, ty: number) {
  await page.evaluate(({ x, y }) => {
    const scene = window.game.scene.getScene('GameScene');
    const S = window.S || 48;
    scene.playerTile = { x, y };
    scene.lastCompletedTile = { x, y };
    scene.player.setPosition(x * S + S / 2, y * S + S / 2);
  }, { x: tx, y: ty });
}

// ── Test ─────────────────────────────────────────────────

test('autorun: kill all enemies, walk to stairs, arrive on next floor', async ({ page }) => {
  // Load floor 1
  await page.goto('/?map=ts_autorun_f1&ignoreSave=1', { waitUntil: 'networkidle' });
  await waitForScene(page);

  // Verify we're on Floor 1
  const boot = await getState(page);
  expect(boot.floor).toBe('TAR1');
  expect(boot.aliveEnemies.length).toBe(2);

  // ── Phase 1: Kill all enemies ──
  await killAllEnemies(page);

  const afterKill = await getState(page);
  expect(afterKill.aliveEnemies.length).toBe(0);
  expect(afterKill.mode).toBe('explore');

  // ── Phase 2: Walk to stairs ──
  const stairsPos = boot.stairsPos;
  expect(stairsPos).toBeTruthy();

  // Teleport player a few tiles away from stairs so we can walk TO them
  // (stairs transition only fires on pathfinding step completion)
  await teleportPlayer(page, 1, stairsPos.y);
  await page.waitForTimeout(200);
  await moveToTile(page, stairsPos.x, stairsPos.y);

  // ── Phase 3: Verify floor transition ──
  await page.waitForFunction(
    () => window._MAP_META?.floor === 'TAR2',
    { timeout: 20000 }
  );
  await waitForScene(page);
  await waitIdle(page);

  const finalState = await getState(page);
  expect(finalState.floor).toBe('TAR2');
  expect(finalState.aliveEnemies.length).toBe(0);
});
