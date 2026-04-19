import { S } from '@/config';
import { playHitAnim } from '@/sprites';
import type { GameScene } from '@/game';
import type { Actor, Enemy } from '@/types/actors';

export const DamageSystemMixin = {
  applyDamageToActor(
    this: GameScene,
    actor: Actor,
    dmg: number,
    color = '#e74c3c',
    label = '',
  ): void {
    const n = Math.max(1, Math.floor(Number(dmg) || 0));
    if (actor === 'player') {
      this.playerHP = Math.max(0, this.playerHP - n);
      this.spawnFloat(this.player.x, this.player.y - 12, `-${n}`, color);
      if (this.player) playHitAnim(this, this.player, 'player');
      this.updateHUD();
      if (this.playerHP <= 0) {
        this.showStatus(label || 'You have been defeated...');
        if (typeof this.handlePlayerDefeat === 'function') this.handlePlayerDefeat();
      }
      return;
    }
    if (!actor || !actor.alive) return;
    actor.hp = Math.max(0, actor.hp - n);
    const aw = this.enemyWorldPos(actor as Enemy & { img: Phaser.GameObjects.Sprite });
    this.spawnFloat(aw.x, aw.y - S / 2 - 10, `-${n}`, color);
    if (actor.hp > 0 && actor.img) playHitAnim(this, actor.img, actor.type || '');
    const ratio = Math.max(0, actor.hp / Math.max(1, actor.maxHp || actor.hp || 1));
    if (actor.hpFg) {
      actor.hpFg.setDisplaySize((S - 8) * ratio, 5);
      if (ratio < 0.4) actor.hpFg.setFillStyle(0xe67e22);
      if (ratio < 0.15) actor.hpFg.setFillStyle(0xe74c3c);
    }
    if (actor.hp <= 0) {
      actor.alive = false;
      actor.inCombat = false;
      const targets = [actor.img, actor.hpBg, actor.hpFg, actor.lbl, actor.sightRing].filter(Boolean);
      this.tweens.add({
        targets,
        alpha: 0,
        duration: 420,
        onComplete: () => {
          [actor.img, actor.hpBg, actor.hpFg, actor.lbl, actor.sightRing, actor.fa].forEach((o) => {
            if (o && typeof (o as { destroy?: () => void }).destroy === 'function') {
              (o as { destroy: () => void }).destroy();
            }
          });
        },
      });
      if (actor.fa) this.tweens.add({ targets: actor.fa, alpha: 0, duration: 240 });
      this.showStatus(label || `${actor.type} collapses.`);
    }
  },

  applyHealToActor(
    this: GameScene,
    actor: Actor,
    amount: number,
    color = '#2ecc71',
    label = '',
  ): void {
    const n = Math.max(1, Math.floor(Number(amount) || 0));
    if (actor === 'player') {
      const prev = this.playerHP;
      this.playerHP = Math.min(this.playerMaxHP, this.playerHP + n);
      const healed = this.playerHP - prev;
      if (healed > 0) this.spawnFloat(this.player.x, this.player.y - 12, `+${healed}`, color);
      this.updateHUD();
      if (label) this.showStatus(label);
      return;
    }
    if (!actor || !actor.alive) return;
    const max = Math.max(1, actor.maxHp || actor.hp || 1);
    const prev = actor.hp;
    actor.hp = Math.min(max, actor.hp + n);
    const healed = actor.hp - prev;
    if (healed > 0) {
      const aw = this.enemyWorldPos(actor as Enemy & { img: Phaser.GameObjects.Sprite });
      this.spawnFloat(aw.x, aw.y - S / 2 - 10, `+${healed}`, color);
    }
    const ratio = Math.max(0, actor.hp / max);
    if (actor.hpFg) {
      actor.hpFg.setDisplaySize((S - 8) * ratio, 5);
      if (ratio >= 0.4) actor.hpFg.setFillStyle(0x2ecc71);
      else if (ratio >= 0.15) actor.hpFg.setFillStyle(0xe67e22);
      else actor.hpFg.setFillStyle(0xe74c3c);
    }
  },
};

declare module '@/game' {
  interface GameScene {
    applyDamageToActor(actor: Actor, dmg: number, color?: string, label?: string): void;
    applyHealToActor(actor: Actor, amount: number, color?: string, label?: string): void;
    spawnFloat(x: number, y: number, text: string, color: string): void;
    updateHUD(): void;
    showStatus(text: string): void;
    handlePlayerDefeat?(): void;
  }
}
