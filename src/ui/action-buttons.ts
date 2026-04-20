import { ABILITY_DEFS } from '@/config';
import type { GameScene } from '@/game';

export const ActionButtonsMixin = {
  getAvailablePlayerAbilities(this: GameScene): string[] {
    const cls = String((this.pStats as Record<string, unknown>)?.class || '').toLowerCase();
    const lvl = Number((this.pStats as Record<string, unknown>)?.level || 1);
    return Object.entries(ABILITY_DEFS)
      .filter(([, def]) => {
        if (!def) return false;
        const reqClass = def.requiresClass ? String(def.requiresClass).toLowerCase() : '';
        const reqLevel = Number((def as Record<string, unknown>).requiresLevel || 1);
        if (reqClass && reqClass !== cls) return false;
        if (lvl < reqLevel) return false;
        return true;
      })
      .map(([id]) => id);
  },

  getActionButtonMap(this: GameScene): Record<string, string> {
    return {
      attack: 'btn-atk',
      dash: 'btn-dash',
      hide: 'btn-hide',
      flee: 'btn-flee',
      sleep_cloud: 'btn-sleep',
    };
  },

  actionButtonIds(this: GameScene): string[] {
    return Object.values(this.getActionButtonMap());
  },

  initActionButtons(this: GameScene): void {
    const map = this.getActionButtonMap();
    const abilities = new Set(this.getAvailablePlayerAbilities());
    for (const [abilityId, btnId] of Object.entries(map)) {
      const btn = document.getElementById(btnId);
      if (!btn) continue;
      const visible = abilities.has(abilityId);
      btn.style.display = visible ? '' : 'none';
      if (!visible) {
        btn.onclick = null;
        continue;
      }
      btn.onclick = () => this.selectAction(abilityId);
    }
  },

  setActionButtonsUsed(this: GameScene, used = true): void {
    this.actionButtonIds().forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.style.display === 'none') return;
      if (used) {
        el.classList.add('used');
        el.style.opacity = '0.35';
        el.style.pointerEvents = 'none';
      } else {
        el.classList.remove('used');
        el.style.opacity = '';
        el.style.pointerEvents = 'auto';
      }
    });
  },

  resetActionButtons(this: GameScene): void {
    this.actionButtonIds().forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('selected', 'used');
      if (el.style.display !== 'none') {
        el.style.opacity = '';
        el.style.pointerEvents = 'auto';
      }
    });
    const resetBtn = document.getElementById('btn-rmove');
    if (resetBtn) {
      resetBtn.classList.remove('selected', 'used');
      resetBtn.style.opacity = '';
      resetBtn.style.pointerEvents = 'auto';
    }
  },

  setSelectedActionButton(this: GameScene, actionId: string): void {
    this.actionButtonIds().forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('selected');
    });
    const btnId = this.getActionButtonMap()[actionId] || '';
    const el = btnId ? document.getElementById(btnId) : null;
    if (el && el.style.display !== 'none') el.classList.add('selected');
  },
};

declare module '@/game' {
  interface GameScene {
    getAvailablePlayerAbilities(): string[];
    getActionButtonMap(): Record<string, string>;
    actionButtonIds(): string[];
    initActionButtons(): void;
    setActionButtonsUsed(used?: boolean): void;
    resetActionButtons(): void;
    setSelectedActionButton(actionId: string): void;
  }
}
