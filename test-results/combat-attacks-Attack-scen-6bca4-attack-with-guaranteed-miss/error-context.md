# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: combat-attacks.spec.js >> Attack scenarios >> miss attack attack with guaranteed miss
- Location: tests/e2e/combat-attacks.spec.js:99:3

# Error details

```
Error: page.goto: Test ended.
Call log:
  - navigating to "http://127.0.0.1:3000/?map=ts_enemy_attack", waiting until "networkidle"

```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | const { waitForScene, getState, waitUntilIdle, tapTile, dismissDiceIfNeeded } = require('./helpers');
  3   | 
  4   | test.describe('Attack scenarios', () => {
  5   |   test('hit and kill weak monster in one hit', async ({ page }) => {
  6   |     await page.goto('/?map=ts_melee_attack', { waitUntil: 'networkidle' });
  7   |     await waitForScene(page);
  8   | 
  9   |     const before = await getState(page);
  10  |     expect(before.aliveEnemies).toHaveLength(1);
  11  |     expect(before.aliveEnemies[0].type).toBe('goblin');
  12  | 
  13  |     // Enter combat
  14  |     await page.evaluate(() => {
  15  |       const scene = window.game.scene.getScene('GameScene');
  16  |       const enemy = scene.enemies.find(enemy => enemy.alive);
  17  |       scene.enterCombat([enemy]);
  18  |     });
  19  | 
  20  |     await page.waitForFunction(() => {
  21  |       const scene = window.game.scene.getScene('GameScene');
  22  |       return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
  23  |     });
  24  | 
  25  |     const enemy = (await getState(page)).aliveEnemies[0];
  26  |     expect(enemy.tile).toEqual({ x: 2, y: 2 });
  27  | 
  28  |     // Attack with guaranteed hit
  29  |     await page.evaluate(() => {
  30  |       const scene = window.game.scene.getScene('GameScene');
  31  |       const enemy = scene.enemies.find(enemy => enemy.alive);
  32  |       const originalRoll = dnd.roll;
  33  |       dnd.roll = (count, sides) => (count === 1 && sides === 20 ? 19 : originalRoll(count, sides));
  34  |       try {
  35  |         scene.playerAttackEnemy(enemy);
  36  |       } finally {
  37  |         dnd.roll = originalRoll;
  38  |       }
  39  |     });
  40  | 
  41  |     await page.waitForTimeout(250);
  42  |     await dismissDiceIfNeeded(page);
  43  |     await page.waitForTimeout(250);
  44  | 
  45  |     const after = await getState(page);
  46  |     expect(after.aliveEnemies).toHaveLength(0);
  47  |   });
  48  | 
  49  |   test('hit with guaranteed success', async ({ page }) => {
  50  |     await page.goto('/?map=ts_combat_reset', { waitUntil: 'networkidle' });
  51  |     await waitForScene(page);
  52  | 
  53  |     await page.evaluate(() => {
  54  |       const scene = window.game.scene.getScene('GameScene');
  55  |       const enemy = scene.enemies.find(enemy => enemy.alive);
  56  |       scene.enterCombat([enemy]);
  57  |     });
  58  | 
  59  |     await page.waitForFunction(() => {
  60  |       const scene = window.game.scene.getScene('GameScene');
  61  |       return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
  62  |     });
  63  | 
  64  |     const before = await getState(page);
  65  |     expect(before.aliveEnemies).toHaveLength(1);
  66  |     const hpBefore = before.aliveEnemies[0].hp;
  67  | 
  68  |     // Move closer first to ensure in range
  69  |     await tapTile(page, 2, 3);
  70  |     await page.waitForTimeout(300);
  71  | 
  72  |     // Attack with guaranteed hit (natural 19 on d20)
  73  |     await page.evaluate(() => {
  74  |       const scene = window.game.scene.getScene('GameScene');
  75  |       const enemy = scene.enemies.find(enemy => enemy.alive);
  76  |       if (enemy) {
  77  |         const originalRoll = window.dnd.roll;
  78  |         window.dnd.roll = (count, sides) => {
  79  |           if (count === 1 && sides === 20) return 19;
  80  |           return originalRoll(count, sides);
  81  |         };
  82  |         try {
  83  |           scene.playerAttackEnemy(enemy);
  84  |         } finally {
  85  |           window.dnd.roll = originalRoll;
  86  |         }
  87  |       }
  88  |     });
  89  | 
  90  |     await page.waitForTimeout(400);
  91  |     await dismissDiceIfNeeded(page);
  92  |     await page.waitForTimeout(400);
  93  | 
  94  |     const after = await getState(page);
  95  |     expect(after.aliveEnemies).toHaveLength(1);
  96  |     expect(after.aliveEnemies[0].hp).toBeLessThanOrEqual(hpBefore);
  97  |   });
  98  | 
  99  |   test('miss attack attack with guaranteed miss', async ({ page }) => {
> 100 |     await page.goto('/?map=ts_enemy_attack', { waitUntil: 'networkidle' });
      |                ^ Error: page.goto: Test ended.
  101 |     await waitForScene(page);
  102 | 
  103 |     await page.evaluate(() => {
  104 |       const scene = window.game.scene.getScene('GameScene');
  105 |       const enemy = scene.enemies.find(enemy => enemy.alive);
  106 |       scene.enterCombat([enemy]);
  107 |     });
  108 | 
  109 |     await page.waitForFunction(() => {
  110 |       const scene = window.game.scene.getScene('GameScene');
  111 |       return scene.mode === MODE.COMBAT && scene.isPlayerTurn && scene.isPlayerTurn();
  112 |     });
  113 | 
  114 |     const before = await getState(page);
  115 |     expect(before.aliveEnemies).toHaveLength(1);
  116 | 
  117 |     // Attack with guaranteed miss (natural 1 on d20)
  118 |     await page.evaluate(() => {
  119 |       const scene = window.game.scene.getScene('GameScene');
  120 |       const enemy = scene.enemies.find(enemy => enemy.alive);
  121 |       if (enemy) {
  122 |         const originalRoll = window.dnd.roll;
  123 |         window.dnd.roll = (count, sides) => {
  124 |           if (count === 1 && sides === 20) return 1;
  125 |           return originalRoll(count, sides);
  126 |         };
  127 |         try {
  128 |           scene.playerAttackEnemy(enemy);
  129 |         } finally {
  130 |           window.dnd.roll = originalRoll;
  131 |         }
  132 |       }
  133 |     });
  134 | 
  135 |     await page.waitForTimeout(400);
  136 |     await dismissDiceIfNeeded(page);
  137 |     await page.waitForTimeout(400);
  138 | 
  139 |     const after = await getState(page);
  140 |     expect(after.aliveEnemies).toHaveLength(1);
  141 |   });
  142 | });
  143 | 
```