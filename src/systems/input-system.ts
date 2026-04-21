import Phaser from 'phaser';
import { S, MODE, mapState } from '@/config';
import type { GameScene } from '@/game';
import type { Enemy } from '@/types/actors';

type MenuItem = { label: string; action: () => void };

export const InputSystemMixin = {
  _ctxMenuOpenedAt: 0,

  hideContextMenu(): void {
    const menu = document.getElementById('context-menu');
    if (menu) menu.style.display = 'none';
  },

  showContextMenu(this: GameScene, x: number, y: number, options: MenuItem[]): void {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    menu.innerHTML = '';
    for (const opt of options) {
      const item = document.createElement('div');
      item.style.cssText =
        'padding:8px 12px;cursor:pointer;color:#c9a84c;transition:all 0.15s;border-radius:3px;';
      item.textContent = opt.label;
      item.onmouseenter = () => (item.style.backgroundColor = 'rgba(200,180,100,0.15)');
      item.onmouseleave = () => (item.style.backgroundColor = '');
      item.onclick = (e) => {
        e.stopPropagation();
        this.hideContextMenu();
        opt.action();
      };
      menu.appendChild(item);
    }
    menu.style.left = '0px';
    menu.style.top = '0px';
    menu.style.display = 'block';
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = Math.min(x, vw - mw - 4);
    const cy = Math.min(y, vh - mh - 4);
    menu.style.left = Math.max(0, cx) + 'px';
    menu.style.top = Math.max(0, cy) + 'px';
    this._ctxMenuOpenedAt = Date.now();
  },

  initInputHandlers(this: GameScene): void {
    document.addEventListener('contextmenu', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('#gc') || target.closest('#ui-overlay')) {
        e.preventDefault();
      }
    });

    document.addEventListener(
      'click',
      (e) => {
        const menu = document.getElementById('context-menu');
        if (menu && menu.style.display === 'block' && !(e.target instanceof Node && menu.contains(e.target))) {
          if (Date.now() - this._ctxMenuOpenedAt < 300) return;
          this.hideContextMenu();
        }
      },
      { passive: true },
    );
  },

  onTap(this: GameScene, ptr: Phaser.Input.Pointer): void {
    const ctx = document.getElementById('context-menu');
    if (ctx?.style.display === 'block') {
      ctx.style.display = 'none';
      return;
    }
    const esp = document.getElementById('enemy-stat-popup');
    if (esp?.style.display === 'block') {
      esp.style.display = 'none';
      this._statPopupEnemy = null;
      const ap = document.getElementById('atk-predict-popup');
      if (ap) ap.style.display = 'none';
    }

    if (this.diceWaiting) {
      this._handleDiceDismiss();
      return;
    }
    if (this.isMoving) {
      if (this.mode === MODE.COMBAT) {
        this.cancelCurrentMove();
      } else {
        this.cancelCurrentMove();
        return;
      }
    }
    this.hideContextMenu();
    const tx = Math.floor(ptr.worldX / S);
    const ty = Math.floor(ptr.worldY / S);
    if (tx < 0 || ty < 0 || tx >= mapState.cols || ty >= mapState.rows) return;
    let enemy = this.enemies.find((e) => e.alive && e.tx === tx && e.ty === ty);
    if (!enemy) {
      // Fallback: match by sprite position (handles mid-tween patrolling enemies)
      enemy = (this.enemies as Array<{ alive: boolean; img?: { x: number; y: number; active: boolean } }>)
        .find((e) => e.alive && e.img && e.img.active &&
          Math.abs(e.img.x - ptr.worldX) < S / 2 && Math.abs(e.img.y - ptr.worldY) < S / 2) as typeof enemy;
    }

    if (enemy && typeof ptr.rightButtonDown === 'function' && ptr.rightButtonDown()) {
      this.showCombatEnemyPopup(enemy);
      return;
    }

    if (this.mode === MODE.COMBAT) {
      this.onTapCombat(tx, ty, enemy, ptr);
      return;
    }
    this.onTapExplore(tx, ty, enemy, ptr);
  },

  _holdMoveThreshold: 200,
  _holdMoveActive: false,
  _holdWorldX: 0,
  _holdWorldY: 0,
  _holdTimer: null as Phaser.Time.TimerEvent | null,

  _onHzPointerDown(this: GameScene, ptr: Phaser.Input.Pointer): void {
    if (ptr.button !== 0) return;
    if (this._touchPanning) return;
    this.onTap(ptr);
    if (this._holdTimer) {
      this._holdTimer.remove();
      this._holdTimer = null;
    }
    this._holdWorldX = ptr.worldX;
    this._holdWorldY = ptr.worldY;
    this._holdTimer = this.time.delayedCall(this._holdMoveThreshold, () => {
      this._holdTimer = null;
      if (!this.isExploreMode() || this.mode === MODE.COMBAT) return;
      this._holdMoveActive = true;
      if (this.movePath.length > 0) {
        this.movePath = [];
        this.clearPathDots();
      }
    });
  },

  _onHzPointerMove(this: GameScene, ptr: Phaser.Input.Pointer): void {
    if (!this._holdMoveActive) return;
    this._holdWorldX = ptr.worldX;
    this._holdWorldY = ptr.worldY;
  },

  _onHzPointerUp(this: GameScene): void {
    if (this._holdTimer) {
      this._holdTimer.remove();
      this._holdTimer = null;
    }
    this._holdMoveActive = false;
  },
};

declare module '@/game' {
  interface GameScene {
    _ctxMenuOpenedAt: number;
    _holdMoveThreshold: number;
    _holdMoveActive: boolean;
    _holdWorldX: number;
    _holdWorldY: number;
    _holdTimer: Phaser.Time.TimerEvent | null;
    _statPopupEnemy: Enemy | null;
    hideContextMenu(): void;
    showContextMenu(x: number, y: number, options: MenuItem[]): void;
    initInputHandlers(): void;
    onTap(ptr: Phaser.Input.Pointer): void;
    _onHzPointerDown(ptr: Phaser.Input.Pointer): void;
    _onHzPointerMove(ptr: Phaser.Input.Pointer): void;
    _onHzPointerUp(): void;
    _handleDiceDismiss(): void;
    showCombatEnemyPopup(enemy: Enemy): void;
    onTapCombat(tx: number, ty: number, enemy: Enemy | undefined, ptr: Phaser.Input.Pointer): void;
    onTapExplore(tx: number, ty: number, enemy: Enemy | undefined, ptr: Phaser.Input.Pointer): void;
  }
}
