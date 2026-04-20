import { S, MODE, DOOR_RULES, TILE, MAP, mapState } from '@/config';
import { bfs, stringPull } from '@/helpers';
import { tileToWorld, worldToTile } from '@/systems/world-position-system';
import type { GameScene } from '@/game';
import type { Enemy } from '@/types/actors';

const MOVE_SPEED = 440;
const MOVE_SPEED_SNK = 280;

type Tile = { x: number; y: number };
type FinalPos = { wx: number; wy: number } | null;

export const MovementSystemMixin = {
  cancelCurrentMove(this: GameScene): boolean {
    if (!this.isMoving) return false;
    this.tweens.killTweensOf(this.player);
    const cur = worldToTile(this.player.x, this.player.y);
    this.playerTile = { x: cur.x, y: cur.y };
    this.lastCompletedTile = { x: cur.x, y: cur.y };
    this.movePath = [];
    this.isMoving = false;
    this._movingToAttack = false;
    this.clearPathDots();
    this.onArrival = null;
    this.playActorIdle(this.player, 'player');
    this.updateHUD();
    if (this.mode === MODE.COMBAT && this.isPlayerTurn() && this.playerMoves > 0) this.showMoveRange();
    return true;
  },

  setDestination(
    this: GameScene,
    tx: number,
    ty: number,
    onArrival?: (() => void) | null,
    finalPos?: FinalPos,
  ): void {
    if (this.enemies.some((e) => e.alive && e.tx === tx && e.ty === ty)) return;
    if (this._ensureCamFollow) this._ensureCamFollow();
    const blk = (x: number, y: number) => this.isBlockedTile(x, y);
    let path = bfs(this.playerTile.x, this.playerTile.y, tx, ty, blk);
    if (!path.length) return;
    if (path.length > 2) path = stringPull(path, this.playerTile);
    this.tweens.killTweensOf(this.player);
    this.movePath = path;
    this.isMoving = true;
    this.onArrival = onArrival || null;
    this._finalWorldPos = finalPos || null;
    const tapX = this._finalWorldPos ? this._finalWorldPos.wx : tx * S + S / 2;
    const tapY = this._finalWorldPos ? this._finalWorldPos.wy : ty * S + S / 2;
    this.tapInd.setPosition(tapX, tapY);
    this.tweens.add({ targets: this.tapInd, alpha: { from: 0.9, to: 0 }, duration: 500 });
    this.clearPathDots();
    this._drawPathLine(path, finalPos || null);
    this.advancePath();
  },

  _drawPathLine(this: GameScene, path: Tile[], finalPos: FinalPos): void {
    if (this._pathLineGfx) {
      this._pathLineGfx.destroy();
      this._pathLineGfx = null;
    }
    if (!path.length) return;
    const g = this.add.graphics().setDepth(7);
    const color = 0xd4a857;
    const points: { x: number; y: number }[] = [{ x: this.player.x, y: this.player.y }];
    for (let i = 0; i < path.length - 1; i++) {
      points.push({ x: path[i].x * S + S / 2, y: path[i].y * S + S / 2 });
    }
    const last = path[path.length - 1];
    if (finalPos) {
      const tl = last.x * S + 4;
      const tr = last.x * S + S - 4;
      const tt = last.y * S + 4;
      const tb = last.y * S + S - 4;
      points.push({
        x: Math.max(tl, Math.min(tr, finalPos.wx)),
        y: Math.max(tt, Math.min(tb, finalPos.wy)),
      });
    } else {
      points.push({ x: last.x * S + S / 2, y: last.y * S + S / 2 });
    }
    const dashLen = 8;
    const gapLen = 6;
    g.lineStyle(2.5, color, 0.7);
    for (let i = 0; i < points.length - 1; i++) {
      const ax = points[i].x;
      const ay = points[i].y;
      const bx = points[i + 1].x;
      const by = points[i + 1].y;
      const dx = bx - ax;
      const dy = by - ay;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen < 1) continue;
      const ux = dx / segLen;
      const uy = dy / segLen;
      let d = 0;
      while (d < segLen) {
        const end = Math.min(d + dashLen, segLen);
        g.lineBetween(ax + ux * d, ay + uy * d, ax + ux * end, ay + uy * end);
        d = end + gapLen;
      }
    }
    const dest = points[points.length - 1];
    g.fillStyle(color, 0.8);
    g.fillCircle(dest.x, dest.y, 4);
    g.lineStyle(1.5, color, 0.5);
    g.strokeCircle(dest.x, dest.y, 8);
    this._pathLineGfx = g;
    this.pathDots.push(g);
  },

  clearPathDots(this: GameScene): void {
    this.pathDots.forEach((d) => (d as { destroy?: () => void }).destroy?.());
    this.pathDots = [];
    if (this._pathLineGfx) {
      this._pathLineGfx.destroy();
      this._pathLineGfx = null;
    }
  },

  advancePath(this: GameScene): void {
    if (this.mode === MODE.COMBAT && !this.onArrival) {
      this.isMoving = false;
      this.clearPathDots();
      this.movePath = [];
      return;
    }
    if (!this.movePath.length) {
      this.isMoving = false;
      this.clearPathDots();
      if (this.onArrival) {
        const cb = this.onArrival;
        this.onArrival = null;
        cb();
      } else {
        this.checkSight();
      }
      return;
    }
    const next = this.movePath.shift()!;
    const prev = { x: this.playerTile.x, y: this.playerTile.y };

    if (this.enemies.some((e) => e.alive && e.tx === next.x && e.ty === next.y)) {
      this.isMoving = false;
      this.movePath = [];
      this.clearPathDots();
      return;
    }

    if (this.isDoorTile(next.x, next.y) && DOOR_RULES.autoOpenOnPass) {
      if (!this.setDoorOpen(next.x, next.y, true, true)) {
        this.isMoving = false;
        this.movePath = [];
        this.clearPathDots();
        this.showStatus('Door is locked.');
        return;
      }
    }

    this.playerTile = { x: next.x, y: next.y };
    this.updateFogOfWar();
    this.playActorMove(this.player, 'player', this.movePath.length >= 2);
    const isLastStep = this.movePath.length === 0;
    let wx: number;
    let wy: number;
    if (isLastStep && this._finalWorldPos) {
      const tl = next.x * S + 4;
      const tr = next.x * S + S - 4;
      const tt = next.y * S + 4;
      const tb = next.y * S + S - 4;
      wx = Math.max(tl, Math.min(tr, this._finalWorldPos.wx));
      wy = Math.max(tt, Math.min(tb, this._finalWorldPos.wy));
      this._finalWorldPos = null;
    } else {
      const w = tileToWorld(next.x, next.y);
      wx = w.x;
      wy = w.y;
    }
    const dx = wx - this.player.x;
    const dy = wy - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = this.playerHidden ? MOVE_SPEED_SNK : MOVE_SPEED;
    const moveDur = Math.max(40, (dist / speed) * 1000);
    const tweenTargets: Phaser.GameObjects.GameObject[] = [this.player];
    if (this.mode === MODE.COMBAT && this.turnHL && this.turnHL.alpha > 0) {
      tweenTargets.push(this.turnHL);
    }
    this.tweens.add({
      targets: tweenTargets,
      x: wx,
      y: wy,
      duration: moveDur,
      ease: 'Linear',
      onComplete: () => {
        if (this.isDoorTile(prev.x, prev.y)) {
          const d = this.getDoorState(prev.x, prev.y);
          if (d.auto && d.open) this.setDoorOpen(prev.x, prev.y, false, true);
        }
        this.lastCompletedTile = { x: next.x, y: next.y };
        try {
          const er = (window as unknown as { EventRunner?: { onPlayerTile?: (x: number, y: number) => void } }).EventRunner;
          if (er?.onPlayerTile) er.onPlayerTile(next.x, next.y);
        } catch (_e) {
          console.warn('[EventRunner] tile trigger error:', _e);
        }
        this.checkFloorItemPickup();
        const tileVal = MAP[next.y]?.[next.x];
        if (tileVal === TILE.STAIRS) {
          const meta = (window as unknown as { _MAP_META?: { nextStage?: string } })._MAP_META;
          const nextStageToken = meta?.nextStage;
          const ml = (window as unknown as {
            ModLoader?: {
              resolveNextStage?: (t: string | undefined, s: GameScene) => string;
              transitionToStage?: (s: string, sc: GameScene) => void;
              resolveRunOutcome?: (s: GameScene, outcome: string) => void;
            };
          }).ModLoader;
          const nextStage = ml?.resolveNextStage ? ml.resolveNextStage(nextStageToken, this) : nextStageToken;
          if (nextStage) {
            this.isMoving = false;
            this.movePath = [];
            this.clearPathDots();
            const townStage = ml?.resolveNextStage ? ml.resolveNextStage('town', this) : 'town_hub';
            const extractToTown =
              String(nextStageToken || '').toLowerCase() === 'town' && nextStage === townStage;
            this.showStatus(extractToTown ? 'Extracting to town...' : 'Descending to the next floor...');
            this.time.delayedCall(300, () => {
              if (extractToTown && ml?.resolveRunOutcome) {
                ml.resolveRunOutcome(this, 'extract');
                return;
              }
              ml?.transitionToStage?.(nextStage, this);
            });
            return;
          } else {
            this.showStatus('These stairs are not linked yet (nextStage resolution failed for this floor).');
          }
        }
        if (this.mode === MODE.COMBAT && !this.onArrival) {
          this.isMoving = false;
          this.movePath = [];
          this.clearPathDots();
          this._movingToAttack = false;
          return;
        }
        const wasExplore = this.isExploreMode();
        if (wasExplore && !this._suppressExploreSightChecks) this.checkSight();
        if (wasExplore && this.mode === MODE.COMBAT) {
          this.isMoving = false;
          this.movePath = [];
          this.clearPathDots();
          this._movingToAttack = false;
          return;
        }
        if (!this.movePath.length && !this._holdMoveActive) this.playActorIdle(this.player, 'player');
        this.advancePath();
      },
    });
    this.updateHUD();
  },

  wanderEnemies(this: GameScene, forceStep = false): void {
    if (this.mode !== MODE.EXPLORE) return;
    if (this._engageInProgress && !forceStep) return;
    const dirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
    ];
    for (const e of this.enemies as Enemy[]) {
      if (!e.alive || e.inCombat) continue;
      const ai = e.ai as { patrolPath?: Array<{ x: number; y: number }> } | undefined;
      const hasPatrol = !forceStep && Array.isArray(ai?.patrolPath) && ai!.patrolPath!.length > 0;
      if (!forceStep && !hasPatrol && Math.random() > 0.6) continue;
      let chosenDir: { x: number; y: number } | null = null;

      if (forceStep) {
        const block = (x: number, y: number) => this.isBlockedTile(x, y, { doorMode: 'closed', excludeEnemy: e });
        const chase = bfs(e.tx, e.ty, this.playerTile.x, this.playerTile.y, block);
        if (chase.length) {
          const c = chase[0];
          if (!(c.x === this.playerTile.x && c.y === this.playerTile.y)) {
            chosenDir = { x: c.x - e.tx, y: c.y - e.ty };
          }
        }
      } else if (hasPatrol) {
        if ((e as unknown as { _patrolIdx?: number })._patrolIdx === undefined) (e as unknown as { _patrolIdx: number })._patrolIdx = 0;
        const patrol = ai!.patrolPath!;
        const wp = patrol[(e as unknown as { _patrolIdx: number })._patrolIdx];
        if (e.tx === wp.x && e.ty === wp.y) {
          (e as unknown as { _patrolIdx: number })._patrolIdx = ((e as unknown as { _patrolIdx: number })._patrolIdx + 1) % patrol.length;
        }
        const tgt = patrol[(e as unknown as { _patrolIdx: number })._patrolIdx];
        const block = (x: number, y: number) => this.isBlockedTile(x, y, { doorMode: 'closed', excludeEnemy: e });
        const path = bfs(e.tx, e.ty, tgt.x, tgt.y, block);
        if (path.length) chosenDir = { x: path[0].x - e.tx, y: path[0].y - e.ty };
      }

      const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
      const candidateDirs = chosenDir
        ? [chosenDir, ...shuffled.filter((d) => !(d.x === chosenDir!.x && d.y === chosenDir!.y))]
        : shuffled;
      for (const d of candidateDirs) {
        const nx = e.tx + d.x;
        const ny = e.ty + d.y;
        if (nx < 0 || ny < 0 || nx >= mapState.cols || ny >= mapState.rows) continue;
        if (this.isBlockedTile(nx, ny, { doorMode: 'closed', excludeEnemy: e })) continue;
        if (d.x !== 0 && d.y !== 0 && !this.canMoveDiagonal(e.tx, e.ty, nx, ny)) continue;
        if (nx === this.playerTile.x && ny === this.playerTile.y) continue;
        e.tx = nx;
        e.ty = ny;
        e.facing = (Math.atan2(d.y, d.x) * 180) / Math.PI;
        const wx = nx * S + S / 2;
        const wy = ny * S + S / 2;
        if (!e.img) continue;
        const edx = wx - e.img.x;
        const edy = wy - e.img.y;
        const eDist = Math.sqrt(edx * edx + edy * edy);
        const eDur = Math.max(80, (eDist / MOVE_SPEED) * 1000);
        this.playActorMove(e.img, e.type || '', false);
        this.tweens.add({ targets: e.img, x: wx, y: wy, duration: eDur });
        if (e.hpBg) this.tweens.add({ targets: e.hpBg, x: wx, y: ny * S - 4, duration: eDur });
        if (e.hpFg) this.tweens.add({ targets: e.hpFg, x: wx - (S - 8) / 2, y: ny * S - 4, duration: eDur });
        if (e.lbl) this.tweens.add({ targets: e.lbl, x: wx, y: wy + 18, duration: eDur });
        if (e.sightRing) this.tweens.add({ targets: e.sightRing, x: wx, y: wy, duration: eDur });
        if (e.fa) {
          e.fa.setPosition(wx, ny * S + S / 2);
          (e.fa as unknown as { draw?: (f: number) => void }).draw?.(e.facing);
        }
        this.time.delayedCall(eDur + 20, () => {
          if (e.alive && e.img) this.playActorIdle(e.img, e.type || '');
        });

        const distToPlayer = Math.sqrt((nx - this.playerTile.x) ** 2 + (ny - this.playerTile.y) ** 2);
        if (distToPlayer <= 2.0) {
          this.time.delayedCall(eDur, () => this.checkSight());
        }
        break;
      }
    }
    this.time.delayedCall(400, () => {
      this.drawSightOverlays();
      this.updateFogOfWar();
      this.checkSight();
    });
  },
};

declare module '@/game' {
  interface GameScene {
    cancelCurrentMove(): boolean;
    setDestination(tx: number, ty: number, onArrival?: (() => void) | null, finalPos?: FinalPos): void;
    _drawPathLine(path: Tile[], finalPos: FinalPos): void;
    clearPathDots(): void;
    advancePath(): void;
    wanderEnemies(forceStep?: boolean): void;
    isBlockedTile(x: number, y: number, opts?: { doorMode?: string; excludeEnemy?: Enemy }): boolean;
    canMoveDiagonal(x0: number, y0: number, x1: number, y1: number): boolean;
    isDoorTile(x: number, y: number): boolean;
    setDoorOpen(x: number, y: number, open: boolean, silent: boolean): boolean;
    getDoorState(x: number, y: number): { open: boolean; locked: boolean; auto: boolean };
    playActorIdle(actor: Phaser.GameObjects.Sprite, type: string): void;
    playActorMove(actor: Phaser.GameObjects.Sprite, type: string, far: boolean): void;
    showMoveRange(): void;
    checkFloorItemPickup(): void;
    _finalWorldPos: FinalPos;
    _pathLineGfx: Phaser.GameObjects.Graphics | null;
    _holdMoveActive: boolean;
    updateFogOfWar(): void;
    drawSightOverlays(): void;
    tapInd: Phaser.GameObjects.Image;
    turnHL: Phaser.GameObjects.Image;
  }
}
