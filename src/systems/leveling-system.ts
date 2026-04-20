import { DND_XP, ASI_LEVELS, dnd } from '@/config';
import type { GameScene } from '@/game';

declare const FIGHTER_FEATURES: Record<number, string[]> | undefined;

export const LevelingSystemMixin = {
  checkLevelUp(this: GameScene): void {
    const p = this.pStats;
    let leveled = false;
    while (p.level < 20 && p.xp >= DND_XP[p.level]) {
      p.level++;
      leveled = true;
      p.profBonus = dnd.profBonus(p.level);
      const hr = Math.floor(Math.random() * p.hitDie) + 1;
      const hg = Math.max(1, hr + dnd.mod(p.con));
      p.maxHP += hg;
      this.playerMaxHP = p.maxHP;
      this.playerHP = this.playerMaxHP;
      const ff = (typeof FIGHTER_FEATURES !== 'undefined' ? FIGHTER_FEATURES : undefined) as
        | Record<number, string[]>
        | undefined;
      if (ff && ff[p.level]) for (const f of ff[p.level]) p.features.push(f);
      if (ASI_LEVELS.has(p.level)) {
        p.asiPending++;
        this.showASIPanel();
      }
      if (p.level === 5 || p.level === 11) {
        this.spawnFloat(this.player.x, this.player.y - 50, 'EXTRA ATTACK!', '#f39c12');
      }
      this.spawnFloat(this.player.x, this.player.y - 30, `LEVEL ${p.level}!`, '#9b59b6');
      this.showStatus(`Level Up! Now level ${p.level}! HP+${hg}`);
    }
    if (leveled) this.updateHUD();
    this.updateStatsPanel();
  },

  showASIPanel(this: GameScene): void {
    const ui = this.ui as { showASIPanel?: () => void } | null;
    if (ui && typeof ui.showASIPanel === 'function') ui.showASIPanel();
  },

  applyASI(this: GameScene, s1: string, s2: string): void {
    const p = this.pStats as unknown as Record<string, number | unknown> & { asiPending: number };
    if (p.asiPending <= 0) return;
    p[s1] = Math.min(20, (Number(p[s1]) || 0) + 1);
    p[s2] = Math.min(20, (Number(p[s2]) || 0) + 1);
    p.asiPending--;
    const norm = dnd.normalizeDamageSpec((p.damageFormula as string) || '1d4');
    norm.bonus = dnd.mod(Number(p.str) || 10);
    (p as Record<string, unknown>).damageFormula = dnd.damageSpecToString(norm);
    const panel = document.getElementById('asi-panel');
    if (panel) panel.style.display = 'none';
    this.spawnFloat(
      this.player.x,
      this.player.y - 40,
      `${s1.toUpperCase()}+1 ${s2.toUpperCase()}+1`,
      '#2ecc71',
    );
    this.updateStatsPanel();
  },
};

declare module '@/game' {
  interface GameScene {
    checkLevelUp(): void;
    showASIPanel(): void;
    applyASI(s1: string, s2: string): void;
    spawnFloat(x: number, y: number, text: string, color: string): void;
    updateHUD(): void;
    updateStatsPanel(): void;
  }
}
