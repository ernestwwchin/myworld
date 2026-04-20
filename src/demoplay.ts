import { MODE, MAP, TILE, mapState, S } from '@/config';
import { bfs } from '@/helpers';
import type { GameScene } from '@/game';

export const DemoPlay = {
  running: false,
  _log: [] as string[],

  s(): GameScene | null {
    const w = window as unknown as Record<string, unknown>;
    const g = w.game as { scene?: { getScene(k: string): GameScene | null } } | undefined;
    return g?.scene?.getScene('GameScene') || null;
  },

  wait: (ms: number) => new Promise<void>(r => setTimeout(r, ms)),

  log(msg: string) {
    console.log(`[DemoPlay] ${msg}`);
    this._log.push(msg);
    const el = document.getElementById('demoplay-log');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  },

  stop() {
    this.running = false;
    this.log('Demo stopped.');
    const btn = document.getElementById('demoplay-btn');
    if (btn) btn.querySelector('span')!.textContent = '▶ Demo';
    const el = document.getElementById('demoplay-log');
    if (el) setTimeout(() => { el.style.display = 'none'; }, 2000);
  },

  async start() {
    if (this.running) { this.stop(); return; }
    this.running = true;
    this._log = [];
    const btn = document.getElementById('demoplay-btn');
    if (btn) btn.querySelector('span')!.textContent = '⏹ Stop';

    try {
      await this._run();
    } catch (e) {
      this.log(`Error: ${(e as Error).message}`);
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

      const meta = (window as unknown as { _MAP_META?: Record<string, unknown> })._MAP_META;
      const floor = meta?.floor || '?';
      this.log(`Floor ${floor} — exploring...`);

      if (s.mode === MODE.COMBAT) {
        await this._fightCombat(s);
      } else {
        const reached = await this._exploreToStairs(s);
        if (!reached) {
          this.log('Could not find or reach stairs — stopping.');
          break;
        }
      }

      await this.wait(800);
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

  async _exploreToStairs(s: GameScene): Promise<boolean> {
    const maxSteps = 500;
    const meta = (window as unknown as { _MAP_META?: Record<string, unknown> })._MAP_META;
    const startFloor = meta?.floor;

    for (let step = 0; step < maxSteps && this.running; step++) {
      const curMeta = (window as unknown as { _MAP_META?: Record<string, unknown> })._MAP_META;
      if (curMeta?.floor !== startFloor) return true;

      const cur = this.s();
      if (!cur || !cur.player) { await this.wait(300); continue; }

      if (cur.mode === MODE.COMBAT) {
        await this._fightCombat(cur);
        if (!this.running) return false;
        continue;
      }

      const stairs = this._findStairs();
      if (!stairs) { this.log('No stairs on this floor.'); return false; }

      const px = cur.playerTile.x, py = cur.playerTile.y;
      if (px === stairs.x && py === stairs.y) {
        this.log('On stairs — waiting for transition...');
        await this.wait(1000);
        return true;
      }

      const blk = (x: number, y: number) => cur.isBlockedTile(x, y, { doorMode: false });
      const path = bfs(px, py, stairs.x, stairs.y, blk);
      if (!path.length) {
        this.log('Cannot path to stairs — waiting...');
        await this.wait(400);
        continue;
      }

      const next = path[0];
      (cur as unknown as { onTap(p: { worldX: number; worldY: number }): void }).onTap({ worldX: next.x * S + S / 2, worldY: next.y * S + S / 2 });
      await this._waitIdle(cur, 1500);
      await this.wait(80);
    }

    return false;
  },

  async _fightCombat(s: GameScene) {
    const ss = s as unknown as Record<string, unknown>;
    const combatGroup = ss.combatGroup as Array<Record<string, unknown>> | undefined;
    this.log(`Combat! (${combatGroup?.filter(e => e.alive).length} enemies)`);
    const maxRounds = 40;

    for (let round = 0; round < maxRounds && this.running; round++) {
      if (s.mode !== MODE.COMBAT) break;

      if (ss.diceWaiting) {
        (s as unknown as { _handleDiceDismiss(): void })._handleDiceDismiss();
        await this.wait(300);
        continue;
      }

      const isPlayerTurn = ss.isPlayerTurn as (() => boolean) | undefined;
      if (!isPlayerTurn?.()) {
        await this.wait(300);
        continue;
      }

      const alive = combatGroup?.filter(e => e.alive) || [];
      if (!alive.length) { await this.wait(300); break; }

      const nearest = alive.slice().sort((a, b) => {
        const da = Math.abs(Number(a.tx) - s.playerTile.x) + Math.abs(Number(a.ty) - s.playerTile.y);
        const db = Math.abs(Number(b.tx) - s.playerTile.x) + Math.abs(Number(b.ty) - s.playerTile.y);
        return da - db;
      })[0];

      const playerAP = Number(ss.playerAP ?? 0);
      const playerMoves = Number(ss.playerMoves ?? 0);

      if (playerAP > 0) {
        const dx = Math.abs(s.playerTile.x - Number(nearest.tx));
        const dy = Math.abs(s.playerTile.y - Number(nearest.ty));
        if (dx <= 1 && dy <= 1) {
          this.log(`Attacking ${nearest.displayName || nearest.type}`);
          (ss.playerAttackEnemy as (e: unknown) => void)(nearest);
          await this.wait(600);
        } else if (playerMoves > 0) {
          this.log(`Moving toward ${nearest.displayName || nearest.type}`);
          (ss.tryMoveAndAttack as (e: unknown) => void)(nearest);
          await this._waitIdle(s, 2000);
          await this.wait(400);
        } else {
          (ss.endPlayerTurn as () => void)();
          await this.wait(400);
        }
      } else if (playerMoves > 0) {
        const blk = (x: number, y: number) => s.isBlockedTile(x, y, { doorMode: false });
        const path = bfs(s.playerTile.x, s.playerTile.y, Number(nearest.tx), Number(nearest.ty), blk);
        if (path.length > 1) {
          const stepIdx = Math.min(playerMoves - 1, path.length - 2);
          const step = path[stepIdx];
          s.setDestination(step.x, step.y, () => {});
          await this._waitIdle(s, 2000);
        }
        await this.wait(200);
        (ss.endPlayerTurn as () => void)();
        await this.wait(400);
      } else {
        (ss.endPlayerTurn as () => void)();
        await this.wait(400);
      }

      await this.wait(200);
    }
  },

  _findStairs(): { x: number; y: number } | null {
    const meta = (window as unknown as { _MAP_META?: Record<string, unknown> })._MAP_META;
    if (meta?.stairsPos) return meta.stairsPos as { x: number; y: number };
    for (let y = 0; y < mapState.rows; y++)
      for (let x = 0; x < mapState.cols; x++)
        if (MAP[y]?.[x] === TILE.STAIRS) return { x, y };
    return null;
  },

  async _waitIdle(s: GameScene, timeout = 3000) {
    const start = Date.now();
    const ss = s as unknown as Record<string, unknown>;
    while (ss.isMoving && Date.now() - start < timeout) {
      await this.wait(60);
    }
  },
};

(window as unknown as Record<string, unknown>).DemoPlay = DemoPlay;
