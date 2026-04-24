import type { GameScene } from '@/game';
import type { Enemy } from '@/types/actors';

export interface AuraDef {
  radius: number;
  statusId: string;
  target: 'player' | 'enemies' | 'allies';
  duration?: number;
  friendlyOnly?: boolean;
}

export const AuraSystemMixin = {
  _auraIntervalId: null as ReturnType<typeof setInterval> | null,

  startAuraTicker(this: GameScene): void {
    if (this._auraIntervalId) return;
    this._auraIntervalId = setInterval(() => {
      try { this.tickAuras(); } catch (_e) { /* silent */ }
    }, 1000) as unknown as ReturnType<typeof setInterval>;
  },

  stopAuraTicker(this: GameScene): void {
    if (this._auraIntervalId) {
      clearInterval(this._auraIntervalId as unknown as number);
      this._auraIntervalId = null;
    }
  },

  tickAuras(this: GameScene): void {
    for (const enemy of this.enemies as Enemy[]) {
      if (!enemy.alive) continue;
      const aura = (enemy as unknown as { aura?: AuraDef }).aura;
      if (!aura) continue;
      this._applyAuraFrom(enemy, aura);
    }
  },

  _applyAuraFrom(this: GameScene, source: Enemy, aura: AuraDef): void {
    const sx = source.tx;
    const sy = source.ty;

    if (aura.target === 'player' || aura.target === 'allies') {
      const px = this.playerTile.x;
      const py = this.playerTile.y;
      const dist = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
      if (dist <= aura.radius) {
        if (typeof this.applyStatusToActor === 'function') {
          const effects = this.playerEffects as Array<{ id: string }>;
          const hasIt = effects.some((e) => e.id === aura.statusId);
          if (!hasIt) {
            this.applyStatusToActor('player', aura.statusId, aura.duration ?? 1, source as unknown as import('@/types/actors').Actor);
          }
        }
      } else {
        // remove if player left range and source was the aura bearer
        if (typeof this.removeStatusesBySource === 'function') {
          const effects = this.playerEffects as Array<{ id: string; source?: unknown }>;
          const hasFromSource = effects.some((e) => e.id === aura.statusId && e.source === source);
          if (hasFromSource) {
            this.removeStatusesBySource('player', source as unknown as import('@/types/actors').Actor);
          }
        }
      }
    }
  },
};

declare module '@/game' {
  interface GameScene {
    _auraIntervalId: ReturnType<typeof setInterval> | null;
    startAuraTicker(): void;
    stopAuraTicker(): void;
    tickAuras(): void;
    _applyAuraFrom(source: Enemy, aura: AuraDef): void;
  }
}
