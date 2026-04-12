// ═══════════════════════════════════════════════════════
// demoplay.js — Automated dungeon run through all 5 floors
// Triggered by the "Demo Run" button or DemoPlay.start()
// Not a test — just plays through the game automatically.
// ═══════════════════════════════════════════════════════

const DemoPlay = {
  running: false,
  _log: [],

  s() { return window.game?.scene?.getScene('GameScene'); },
  wait: ms => new Promise(r => setTimeout(r, ms)),

  log(msg) {
    console.log(`[DemoPlay] ${msg}`);
    this._log.push(msg);
    const el = document.getElementById('demoplay-log');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  },

  stop() {
    this.running = false;
    this.log('Demo stopped.');
    const btn = document.getElementById('demoplay-btn');
    if (btn) btn.querySelector('span').textContent = '▶ Demo';
    const el = document.getElementById('demoplay-log');
    if (el) setTimeout(() => { el.style.display = 'none'; }, 2000);
  },

  async start() {
    if (this.running) { this.stop(); return; }
    this.running = true;
    this._log = [];
    const btn = document.getElementById('demoplay-btn');
    if (btn) btn.querySelector('span').textContent = '⏹ Stop';

    try {
      await this._run();
    } catch (e) {
      this.log(`Error: ${e.message}`);
      console.error(e);
    }
    this.stop();
  },

  async _run() {
    const FINAL_FLOOR = 'B5F';
    let floorsVisited = 0;

    while (this.running) {
      const s = this.s();
      if (!s) { await this.wait(500); continue; }

      const floor = window._MAP_META?.floor || '?';
      this.log(`Floor ${floor} — exploring...`);

      // Handle whatever mode we're in
      if (s.mode === MODE.COMBAT) {
        await this._fightCombat(s);
      } else {
        const reached = await this._exploreToStairs(s);
        if (!reached) {
          this.log('Could not find or reach stairs — stopping.');
          break;
        }
      }

      // Wait for scene restart to settle after transition
      await this.wait(800);
      // Wait until new scene is ready
      for (let i = 0; i < 30 && this.running; i++) {
        const cur = this.s();
        if (cur?.player && cur.mode !== undefined) break;
        await this.wait(200);
      }

      if (floor === FINAL_FLOOR) {
        this.log(`Reached ${FINAL_FLOOR} — demo complete!`);
        break;
      }

      floorsVisited++;
      if (floorsVisited > 10) { this.log('Safety limit hit — stopping.'); break; }
    }
  },

  // ─────────────────────────────────────────────────────
  // EXPLORE: walk toward stairs, handle sight checks
  // ─────────────────────────────────────────────────────
  async _exploreToStairs(s) {
    const maxSteps = 500;
    const startFloor = window._MAP_META?.floor;

    for (let step = 0; step < maxSteps && this.running; step++) {
      // Detect floor transition — scene restarted, exit so _run loop re-fetches scene
      if (window._MAP_META?.floor !== startFloor) return true;

      // Re-fetch live scene in case of restart
      const cur = this.s();
      if (!cur || !cur.player) { await this.wait(300); continue; }

      if (cur.mode === MODE.COMBAT) {
        await this._fightCombat(cur);
        if (!this.running) return false;
        continue;
      }

      const stairs = this._findStairs(cur);
      if (!stairs) { this.log('No stairs on this floor.'); return false; }

      const px = cur.playerTile.x, py = cur.playerTile.y;
      if (px === stairs.x && py === stairs.y) {
        this.log('On stairs — waiting for transition...');
        await this.wait(1000);
        return true;
      }

      const blk = (x, y) => cur.isBlockedTile(x, y, {doorMode:false});
      const path = bfs(px, py, stairs.x, stairs.y, blk);
      if (!path.length) {
        this.log('Cannot path to stairs — waiting...');
        await this.wait(400);
        continue;
      }

      const next = path[0];
      cur.onTap({ worldX: next.x * S + S / 2, worldY: next.y * S + S / 2 });
      await this._waitIdle(cur, 1500);
      await this.wait(80);
    }

    return false;
  },

  // ─────────────────────────────────────────────────────
  // COMBAT: attack nearest enemy each turn, end turn otherwise
  // ─────────────────────────────────────────────────────
  async _fightCombat(s) {
    this.log(`Combat! (${s.combatGroup?.filter(e => e.alive).length} enemies)`);
    const maxRounds = 40;

    for (let round = 0; round < maxRounds && this.running; round++) {
      if (s.mode !== MODE.COMBAT) break;

      // Dismiss any dice popup
      if (s.diceWaiting) {
        s._handleDiceDismiss();
        await this.wait(300);
        continue;
      }

      if (!s.isPlayerTurn?.()) {
        await this.wait(300);
        continue;
      }

      // Player turn — find nearest alive enemy
      const alive = s.combatGroup.filter(e => e.alive);
      if (!alive.length) { await this.wait(300); break; }

      const nearest = alive.slice().sort((a, b) => {
        const da = Math.abs(a.tx - s.playerTile.x) + Math.abs(a.ty - s.playerTile.y);
        const db = Math.abs(b.tx - s.playerTile.x) + Math.abs(b.ty - s.playerTile.y);
        return da - db;
      })[0];

      if (s.playerAP > 0) {
        const dx = Math.abs(s.playerTile.x - nearest.tx);
        const dy = Math.abs(s.playerTile.y - nearest.ty);
        if (dx <= 1 && dy <= 1) {
          this.log(`Attacking ${nearest.displayName || nearest.type}`);
          s.playerAttackEnemy(nearest);
          await this.wait(600);
        } else if (s.playerMoves > 0) {
          this.log(`Moving toward ${nearest.displayName || nearest.type}`);
          s.tryMoveAndAttack(nearest);
          await this._waitIdle(s, 2000);
          await this.wait(400);
        } else {
          s.endPlayerTurn();
          await this.wait(400);
        }
      } else if (s.playerMoves > 0) {
        // No AP but has moves — move closer for next round via setDestination
        const blk = (x, y) => s.isBlockedTile(x, y, {doorMode:false});
        const path = bfs(s.playerTile.x, s.playerTile.y, nearest.tx, nearest.ty, blk);
        if (path.length > 1) {
          const stepIdx = Math.min(s.playerMoves - 1, path.length - 2);
          const step = path[stepIdx];
          s.setDestination(step.x, step.y, () => {});
          await this._waitIdle(s, 2000);
        }
        await this.wait(200);
        s.endPlayerTurn();
        await this.wait(400);
      } else {
        s.endPlayerTurn();
        await this.wait(400);
      }

      await this.wait(200);
    }
  },

  // ─────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────
  _findStairs(s) {
    // Prefer _MAP_META.stairsPos (generated maps)
    const meta = window._MAP_META;
    if (meta?.stairsPos) return meta.stairsPos;
    // Scan grid for stairs tile
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (MAP[y][x] === TILE.STAIRS) return { x, y };
    return null;
  },

  async _waitIdle(s, timeout = 3000) {
    const start = Date.now();
    while (s.isMoving && Date.now() - start < timeout) {
      await this.wait(60);
    }
  },
};
