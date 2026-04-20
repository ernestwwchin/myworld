import { S, TILE, MAP, MODE, DOOR_RULES, mapState } from '@/config';
import { bfs } from '@/helpers';
import { worldToTile } from '@/systems/world-position-system';
import type { GameScene } from '@/game';

const MOVE_SPEED = 440;
const MOVE_SPEED_SNK = 280;

export const ModeExploreMixin = {
  onTapExplore(
    this: GameScene,
    tx: number,
    ty: number,
    enemy: unknown,
    ptr: { worldX?: number; worldY?: number; clientX?: number; clientY?: number } | null,
  ): void {
    const ents = this.getEntitiesAt(tx, ty);
    const hasEntity = ents.length > 0;

    if (enemy && hasEntity) {
      this.buildTileMenu(tx, ty, enemy, ptr as { event?: MouseEvent; clientX?: number; clientY?: number });
      return;
    }
    if (enemy) { this.onTapEnemy(enemy); return; }
    if (hasEntity) {
      const result = this.interactAtTile(tx, ty, { ptr: ptr as { event?: MouseEvent; clientX?: number; clientY?: number }, autoMove: true });
      if (result) return;
    }
    if (this.isWallTile(tx, ty)) return;
    const pop = document.getElementById('enemy-stat-popup');
    if (pop) pop.style.display = 'none';
    const ap = document.getElementById('atk-predict-popup');
    if (ap) ap.style.display = 'none';
    (this as unknown as { _statPopupEnemy: unknown })._statPopupEnemy = null;
    this.setDestination(tx, ty, null, ptr ? { wx: ptr.worldX ?? 0, wy: ptr.worldY ?? 0 } : null);
  },

  updateExplore(this: GameScene, delta: number): void {
    let dx = 0, dy = 0;
    const cursors = this.cursors as { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key };
    const wasd = this.wasd as { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key };
    const left = cursors.left.isDown || wasd.left.isDown;
    const right = cursors.right.isDown || wasd.right.isDown;
    const up = cursors.up.isDown || wasd.up.isDown;
    const down = cursors.down.isDown || wasd.down.isDown;
    if (left) dx = -1;
    if (right) dx = 1;
    if (up) dy = -1;
    if (down) dy = 1;
    if (!dx && !dy) return;

    if (this._ensureCamFollow) this._ensureCamFollow();

    if (this.isMoving) {
      this.tweens.killTweensOf(this.player);
      (this as unknown as { movePath: unknown[]; isMoving: boolean }).movePath = [];
      (this as unknown as { movePath: unknown[]; isMoving: boolean }).isMoving = false;
      this.clearPathDots();
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;

    const speed = this.playerHidden ? MOVE_SPEED_SNK : MOVE_SPEED;
    const px = dx * speed * (delta / 1000);
    const py = dy * speed * (delta / 1000);

    const newX = this.player.x + px;
    const newY = this.player.y + py;

    const margin = 6;
    const checkBlock = (wx: number, wy: number) => {
      const t = worldToTile(wx, wy);
      if (t.x < 0 || t.y < 0 || t.x >= mapState.cols || t.y >= mapState.rows) return true;
      return this.isBlockedTile(t.x, t.y, { doorMode: 'closed' });
    };

    let finalX = this.player.x, finalY = this.player.y;

    if (!checkBlock(newX, newY)) {
      finalX = newX; finalY = newY;
    } else {
      if (px !== 0 && !checkBlock(this.player.x + px, this.player.y)) {
        finalX = this.player.x + px;
      }
      if (py !== 0 && !checkBlock(this.player.x, this.player.y + py)) {
        finalY = this.player.y + py;
      }
    }

    const hw = S / 2 - margin, hh = S / 2 - margin;
    const corners = [
      { x: finalX - hw, y: finalY - hh },
      { x: finalX + hw, y: finalY - hh },
      { x: finalX - hw, y: finalY + hh },
      { x: finalX + hw, y: finalY + hh },
    ];
    const blocked = corners.some((c) => checkBlock(c.x, c.y));
    if (blocked) {
      const cX = [
        { x: this.player.x + px - hw, y: this.player.y - hh },
        { x: this.player.x + px + hw, y: this.player.y - hh },
        { x: this.player.x + px - hw, y: this.player.y + hh },
        { x: this.player.x + px + hw, y: this.player.y + hh },
      ];
      if (px !== 0 && !cX.some((c) => checkBlock(c.x, c.y))) {
        finalX = this.player.x + px; finalY = this.player.y;
      } else {
        const cY = [
          { x: this.player.x - hw, y: this.player.y + py - hh },
          { x: this.player.x + hw, y: this.player.y + py - hh },
          { x: this.player.x - hw, y: this.player.y + py + hh },
          { x: this.player.x + hw, y: this.player.y + py + hh },
        ];
        if (py !== 0 && !cY.some((c) => checkBlock(c.x, c.y))) {
          finalX = this.player.x; finalY = this.player.y + py;
        } else {
          finalX = this.player.x; finalY = this.player.y;
        }
      }
    }

    if (finalX === this.player.x && finalY === this.player.y) return;

    this.player.x = finalX;
    this.player.y = finalY;

    const newTile = worldToTile(finalX, finalY);
    if (newTile.x !== this.playerTile.x || newTile.y !== this.playerTile.y) {
      this.playerTile = { x: newTile.x, y: newTile.y };
      (this as unknown as { lastCompletedTile: { x: number; y: number } }).lastCompletedTile = { x: newTile.x, y: newTile.y };
      this.updateFogOfWar();
      try {
        const er = (window as unknown as { EventRunner?: { onPlayerTile: (x: number, y: number) => void } }).EventRunner;
        if (er) er.onPlayerTile(newTile.x, newTile.y);
      } catch (_e) {}
      this.checkFloorItemPickup();

      if (this.isDoorTile(newTile.x, newTile.y) && DOOR_RULES.autoOpenOnPass) {
        this.setDoorOpen(newTile.x, newTile.y, true, true);
      }

      const tileVal = MAP[newTile.y]?.[newTile.x];
      if (tileVal === TILE.STAIRS) {
        const meta = (window as unknown as { _MAP_META?: { nextStage?: string } })._MAP_META;
        const nextStage = meta?.nextStage;
        if (nextStage) {
          this.showStatus('Descending to the next floor...');
          this.time.delayedCall(300, () => {
            const ml = (window as unknown as { ModLoader?: { transitionToStage: (stage: string, scene: GameScene) => void } }).ModLoader;
            ml?.transitionToStage(nextStage, this);
          });
          return;
        }
      }

      if (this.isExploreMode()) this.checkSight();
      if (this.mode === MODE.COMBAT) return;
    }

    this.playActorMove(this.player, 'player', true);
    (this as unknown as { _wasdMoving: boolean })._wasdMoving = true;
    this.updateHUD();
  },

  _checkWasdIdle(this: GameScene): void {
    const self = this as unknown as { _wasdMoving: boolean };
    if (!self._wasdMoving) return;
    const cursors = this.cursors as { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key };
    const wasd = this.wasd as { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key };
    const anyKey = cursors.left.isDown || wasd.left.isDown
      || cursors.right.isDown || wasd.right.isDown
      || cursors.up.isDown || wasd.up.isDown
      || cursors.down.isDown || wasd.down.isDown;
    if (!anyKey) {
      self._wasdMoving = false;
      this.playActorIdle(this.player, 'player');
    }
  },

  _holdMoveStep(this: GameScene): void {
    const self = this as unknown as { _holdWorldX: number; _holdWorldY: number; movePath: unknown[]; isMoving: boolean };
    const tx = Math.floor(self._holdWorldX / S), ty = Math.floor(self._holdWorldY / S);
    if (tx < 0 || ty < 0 || tx >= mapState.cols || ty >= mapState.rows) return;
    if (tx === this.playerTile.x && ty === this.playerTile.y) return;
    const blk = (x: number, y: number) => this.isBlockedTile(x, y);
    const path = bfs(this.playerTile.x, this.playerTile.y, tx, ty, blk);
    if (!path.length) return;
    self.movePath = [path[0]];
    self.isMoving = true;
    this.advancePath();
  },
};

declare module '@/game' {
  interface GameScene {
    onTapExplore(tx: number, ty: number, enemy: unknown, ptr: unknown): void;
    updateExplore(delta: number): void;
    _checkWasdIdle(): void;
    _holdMoveStep(): void;
    checkSight(): void;
    checkFloorItemPickup(): void;
    setDoorOpen(x: number, y: number, open: boolean, silent?: boolean): void;
    advancePath(): void;
    onTapEnemy(enemy: unknown): void;
    playActorMove(img: unknown, type: unknown, fast?: boolean): void;
    playActorIdle(img: unknown, type: unknown): void;
  }
}
