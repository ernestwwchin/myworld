import { S, MODE, COMBAT_RULES, LIGHT_RULES, mapState } from '@/config';
import { hasLOS, inFOV } from '@/helpers';
import type { GameScene } from '@/game';
import type { Enemy } from '@/types/actors';

export const SightSystemMixin = {
  _sightRangesByLight(this: GameScene, enemy: Enemy | null | undefined): { base: number; dim: number; dark: number } {
    const scale = Number(COMBAT_RULES.enemySightScale || 1);
    const base = Math.max(1, Math.round(Number(enemy?.sight || 1) * scale));
    const dim = Math.max(1, base - Number(LIGHT_RULES.dimSightPenalty || 1));
    const dark = Math.max(1, base - Number(LIGHT_RULES.darkSightPenalty || 3));
    return { base, dim, dark };
  },

  _updateEnemySightDebugLabels(this: GameScene, enabled: boolean): void {
    for (const e of this.enemies as Enemy[]) {
      if (!e || !e.lbl || !e.lbl.active) continue;
      const baseName = (e.displayName || e.type || '').toUpperCase();
      try {
        if (enabled) {
          const base = Number(e.sight || 0);
          const eff = this.effectiveEnemySight(e);
          e.lbl.setText(`${baseName} S:${base} E:${eff}`);
        } else {
          e.lbl.setText(baseName);
        }
      } catch {
        /* destroyed mid-frame */
      }
    }
  },

  canEnemySeeTile(
    this: GameScene,
    enemy: Enemy,
    tx: number,
    ty: number,
    opts: { checkFOV?: boolean; useEffectiveSight?: boolean } = {},
  ): boolean {
    if (!enemy || !enemy.alive) return false;
    const { checkFOV = true, useEffectiveSight = true } = opts;
    const dist = Math.sqrt((enemy.tx - tx) ** 2 + (enemy.ty - ty) ** 2);
    const sightRange = useEffectiveSight ? this.effectiveEnemySight(enemy) : enemy.sight;
    if (dist > sightRange) return false;
    if (checkFOV && !inFOV(enemy, tx, ty)) return false;
    return hasLOS(enemy.tx, enemy.ty, tx, ty);
  },

  canEnemySeePlayer(this: GameScene, enemy: Enemy): boolean {
    return this.canEnemySeeTile(enemy, this.playerTile.x, this.playerTile.y);
  },

  drawSightOverlays(this: GameScene): void {
    this.clearSightOverlays();
    const inExplore = this.isExploreMode();
    const inCombat = this.mode === MODE.COMBAT;
    if ((!inExplore && !inCombat) || !this.enemySightEnabled) {
      this.syncEnemySightRings(false);
      this._updateEnemySightDebugLabels(false);
      return;
    }
    this._updateEnemySightDebugLabels(true);
    this.syncEnemySightRings(true, inCombat);
    const ROWS = mapState.rows;
    const COLS = mapState.cols;
    for (const e of this.enemies as Enemy[]) {
      if (!e.alive) continue;
      const g = this.add.graphics().setDepth(2);
      const { base, dim, dark } = this._sightRangesByLight(e);

      const underlayAlpha = inCombat ? 0.03 : 0.04;
      g.fillStyle(0x6ec1ff, underlayAlpha);
      for (let dy = -base; dy <= base; dy++) {
        for (let dx = -base; dx <= base; dx++) {
          const tx = e.tx + dx;
          const ty = e.ty + dy;
          if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
          if (this.isWallTile(tx, ty)) continue;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > base + 0.5) continue;
          g.fillRect(tx * S, ty * S, S, S);
        }
      }

      for (let dy = -base; dy <= base; dy++) {
        for (let dx = -base; dx <= base; dx++) {
          const tx = e.tx + dx;
          const ty = e.ty + dy;
          if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
          if (this.isWallTile(tx, ty)) continue;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > base + 0.5) continue;
          if (!inFOV(e, tx, ty)) continue;
          if (!hasLOS(e.tx, e.ty, tx, ty)) continue;
          const combatScale = inCombat ? 0.85 : 1;
          if (dist <= dark + 0.5) g.fillStyle(0xff5a5a, 0.14 * combatScale);
          else if (dist <= dim + 0.5) g.fillStyle(0xffc857, 0.11 * combatScale);
          else g.fillStyle(0x7fd1a0, 0.09 * combatScale);
          g.fillRect(tx * S, ty * S, S, S);
        }
      }

      if (this.canEnemySeePlayer(e)) {
        g.lineStyle(2, 0xfff176, 0.85);
        g.lineBetween(e.tx * S + S / 2, e.ty * S + S / 2, this.playerTile.x * S + S / 2, this.playerTile.y * S + S / 2);
      }

      (this.sightTiles as Phaser.GameObjects.Graphics[]).push(g);
    }
  },

  clearSightOverlays(this: GameScene): void {
    for (const t of this.sightTiles as unknown as Phaser.GameObjects.Graphics[]) {
      try {
        if (t && t.active) t.destroy();
      } catch {
        /* already gone */
      }
    }
    this.sightTiles = [];
    this.syncEnemySightRings(false);
    this._updateEnemySightDebugLabels(false);
  },

  checkSight(this: GameScene): void {
    if (!this.isExploreMode()) return;
    const seenBy = (this.enemies as Enemy[]).filter((e) => {
      if (!e.alive || e.inCombat) return false;
      return this.canEnemySeePlayer(e);
    });
    if (!seenBy.length) return;

    if (this.playerHidden) {
      const { broken, spotters } = this.checkStealthVsEnemies(seenBy);
      if (!broken) return;
      const combatants = spotters.map((s) => s.enemy);
      this.enterCombat(combatants);
      return;
    }

    this.enterCombat(seenBy);
  },

  toggleEnemySight(this: GameScene): boolean {
    this.enemySightEnabled = !this.enemySightEnabled;
    if (this.enemySightEnabled) {
      this.drawSightOverlays();
    } else {
      this.clearSightOverlays();
      this.syncEnemySightRings(false);
    }
    this.showStatus(
      this.enemySightEnabled
        ? 'Sight ON: blue=base range, red=dark detect, amber=dim detect, green=bright-only, yellow line=currently spotted.'
        : 'Enemy sight OFF.',
    );
    return this.enemySightEnabled;
  },

  syncEnemySightRings(this: GameScene, show: boolean, includeCombat = false): void {
    for (const e of this.enemies as Enemy[]) {
      if (!e.sightRing || !e.sightRing.active) continue;
      if (!e.alive || (!includeCombat && e.inCombat)) {
        try {
          e.sightRing.setAlpha(0);
        } catch {
          /* noop */
        }
        continue;
      }
      try {
        const r = this.effectiveEnemySight(e);
        if (typeof e.sightRing.setRadius === 'function') e.sightRing.setRadius(r * S);
        e.sightRing.setAlpha(show ? 0.3 : 0);
      } catch {
        /* destroyed */
      }
    }
  },

  effectiveEnemySight(this: GameScene, enemy: Enemy): number {
    const scale = Number(COMBAT_RULES.enemySightScale || 1);
    let s = Math.max(1, Math.round(enemy.sight * scale));
    const playerLight = this.tileLightLevel(this.playerTile.x, this.playerTile.y);
    const enemyLight = this.tileLightLevel(enemy.tx, enemy.ty);
    const light = Math.max(playerLight, enemyLight);
    if (light === 0) s -= Number(LIGHT_RULES.darkSightPenalty || 3);
    else if (light === 1) s -= Number(LIGHT_RULES.dimSightPenalty || 1);
    if (this.playerHidden) s -= Number(LIGHT_RULES.hiddenSightPenalty || 2);
    return Math.max(1, s);
  },

  clearDetectMarkers(this: GameScene): void {
    this.detectMarkers.forEach((m) => {
      if (m && (m as { destroy?: () => void }).destroy) (m as { destroy: () => void }).destroy();
    });
    this.detectMarkers = [];
  },

  showDetectedEnemyMarker(this: GameScene, enemy: Enemy): void {
    if (!enemy || !enemy.alive) return;
    const ew = this.enemyWorldPos(enemy as Enemy & { img: Phaser.GameObjects.Sprite });
    const x = ew.x;
    const y = ew.y;

    const ring = this.add.circle(x, y, S * 0.3, 0xf1c40f, 0.15).setDepth(18).setStrokeStyle(3, 0xf1c40f, 1);
    const ping = this.add.text(x, y - S * 0.5, '⚠', {
      fontSize: '22px',
      color: '#f1c40f',
      stroke: '#000',
      strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(19);
    this.detectMarkers.push(ring, ping);

    this.tweens.add({
      targets: ring,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 300,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.tweens.add({
          targets: ring,
          alpha: 0,
          scaleX: 2.2,
          scaleY: 2.2,
          duration: 800,
          onComplete: () => {
            if (ring && ring.destroy) ring.destroy();
          },
        });
      },
    });
    this.tweens.add({ targets: ping, y: y - S * 0.7, duration: 400, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: ping,
      alpha: 0,
      delay: 1800,
      duration: 600,
      onComplete: () => {
        if (ping && ping.destroy) ping.destroy();
      },
    });

    if (enemy.img) {
      const prevDepth = enemy.img.depth;
      const prevAlpha = enemy.img.alpha;
      enemy.img.setDepth(17).setAlpha(0.9);
      this.tweens.add({
        targets: enemy.img,
        alpha: 0.5,
        duration: 300,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          if (enemy.img && enemy.img.active) {
            enemy.img.setDepth(prevDepth).setAlpha(prevAlpha);
          }
        },
      });
    }
  },

  showStealthVisuals(this: GameScene): void {
    this.player.setAlpha(0.4);
    if (this._shadowPlayer) this._shadowPlayer.destroy();
    const shx = this.playerTile.x * S + S / 2;
    const shy = this.playerTile.y * S + S / 2;
    this._shadowPlayer = this.add.sprite(shx, shy, 'player_atlas', 'idle_0');
    this._shadowPlayer.setAlpha(0.2);
    this._shadowPlayer.setTint(0x6666ff);
    this._shadowPlayer.setDepth(100);
  },

  clearStealthVisuals(this: GameScene): void {
    this.player.setAlpha(1);
    if (this._shadowPlayer) {
      this._shadowPlayer.destroy();
      this._shadowPlayer = null;
    }
  },
};

declare module '@/game' {
  interface GameScene {
    _sightRangesByLight(enemy: Enemy | null | undefined): { base: number; dim: number; dark: number };
    _updateEnemySightDebugLabels(enabled: boolean): void;
    canEnemySeeTile(enemy: Enemy, tx: number, ty: number, opts?: { checkFOV?: boolean; useEffectiveSight?: boolean }): boolean;
    canEnemySeePlayer(enemy: Enemy): boolean;
    drawSightOverlays(): void;
    clearSightOverlays(): void;
    checkSight(): void;
    toggleEnemySight(): boolean;
    syncEnemySightRings(show: boolean, includeCombat?: boolean): void;
    effectiveEnemySight(enemy: Enemy): number;
    clearDetectMarkers(): void;
    showDetectedEnemyMarker(enemy: Enemy): void;
    showStealthVisuals(): void;
    clearStealthVisuals(): void;
    isWallTile(x: number, y: number): boolean;
    checkStealthVsEnemies(seenBy: Enemy[]): { broken: boolean; spotters: Array<{ enemy: Enemy }> };
    enterCombat(enemies: Enemy[]): void;
    _shadowPlayer: Phaser.GameObjects.Sprite | null;
  }
}
