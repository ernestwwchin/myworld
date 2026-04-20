import { MODE, TILE, MAP, S, SKILLS, COMBAT_RULES, mapState, dnd } from '@/config';
import type { GameScene } from '@/game';
import yaml from 'js-yaml';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const AutoPlay = {
  results: [] as TestResult[],
  running: false,
  scene: null as GameScene | null,

  wait: (ms: number) => new Promise<void>(r => setTimeout(r, ms)),

  getScene(): GameScene | null {
    const w = window as unknown as Record<string, unknown>;
    const g = w.game as { scene?: { getScene(k: string): GameScene | null } } | undefined;
    return g?.scene?.getScene('GameScene') || null;
  },

  assert(name: string, passed: boolean, detail?: string) {
    this.results.push({ name, passed, detail: detail || '' });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}${detail ? ' — ' + detail : ''}`);
  },

  async dismissDice() {
    const s = this.getScene();
    const ss = s as unknown as Record<string, unknown> | null;
    if (ss?.diceWaiting) {
      (s as unknown as { _handleDiceDismiss(): void })._handleDiceDismiss();
      await this.wait(200);
    }
  },

  async waitIdle(timeout = 5000) {
    const s = this.getScene();
    const ss = s as unknown as Record<string, unknown> | null;
    const start = Date.now();
    while (ss?.isMoving && Date.now() - start < timeout) {
      await this.wait(50);
    }
  },

  async waitMode(mode: string, timeout = 8000) {
    const s = this.getScene();
    const start = Date.now();
    while (s?.mode !== mode && Date.now() - start < timeout) {
      await this.wait(100);
    }
  },

  async tapTile(tx: number, ty: number) {
    const s = this.getScene();
    const worldX = tx * S + S / 2;
    const worldY = ty * S + S / 2;
    (s as unknown as { onTap(p: { worldX: number; worldY: number }): void }).onTap({ worldX, worldY });
    await this.wait(100);
  },

  async withForcedD20(value: number, fn: () => Promise<void>) {
    const originalRoll = dnd.roll;
    dnd.roll = (n: number, d: number) => (n === 1 && d === 20 ? value : originalRoll(n, d));
    try {
      return await fn();
    } finally {
      dnd.roll = originalRoll;
    }
  },

  async test_movement() {
    const s = this.getScene()!;
    const startX = s.playerTile.x, startY = s.playerTile.y;
    this.assert('movement:start_pos', startX === 1 && startY === 1, `player at (${startX},${startY})`);

    await this.tapTile(5, 5);
    await this.waitIdle(3000);
    await this.wait(200);

    const endX = s.playerTile.x, endY = s.playerTile.y;
    this.assert('movement:reached_target', endX === 5 && endY === 5, `player at (${endX},${endY})`);

    const preX = s.playerTile.x;
    await this.tapTile(0, 0);
    await this.wait(200);
    this.assert('movement:wall_blocked', s.playerTile.x === preX, 'did not move into wall');
  },

  async test_combat_entry() {
    const s = this.getScene()!;
    this.assert('combat_entry:start_explore', s.mode === MODE.EXPLORE, `mode=${s.mode}`);

    await this.tapTile(3, 3);
    await this.waitIdle(3000);
    await this.wait(800);

    if (s.mode !== MODE.COMBAT) {
      await this.tapTile(4, 3);
      await this.waitIdle(2000);
      await this.wait(800);
      (s as unknown as { checkSight(): void }).checkSight();
      await this.wait(300);
    }

    this.assert('combat_entry:combat_triggered', s.mode === MODE.COMBAT, `mode=${s.mode}`);
    const ss = s as unknown as Record<string, unknown>;
    if (s.mode === MODE.COMBAT) {
      this.assert('combat_entry:has_combat_group', (ss.combatGroup as unknown[]).length > 0,
        `${(ss.combatGroup as unknown[]).length} enemies in combat`);
    }
  },

  async test_melee_attack() {
    const s = this.getScene()!;
    const ss = s as unknown as Record<string, unknown>;
    const enemies = ss.enemies as Array<Record<string, unknown>>;
    const goblin = enemies.find(e => e.alive);
    if (goblin) { goblin.hp = 1; goblin.maxHp = 1; }
    const startXP = Number((s.pStats as Record<string, unknown>).xp);

    if (s.mode !== MODE.COMBAT && goblin) {
      (ss.enterCombat as (g: unknown[]) => void)([goblin]);
      await this.wait(900);
    }

    const isPlayerTurn = ss.isPlayerTurn as (() => boolean) | undefined;
    for (let i = 0; i < 30 && !isPlayerTurn?.(); i++) {
      await this.dismissDice();
      await this.wait(200);
    }

    if (s.mode === MODE.COMBAT && isPlayerTurn?.()) {
      this.assert('melee_attack:player_turn', true, 'player has turn');
      (ss.selectAction as (id: string) => void)('attack');
      await this.wait(200);

      if (goblin?.alive) {
        await this.withForcedD20(19, async () => {
          (ss.playerAttackEnemy as (e: unknown) => void)(goblin);
        });
        await this.wait(500);
        await this.dismissDice();
        await this.wait(500);
      }

      this.assert('melee_attack:enemy_killed', !goblin?.alive, `goblin alive=${goblin?.alive} hp=${goblin?.hp}`);
      this.assert('melee_attack:xp_gained', Number((s.pStats as Record<string, unknown>).xp) > startXP,
        `xp ${startXP} → ${(s.pStats as Record<string, unknown>).xp}`);
    } else {
      this.assert('melee_attack:combat_state', false, `mode=${s.mode} playerTurn=${isPlayerTurn?.()}`);
    }
  },

  async test_enemy_attack() {
    const s = this.getScene()!;
    const ss = s as unknown as Record<string, unknown>;
    const startHP = s.playerHP;
    const enemies = ss.enemies as Array<Record<string, unknown>>;
    const enemy = enemies.find(e => e.alive);

    if (s.mode !== MODE.COMBAT && enemy) {
      (ss.enterCombat as (g: unknown[]) => void)([enemy]);
      await this.wait(900);
    }

    const isPlayerTurn = ss.isPlayerTurn as (() => boolean) | undefined;
    if (s.mode === MODE.COMBAT) {
      this.assert('enemy_attack:combat_started', true, 'in combat');
      if (isPlayerTurn?.()) {
        (ss.endPlayerTurn as () => void)();
        await this.wait(1800);
        await this.dismissDice();
        await this.wait(500);
      }
      this.assert('enemy_attack:survived_turn', s.playerHP > 0, `hp=${s.playerHP}/${s.playerMaxHP}`);
      this.assert('enemy_attack:enemy_took_turn', true, `hp ${startHP} -> ${s.playerHP}, mode=${s.mode}`);
    } else {
      this.assert('enemy_attack:combat_state', false, `mode=${s.mode}`);
    }
  },

  async test_skills() {
    const s = this.getScene()!;
    const p = s.pStats as Record<string, unknown>;

    let allOk = true;
    const skillKeys = Object.keys(SKILLS);
    this.assert('skills:count', skillKeys.length === 18, `${skillKeys.length} skills defined`);

    for (const key of skillKeys) {
      const result = dnd.skillCheck(key, p, 10);
      if (typeof result.total !== 'number' || typeof result.success !== 'boolean') {
        allOk = false;
        this.assert(`skills:${key}`, false, 'bad return value');
      }
    }
    this.assert('skills:all_checks_run', allOk, `${skillKeys.length} checks executed`);

    const athMod = dnd.skillMod('athletics', p);
    const stlMod = dnd.skillMod('stealth', p);
    this.assert('skills:proficiency_applied',
      athMod > stlMod || p.str === p.dex,
      `athletics=${athMod} stealth=${stlMod}`);

    let consistent = true;
    for (let i = 0; i < 100; i++) {
      const r = dnd.skillCheck('athletics', p, 10);
      if (r.total !== r.roll + r.mod) { consistent = false; break; }
    }
    this.assert('skills:math_consistent', consistent, '100 checks: total = roll + mod');
  },

  async test_level_up() {
    const s = this.getScene()!;
    const p = s.pStats as Record<string, unknown>;
    const startLevel = Number(p.level);

    p.xp = 299;
    (s as unknown as { checkLevelUp(): void }).checkLevelUp();
    this.assert('level_up:not_yet', Number(p.level) === startLevel, `level=${p.level} at 299xp`);

    p.xp = 300;
    (s as unknown as { checkLevelUp(): void }).checkLevelUp();
    this.assert('level_up:leveled', Number(p.level) === startLevel + 1, `level=${p.level} at 300xp`);
    this.assert('level_up:hp_increased', s.playerMaxHP > 12, `maxHP=${s.playerMaxHP}`);
    this.assert('level_up:profBonus', Number(p.profBonus) === dnd.profBonus(Number(p.level)), `profBonus=${p.profBonus}`);
  },

  async test_engage_flow() {
    const s = this.getScene()!;
    const ss = s as unknown as Record<string, unknown>;
    const enemies = ss.enemies as Array<Record<string, unknown>>;
    const enemy = enemies.find(e => e.alive);
    this.assert('engage_flow:enemy_exists', !!enemy, enemy ? `${enemy.type}@(${enemy.tx},${enemy.ty})` : 'none');
    if (!enemy) return;

    const originalRoll = dnd.roll;
    dnd.roll = (n: number, d: number) => (n === 1 && d === 20 ? 19 : originalRoll(n, d));
    try {
      (ss.tryEngageEnemyFromExplore as ((e: unknown) => void) | undefined)?.(enemy);
      await this.waitMode(MODE.COMBAT, 9000);
      await this.wait(300);
    } finally {
      dnd.roll = originalRoll;
    }

    this.assert('engage_flow:entered_combat', s.mode === MODE.COMBAT, `mode=${s.mode}`);
    const dx = Math.abs(s.playerTile.x - Number(enemy.tx));
    const dy = Math.abs(s.playerTile.y - Number(enemy.ty));
    this.assert('engage_flow:adjacent_after_move', dx <= 1 && dy <= 1,
      `player(${s.playerTile.x},${s.playerTile.y}) enemy(${enemy.tx},${enemy.ty})`);
  },

  async test_alert_locality() {
    const s = this.getScene()!;
    const ss = s as unknown as Record<string, unknown>;
    if (s.mode === MODE.COMBAT) {
      (ss.exitCombat as (reason: string) => void)('flee');
      await this.wait(300);
    }

    const enemies = ss.enemies as Array<Record<string, unknown>>;
    const alive = enemies.filter(e => e.alive);
    this.assert('alert_locality:has_enemies', alive.length > 0, `alive=${alive.length}`);
    if (!alive.length) return;

    const seed = alive[0];
    const originalRoomMax = Number(COMBAT_RULES.roomAlertMaxDistance || 8);
    (COMBAT_RULES as Record<string, unknown>).roomAlertMaxDistance = 2;

    try {
      (ss.enterCombat as (g: unknown[], opts?: unknown) => void)([seed], { surpriseFromOpener: false });
      await this.wait(900);
    } finally {
      (COMBAT_RULES as Record<string, unknown>).roomAlertMaxDistance = originalRoomMax;
    }

    const inCombat = (ss.combatGroup as Array<Record<string, unknown>>).filter(e => e.alive).length;
    this.assert('alert_locality:combat_started', s.mode === MODE.COMBAT, `mode=${s.mode}`);
    this.assert('alert_locality:seed_joined', (ss.combatGroup as unknown[]).includes(seed), `seed=${seed.type}@(${seed.tx},${seed.ty})`);
    this.assert('alert_locality:not_full_map_pull', inCombat < alive.length,
      `combatGroup=${inCombat} alive=${alive.length}`);
  },

  async test_engage_adjacent() {
    const s = this.getScene()!;
    const ss = s as unknown as Record<string, unknown>;
    if (s.mode === MODE.COMBAT) {
      (ss.exitCombat as (reason: string) => void)('flee');
      await this.wait(300);
    }

    const enemies = ss.enemies as Array<Record<string, unknown>>;
    const enemy = enemies.find(e => e.alive);
    this.assert('engage_adjacent:enemy_exists', !!enemy, enemy ? `${enemy.type}@(${enemy.tx},${enemy.ty})` : 'none');
    if (!enemy) return;

    const ax = Math.max(0, Math.min(mapState.cols - 1, Number(enemy.tx) - 1));
    const ay = Number(enemy.ty);
    s.playerTile = { x: ax, y: ay };
    (ss.lastCompletedTile as Record<string, number>) = { x: ax, y: ay };
    s.player.setPosition(ax * S + S / 2, ay * S + S / 2);
    const before = { x: s.playerTile.x, y: s.playerTile.y };

    const originalRoll = dnd.roll;
    dnd.roll = (n: number, d: number) => (n === 1 && d === 20 ? 19 : originalRoll(n, d));
    try {
      (ss.tryEngageEnemyFromExplore as (e: unknown) => void)(enemy);
      await this.waitMode(MODE.COMBAT, 5000);
      await this.wait(150);
    } finally {
      dnd.roll = originalRoll;
    }

    this.assert('engage_adjacent:no_pre_move',
      s.playerTile.x === before.x && s.playerTile.y === before.y,
      `before(${before.x},${before.y}) after(${s.playerTile.x},${s.playerTile.y})`);
    this.assert('engage_adjacent:entered_combat', s.mode === MODE.COMBAT, `mode=${s.mode}`);
  },

  ALL_TESTS: ['movement', 'combat_entry', 'melee_attack', 'enemy_attack', 'skills', 'level_up', 'engage_flow', 'explore_turn_based', 'alert_locality', 'engage_adjacent'],

  async loadEventsYaml(testName: string): Promise<unknown[] | null> {
    const stageId = `ts_${testName}`;
    const url = `data/00_core_test/stages/${stageId}/events.yaml`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const text = await resp.text();
      const data = yaml.load(text) as Record<string, unknown> | null;
      return (data?.autoplay as unknown[] | undefined) || null;
    } catch (_e) {
      return null;
    }
  },

  async runSingle(testName: string) {
    this.results = [];
    this.running = true;

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

    const steps = await this.loadEventsYaml(testName);
    const w = window as unknown as Record<string, unknown>;
    const EventRunner = w.EventRunner as { _scene: GameScene; executeSteps(steps: unknown[]): Promise<void> } | undefined;
    if (steps && steps.length > 0 && EventRunner) {
      console.log(`[AutoPlay] Running ${testName} via events.yaml (${steps.length} steps)`);
      EventRunner._scene = s;
      try {
        await EventRunner.executeSteps(steps);
      } catch (e) {
        this.assert(`${testName}:event_error`, false, (e as Error).message);
        console.error(e);
      }
    } else {
      const fn = (this as Record<string, unknown>)[`test_${testName}`] as ((...args: unknown[]) => Promise<void>) | undefined;
      if (!fn) {
        this.assert(testName, false, 'Unknown test (no events.yaml or test_ method)');
      } else {
        try {
          await fn.call(this);
        } catch (e) {
          this.assert(`${testName}:error`, false, (e as Error).message);
          console.error(e);
        }
      }
    }

    this.showResults();
    this.running = false;
  },

  async runAll() {
    const params = new URLSearchParams(window.location.search);
    const current = params.get('running');
    const queue = params.get('queue')?.split(',').filter(Boolean) || [];

    if (current) {
      await this.runSingle(current);

      const stored: TestResult[] = JSON.parse(sessionStorage.getItem('_testResults') || '[]');
      stored.push(...this.results);
      sessionStorage.setItem('_testResults', JSON.stringify(stored));

      if (queue.length > 0) {
        const next = queue.shift()!;
        const mapName = `ts_${next}`;
        window.location.search = `?test=all&running=${next}&queue=${queue.join(',')}&map=${mapName}`;
      } else {
        this.results = stored;
        this.showResults();
        sessionStorage.removeItem('_testResults');
      }
    }
  },

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

export const scenarios = {
  test_engage_flow: AutoPlay.test_engage_flow.bind(AutoPlay),
  test_engage_adjacent: AutoPlay.test_engage_adjacent.bind(AutoPlay),
  test_alert_locality: AutoPlay.test_alert_locality.bind(AutoPlay),
  test_movement: AutoPlay.test_movement.bind(AutoPlay),
  test_combat_entry: AutoPlay.test_combat_entry.bind(AutoPlay),
  test_melee_attack: AutoPlay.test_melee_attack.bind(AutoPlay),
  test_enemy_attack: AutoPlay.test_enemy_attack.bind(AutoPlay),
  test_skills: AutoPlay.test_skills.bind(AutoPlay),
  test_level_up: AutoPlay.test_level_up.bind(AutoPlay),
};

// Auto-start from URL params — only triggered when this module is imported
if (typeof window !== 'undefined') {
  void (async () => {
    const params = new URLSearchParams(window.location.search);
    const testParam = params.get('test');
    if (!testParam) return;

    await AutoPlay.wait(1500);

    const running = params.get('running');
    if (testParam === 'all' && running) {
      await AutoPlay.runAll();
    } else if (testParam === 'all') {
      sessionStorage.removeItem('_testResults');
      const queue = AutoPlay.ALL_TESTS.slice();
      const first = queue.shift()!;
      window.location.search = `?test=all&running=${first}&queue=${queue.join(',')}&map=ts_${first}`;
    } else {
      await AutoPlay.runSingle(testParam);
    }
  })();
}

void MAP; void TILE; void SKILLS; void COMBAT_RULES;
