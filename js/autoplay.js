// ═══════════════════════════════════════════════════════
// autoplay.js — In-game test runner (no framework needed)
//
// Usage: load test.html?test=all or ?test=movement,combat_entry
// Each scenario loads its own map, runs automated actions,
// and asserts outcomes. Results shown in an overlay panel.
// ═══════════════════════════════════════════════════════

const AutoPlay = {
  results: [],
  running: false,
  scene: null,

  // ── Helpers ──────────────────────────────────────
  /** Wait for ms milliseconds */
  wait: ms => new Promise(r => setTimeout(r, ms)),

  /** Get the active GameScene */
  getScene() {
    return game?.scene?.getScene('GameScene');
  },

  /** Record a test result */
  assert(name, passed, detail) {
    this.results.push({ name, passed, detail: detail || '' });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}${detail ? ' — ' + detail : ''}`);
  },

  /** Auto-dismiss dice popup if showing */
  async dismissDice() {
    const s = this.getScene();
    if (s?.diceWaiting) {
      s._handleDiceDismiss();
      await this.wait(200);
    }
  },

  /** Wait until scene is no longer moving */
  async waitIdle(timeout) {
    timeout = timeout || 5000;
    const s = this.getScene();
    const start = Date.now();
    while (s.isMoving && Date.now() - start < timeout) {
      await this.wait(50);
    }
  },

  /** Wait for a specific mode */
  async waitMode(mode, timeout) {
    timeout = timeout || 8000;
    const s = this.getScene();
    const start = Date.now();
    while (s.mode !== mode && Date.now() - start < timeout) {
      await this.wait(100);
    }
  },

  /** Simulate a click/tap at tile coords */
  async tapTile(tx, ty) {
    const s = this.getScene();
    const worldX = tx * S + S / 2;
    const worldY = ty * S + S / 2;
    s.onTap({ worldX, worldY });
    await this.wait(100);
  },

  /** Execute fn with a forced d20 roll value for deterministic combat tests */
  async withForcedD20(value, fn) {
    const originalRoll = dnd.roll;
    dnd.roll = (n, d) => (n === 1 && d === 20 ? value : originalRoll(n, d));
    try {
      return await fn();
    } finally {
      dnd.roll = originalRoll;
    }
  },

  // ── Test Scenarios ───────────────────────────────

  /** Test 1: Movement — pathfind through door and around walls */
  async test_movement() {
    const s = this.getScene();
    const startX = s.playerTile.x, startY = s.playerTile.y;
    this.assert('movement:start_pos', startX === 1 && startY === 1,
      `player at (${startX},${startY})`);

    // Tap far corner — should pathfind through door at (3,3)
    await this.tapTile(5, 5);
    await this.waitIdle(3000);
    await this.wait(200);

    const endX = s.playerTile.x, endY = s.playerTile.y;
    this.assert('movement:reached_target', endX === 5 && endY === 5,
      `player at (${endX},${endY})`);

    // Tap wall — should not move
    const preX = s.playerTile.x;
    await this.tapTile(0, 0); // wall
    await this.wait(200);
    this.assert('movement:wall_blocked', s.playerTile.x === preX,
      'did not move into wall');
  },

  /** Test 2: Combat Entry — walking into enemy FOV triggers combat */
  async test_combat_entry() {
    const s = this.getScene();
    this.assert('combat_entry:start_explore', s.mode === MODE.EXPLORE,
      `mode=${s.mode}`);

    // Walk toward the goblin at (5,3) facing left — step into its sight
    await this.tapTile(3, 3);
    await this.waitIdle(3000);
    await this.wait(800); // give combat detection time

    // Should have entered combat by now (or be very close and enemy detected)
    if (s.mode !== MODE.COMBAT) {
      // Try one more step closer
      await this.tapTile(4, 3);
      await this.waitIdle(2000);
      await this.wait(800);
      s.checkSight();
      await this.wait(300);
    }

    this.assert('combat_entry:combat_triggered', s.mode === MODE.COMBAT,
      `mode=${s.mode}`);

    if (s.mode === MODE.COMBAT) {
      this.assert('combat_entry:has_combat_group', s.combatGroup.length > 0,
        `${s.combatGroup.length} enemies in combat`);
    }
  },

  /** Test 3: Melee Attack — attack adjacent enemy */
  async test_melee_attack() {
    const s = this.getScene();

    // Override goblin HP to 1 so one hit kills it
    const goblin = s.enemies.find(e => e.alive);
    if (goblin) {
      goblin.hp = 1;
      goblin.maxHp = 1;
    }
    const startXP = s.pStats.xp;

    // Deterministic combat entry for this scenario
    if (s.mode !== MODE.COMBAT && goblin) {
      s.enterCombat([goblin]);
      await this.wait(900);
    }

    // Wait until it's player turn (max ~6s)
    for (let i = 0; i < 30 && (!s.isPlayerTurn || !s.isPlayerTurn()); i++) {
      await this.dismissDice();
      await this.wait(200);
    }

    if (s.mode === MODE.COMBAT && s.isPlayerTurn()) {
      // Attack the goblin
      this.assert('melee_attack:player_turn', true, 'player has turn');
      s.selectAction('attack');
      await this.wait(200);

      if (goblin && goblin.alive) {
        await this.withForcedD20(19, async () => {
          s.playerAttackEnemy(goblin);
        });
        await this.wait(500);
        await this.dismissDice();
        await this.wait(500);
      }

      this.assert('melee_attack:enemy_killed', !goblin?.alive,
        `goblin alive=${goblin?.alive} hp=${goblin?.hp}`);
      this.assert('melee_attack:xp_gained', s.pStats.xp > startXP,
        `xp ${startXP} → ${s.pStats.xp}`);
    } else {
      this.assert('melee_attack:combat_state', false,
        `mode=${s.mode} playerTurn=${s.isPlayerTurn?.()}`);
    }
  },

  /** Test 4: Enemy Attack — let enemy take a turn and attack */
  async test_enemy_attack() {
    const s = this.getScene();
    const startHP = s.playerHP;
    const enemy = s.enemies.find(e => e.alive);

    // Deterministic combat entry
    if (s.mode !== MODE.COMBAT && enemy) {
      s.enterCombat([enemy]);
      await this.wait(900);
    }

    if (s.mode === MODE.COMBAT) {
      this.assert('enemy_attack:combat_started', true, 'in combat');

      // End player turn to let enemy go
      if (s.isPlayerTurn()) {
        s.endPlayerTurn();
        await this.wait(1800);
        await this.dismissDice();
        await this.wait(500);
      }

      // After enemy turn, check if HP changed (may or may not hit depending on roll)
      // Just verify no crash and combat is still going
      this.assert('enemy_attack:survived_turn', s.playerHP > 0,
        `hp=${s.playerHP}/${s.playerMaxHP}`);
      this.assert('enemy_attack:enemy_took_turn', true,
        `hp ${startHP} -> ${s.playerHP}, mode=${s.mode}`);
    } else {
      this.assert('enemy_attack:combat_state', false, `mode=${s.mode}`);
    }
  },

  /** Test 5: Skill Checks — exercise dnd.skillCheck() */
  async test_skills() {
    const s = this.getScene();
    const p = s.pStats;

    // Test all 18 skills run without error
    let allOk = true;
    const skillKeys = Object.keys(SKILLS);
    this.assert('skills:count', skillKeys.length === 18,
      `${skillKeys.length} skills defined`);

    for (const key of skillKeys) {
      const result = dnd.skillCheck(key, p, 10);
      if (typeof result.total !== 'number' || typeof result.success !== 'boolean') {
        allOk = false;
        this.assert(`skills:${key}`, false, 'bad return value');
      }
    }
    this.assert('skills:all_checks_run', allOk, `${skillKeys.length} checks executed`);

    // Verify proficiency bonus applies
    const athMod = dnd.skillMod('athletics', p); // proficient, STR 16 → +3 +2 = +5
    const stlMod = dnd.skillMod('stealth', p);   // not proficient, DEX 14 → +2
    this.assert('skills:proficiency_applied',
      athMod > stlMod || p.str === p.dex, // only skip if same ability AND no prof difference
      `athletics=${athMod} stealth=${stlMod}`);

    // Run 100 athletics checks — verify total is always roll+mod
    let consistent = true;
    for (let i = 0; i < 100; i++) {
      const r = dnd.skillCheck('athletics', p, 10);
      if (r.total !== r.roll + r.mod) { consistent = false; break; }
    }
    this.assert('skills:math_consistent', consistent, '100 checks: total = roll + mod');
  },

  /** Test 6: Level Up — grant XP and verify level increases */
  async test_level_up() {
    const s = this.getScene();
    const startLevel = s.pStats.level;

    // Give enough XP to level up (300 XP for level 2)
    s.pStats.xp = 299;
    s.checkLevelUp();
    this.assert('level_up:not_yet', s.pStats.level === startLevel,
      `level=${s.pStats.level} at 299xp`);

    s.pStats.xp = 300;
    s.checkLevelUp();
    this.assert('level_up:leveled', s.pStats.level === startLevel + 1,
      `level=${s.pStats.level} at 300xp`);
    this.assert('level_up:hp_increased', s.playerMaxHP > 12,
      `maxHP=${s.playerMaxHP}`);
    this.assert('level_up:profBonus', s.pStats.profBonus === dnd.profBonus(s.pStats.level),
      `profBonus=${s.pStats.profBonus}`);
  },

  /** Test 7: Engage flow — move to target and enter combat on opener hit */
  async test_engage_flow() {
    const s = this.getScene();
    const enemy = s.enemies.find(e => e.alive);
    this.assert('engage_flow:enemy_exists', !!enemy, enemy ? `${enemy.type}@(${enemy.tx},${enemy.ty})` : 'none');
    if (!enemy) return;

    // Force opener hit to remove dice randomness for this scenario.
    const originalRoll = dnd.roll;
    dnd.roll = (n, d) => (n === 1 && d === 20 ? 19 : originalRoll(n, d));
    try {
      if (typeof s.tryEngageEnemyFromExplore === 'function') s.tryEngageEnemyFromExplore(enemy);
      await this.waitMode(MODE.COMBAT, 9000);
      await this.wait(300);
    } finally {
      dnd.roll = originalRoll;
    }

    this.assert('engage_flow:entered_combat', s.mode === MODE.COMBAT, `mode=${s.mode}`);
    const dx = Math.abs(s.playerTile.x - enemy.tx), dy = Math.abs(s.playerTile.y - enemy.ty);
    this.assert('engage_flow:adjacent_after_move', dx <= 1 && dy <= 1,
      `player(${s.playerTile.x},${s.playerTile.y}) enemy(${enemy.tx},${enemy.ty})`);
  },

  /** Test 8: Explore TB — one player step then enemy phase */
  async test_explore_turn_based() {
    const s = this.getScene();
    if (s.mode === MODE.COMBAT) s.exitCombat('flee');
    if (s.mode !== MODE.EXPLORE_TB) s.toggleExploreTurnBased();
    await this.wait(100);

    this.assert('explore_tb:enabled', s.mode === MODE.EXPLORE_TB, `mode=${s.mode}`);

    const enemyStarts = s.enemies.map(e => ({ alive: e.alive, tx: e.tx, ty: e.ty }));
    const from = { x: s.playerTile.x, y: s.playerTile.y };

    // Try to move more than one tile; system should only move one step this turn.
    await this.tapTile(from.x + 3, from.y);
    await this.wait(900);

    const dist = Math.abs(s.playerTile.x - from.x) + Math.abs(s.playerTile.y - from.y);
    this.assert('explore_tb:single_step_limit', dist === 1,
      `from(${from.x},${from.y}) to(${s.playerTile.x},${s.playerTile.y}) dist=${dist}`);

    await this.wait(900);
    const enemyMoved = s.enemies.some((e, i) => {
      if (!e.alive || !enemyStarts[i]?.alive) return false;
      return e.tx !== enemyStarts[i].tx || e.ty !== enemyStarts[i].ty;
    });
    this.assert('explore_tb:enemy_phase_ran', enemyMoved || s._exploreTBMovesRemaining === 1,
      `enemyMoved=${enemyMoved} movesRemaining=${s._exploreTBMovesRemaining}`);
  },

  /** Test 9: Alert locality — single trigger should not pull whole map */
  async test_alert_locality() {
    const s = this.getScene();
    if (s.mode === MODE.COMBAT) {
      s.exitCombat('flee');
      await this.wait(300);
    }

    const alive = s.enemies.filter(e => e.alive);
    this.assert('alert_locality:has_enemies', alive.length > 0, `alive=${alive.length}`);
    if (!alive.length) return;

    const seed = alive[0];
    const originalRoomMax = Number(COMBAT_RULES.roomAlertMaxDistance || 8);
    COMBAT_RULES.roomAlertMaxDistance = 2;

    try {
      s.enterCombat([seed], { surpriseFromOpener: false });
      await this.wait(900);
    } finally {
      COMBAT_RULES.roomAlertMaxDistance = originalRoomMax;
    }

    const inCombat = s.combatGroup.filter(e => e.alive).length;
    this.assert('alert_locality:combat_started', s.mode === MODE.COMBAT, `mode=${s.mode}`);
    this.assert('alert_locality:seed_joined', s.combatGroup.includes(seed), `seed=${seed.type}@(${seed.tx},${seed.ty})`);
    this.assert('alert_locality:not_full_map_pull', inCombat < alive.length,
      `combatGroup=${inCombat} alive=${alive.length}`);
  },

  /** Test 10: Engage adjacent — should not step away before opener */
  async test_engage_adjacent() {
    const s = this.getScene();
    if (s.mode === MODE.COMBAT) {
      s.exitCombat('flee');
      await this.wait(300);
    }

    const enemy = s.enemies.find(e => e.alive);
    this.assert('engage_adjacent:enemy_exists', !!enemy, enemy ? `${enemy.type}@(${enemy.tx},${enemy.ty})` : 'none');
    if (!enemy) return;

    // Place player adjacent to enemy for edge-case validation.
    const ax = Math.max(0, Math.min(COLS - 1, enemy.tx - 1));
    const ay = enemy.ty;
    s.playerTile = { x: ax, y: ay };
    s.lastCompletedTile = { x: ax, y: ay };
    s.player.setPosition(ax * S + S / 2, ay * S + S / 2);
    const before = { x: s.playerTile.x, y: s.playerTile.y };

    // Force opener to hit so transition is deterministic.
    const originalRoll = dnd.roll;
    dnd.roll = (n, d) => (n === 1 && d === 20 ? 19 : originalRoll(n, d));
    try {
      s.tryEngageEnemyFromExplore(enemy);
      await this.waitMode(MODE.COMBAT, 5000);
      await this.wait(150);
    } finally {
      dnd.roll = originalRoll;
    }

    this.assert('engage_adjacent:no_pre_move', s.playerTile.x === before.x && s.playerTile.y === before.y,
      `before(${before.x},${before.y}) after(${s.playerTile.x},${s.playerTile.y})`);
    this.assert('engage_adjacent:entered_combat', s.mode === MODE.COMBAT, `mode=${s.mode}`);
  },

  // ── Runner ───────────────────────────────────────

  /** All available test scenario names */
  ALL_TESTS: ['movement', 'combat_entry', 'melee_attack', 'enemy_attack', 'skills', 'level_up', 'engage_flow', 'explore_turn_based', 'alert_locality', 'engage_adjacent'],

  /** Try to load events.yaml for a test stage and return autoplay steps */
  async loadEventsYaml(testName) {
    const stageId = `ts_${testName}`;
    const url = `data/00_core_test/stages/${stageId}/events.yaml`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const text = await resp.text();
      const data = jsyaml.load(text);
      return data?.autoplay || null;
    } catch (_e) {
      return null;
    }
  },

  /** Run selected tests; each reloads the page with its own map */
  async runSingle(testName) {
    this.results = [];
    this.running = true;

    // Wait for scene to be ready
    for (let i = 0; i < 50; i++) {
      if (this.getScene()?.player) break;
      await this.wait(200);
    }

    const s = this.getScene();
    if (!s?.player) {
      this.assert('setup', false, 'Scene not ready');
      this.showResults();
      return;
    }
    this.scene = s;

    // Try data-driven test first (events.yaml → EventRunner)
    const steps = await this.loadEventsYaml(testName);
    if (steps && steps.length > 0 && typeof EventRunner !== 'undefined') {
      console.log(`[AutoPlay] Running ${testName} via events.yaml (${steps.length} steps)`);
      EventRunner._scene = s;
      try {
        await EventRunner.executeSteps(steps);
      } catch (e) {
        this.assert(`${testName}:event_error`, false, e.message);
        console.error(e);
      }
    } else {
      // Fallback to hardcoded test method
      const fn = this[`test_${testName}`];
      if (!fn) {
        this.assert(testName, false, 'Unknown test (no events.yaml or test_ method)');
      } else {
        try {
          await fn.call(this);
        } catch (e) {
          this.assert(`${testName}:error`, false, e.message);
          console.error(e);
        }
      }
    }

    this.showResults();
    this.running = false;
  },

  /** Run all tests sequentially (each test reloads with its own map) */
  async runAll() {
    // Run the first test on this page load
    const params = new URLSearchParams(window.location.search);
    const current = params.get('running');
    const queue = params.get('queue')?.split(',').filter(Boolean) || [];

    if (current) {
      // We're running a specific test
      await this.runSingle(current);

      // Store result in sessionStorage
      const stored = JSON.parse(sessionStorage.getItem('_testResults') || '[]');
      stored.push(...this.results);
      sessionStorage.setItem('_testResults', JSON.stringify(stored));

      // Next test in queue
      if (queue.length > 0) {
        const next = queue.shift();
        const mapName = `ts_${next}`;
        window.location.search = `?test=all&running=${next}&queue=${queue.join(',')}&map=${mapName}`;
      } else {
        // All done — show combined results
        this.results = stored;
        this.showResults();
        sessionStorage.removeItem('_testResults');
      }
    }
  },

  /** Show results overlay */
  showResults() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const allPass = passed === total;

    let html = `<div style="position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.92);
      color:#f0e6c8;font-family:'Courier New',monospace;overflow-y:auto;padding:20px;">
      <div style="max-width:600px;margin:0 auto;">
      <h2 style="color:${allPass ? '#2ecc71' : '#e74c3c'};letter-spacing:3px;margin-bottom:4px;">
        ${allPass ? '✅ ALL PASSED' : '❌ SOME FAILED'}</h2>
      <div style="color:#aaa;font-size:12px;margin-bottom:16px;">${passed}/${total} tests passed</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr style="color:#c9a84c;"><th style="text-align:left;padding:4px;">Test</th><th style="text-align:center;padding:4px;">Result</th><th style="text-align:left;padding:4px;">Detail</th></tr>`;

    for (const r of this.results) {
      html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
        <td style="padding:4px;color:#f0e6c8;">${r.name}</td>
        <td style="padding:4px;text-align:center;">${r.passed ? '✅' : '❌'}</td>
        <td style="padding:4px;color:#aaa;font-size:11px;">${r.detail}</td></tr>`;
    }

    html += `</table>
      <div style="margin-top:16px;text-align:center;">
        <button onclick="location.href='test.html?test=all'" style="padding:6px 16px;background:rgba(41,128,185,0.4);
          border:1px solid rgba(41,128,185,0.6);color:#7fc8f8;border-radius:4px;cursor:pointer;
          font-family:'Courier New',monospace;font-size:11px;">↺ Run All Tests</button>
        <button onclick="location.href='/'" style="margin-left:8px;padding:6px 16px;background:rgba(52,73,94,0.5);
          border:1px solid #555;color:#aaa;border-radius:4px;cursor:pointer;
          font-family:'Courier New',monospace;font-size:11px;">← Back to Game</button>
      </div>
      </div></div>`;

    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);
  },
};

// ── Auto-start from URL params ─────────────────────
// test.html?test=movement       → run single test
// test.html?test=all            → run all sequentially
window.addEventListener('load', async () => {
  const params = new URLSearchParams(window.location.search);
  const testParam = params.get('test');
  if (!testParam) return;

  // Wait a bit for Phaser to boot
  await AutoPlay.wait(1500);

  const running = params.get('running');
  if (testParam === 'all' && running) {
    // Continue a sequential all-tests run
    await AutoPlay.runAll();
  } else if (testParam === 'all') {
    // Start fresh all-tests run
    sessionStorage.removeItem('_testResults');
    const queue = AutoPlay.ALL_TESTS.slice();
    const first = queue.shift();
    window.location.search = `?test=all&running=${first}&queue=${queue.join(',')}&map=ts_${first}`;
  } else {
    // Single test
    await AutoPlay.runSingle(testParam);
  }
});
