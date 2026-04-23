import { STATUS_RULES, STATUS_DEFS, dnd } from '@/config';
import { StatusEngine } from './status-engine';
import type { StatusDef, StatusInstance } from './status-engine';
import { recalcBoosts } from './boost-runner';
import type { BoostSceneAdapter } from './boost-runner';
import type { GameScene } from '@/game';
import type { Actor, StatusEffect } from '@/types/actors';

interface ProcessResult {
  skipTurn: boolean;
  acted: boolean;
}

let _statusEngine: StatusEngine | null = null;

function getStatusEngine(scene: GameScene): StatusEngine {
  if (_statusEngine) return _statusEngine;
  _statusEngine = new StatusEngine({
    getStatuses(actor: Actor): StatusInstance[] {
      const fx = actor === 'player'
        ? scene.playerEffects as unknown as StatusInstance[]
        : ((actor as Record<string, unknown>).statusInstances || []) as StatusInstance[];
      return fx;
    },
    setStatuses(actor: Actor, statuses: StatusInstance[]): void {
      if (actor === 'player') {
        (scene as unknown as { playerEffects: unknown }).playerEffects = statuses;
      } else {
        (actor as Record<string, unknown>).statusInstances = statuses;
      }
    },
  });
  return _statusEngine;
}

function getBoostAdapter(scene: GameScene): BoostSceneAdapter {
  return {
    actorEffects(actor: Actor): StatusEffect[] {
      return scene.actorEffects(actor);
    },
    getActorHP(actor: Actor): number {
      if (actor === 'player') return scene.playerHP;
      return (actor as { hp?: number }).hp ?? 0;
    },
    getActorMaxHP(actor: Actor): number {
      if (actor === 'player') return scene.playerMaxHP;
      return (actor as { maxHp?: number }).maxHp ?? 1;
    },
  };
}

export const StatusEffectSystemMixin = {
  actorEffects(this: GameScene, actor: Actor): StatusEffect[] {
    if (actor === 'player') return this.playerEffects as StatusEffect[];
    if (!actor.effects) actor.effects = [];
    return actor.effects;
  },

  getStatusEngine(this: GameScene): StatusEngine {
    return getStatusEngine(this);
  },

  applyStatusToActor(this: GameScene, actor: Actor, statusId: string, duration?: number, source?: Actor | null): void {
    const def: StatusDef = {
      id: statusId,
      duration,
      ...((STATUS_DEFS as Record<string, Record<string, unknown>>)?.[statusId] || {}),
    };
    const engine = getStatusEngine(this);
    engine.applyStatus(actor, def, source ?? null, duration);
    recalcBoosts(actor, getBoostAdapter(this));
    this.showStatus(`${this.actorLabel(actor)} is now ${statusId}.`);
  },

  removeStatusFromActor(this: GameScene, actor: Actor, statusId: string): void {
    const engine = getStatusEngine(this);
    const removed = engine.removeStatus(actor, statusId);
    if (removed) {
      recalcBoosts(actor, getBoostAdapter(this));
      this.showStatus(`${this.actorLabel(actor)} is no longer ${statusId}.`);
    }
  },

  removeStatusesBySource(this: GameScene, actor: Actor, source: Actor): void {
    const engine = getStatusEngine(this);
    const removed = engine.removeStatusBySource(actor, source);
    if (removed.length) {
      recalcBoosts(actor, getBoostAdapter(this));
    }
  },

  resetStatusEngine(this: GameScene): void {
    _statusEngine = null;
  },

  removeEffect(this: GameScene, actor: Actor, index: number): StatusEffect | null {
    const fx = this.actorEffects(actor);
    if (index < 0 || index >= fx.length) return null;
    return fx.splice(index, 1)[0] || null;
  },

  processStatusEffectsForActor(
    this: GameScene,
    actor: Actor,
    trigger: string,
    ctx: { deltaMs?: number } = {},
  ): ProcessResult {
    const fx = this.actorEffects(actor);
    if (!fx || !fx.length) return { skipTurn: false, acted: false };
    const t = String(trigger || '').toLowerCase();
    const out: ProcessResult = { skipTurn: false, acted: false };
    const tickMs = Math.max(200, Number(STATUS_RULES?.exploreTickMs || 1000));

    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i];
      const trg = String(e.trigger || 'turn_start').toLowerCase();
      if (trg !== t && trg !== 'any') continue;

      if (t === 'time_tick') {
        const gate = Math.max(200, Number(e.tickMs || tickMs));
        e.elapsedMs = (Number(e.elapsedMs) || 0) + Number(ctx.deltaMs || tickMs);
        if ((e.elapsedMs as number) < gate) continue;
        e.elapsedMs = 0;
      }

      const id = String(e.id || e.type || 'effect').toLowerCase();
      const base = (STATUS_DEFS && (STATUS_DEFS as Record<string, { onTrigger?: StatusEffect['onTrigger'] }>)[id]) || {};
      const onTrigger = { ...(base.onTrigger || {}), ...(e.onTrigger || {}) };

      if (onTrigger.damageDice || e.damageDice) {
        const spec = e.damageDice || onTrigger.damageDice || (STATUS_RULES as { defaultPoisonDamageDice?: [number, number, number] })?.defaultPoisonDamageDice || [1, 4, 0];
        const dr = dnd.rollDamageSpec(spec, false);
        const col = onTrigger.damageColor
          ? '#' + Number(onTrigger.damageColor).toString(16).padStart(6, '0')
          : '#8bc34a';
        this.applyDamageToActor(actor, dr.total, col, `${this.actorLabel(actor)} takes ${id} damage.`);
        this.showStatus(`${this.actorLabel(actor)} suffers ${id} (${this.formatDamageBreakdown(dr)}).`);
        out.acted = true;
      }

      const saveCfg = onTrigger.removeOnSave || e.removeOnSave;
      if (saveCfg && t === 'turn_start') {
        const stat = String(saveCfg.stat || e.wakeStat || 'wis').toLowerCase();
        const mod = actor === 'player'
          ? dnd.mod((this.pStats as unknown as Record<string, number>)[stat] || 10)
          : dnd.mod((actor.stats && actor.stats[stat]) || 10);
        const dc = Number(saveCfg.dc || e.wakeDc || (STATUS_RULES as { sleepWakeDc?: number })?.sleepWakeDc || 12);
        const roll = dnd.roll(1, 20) + mod;
        if (roll >= dc) {
          this.removeEffect(actor, i);
          this.showStatus(`${this.actorLabel(actor)} is no longer ${id}.`);
          continue;
        }
      }

      if (onTrigger.skipTurn === true && t === 'turn_start') {
        out.skipTurn = true;
        out.acted = true;
        this.showStatus(`${this.actorLabel(actor)} is affected by ${id} and skips the turn.`);
      }

      if (Number.isFinite(e.duration)) {
        e.duration = Math.max(0, Number(e.duration) - 1);
        if ((e.duration as number) <= 0) {
          this.removeEffect(actor, i);
          this.showStatus(`${this.actorLabel(actor)} is no longer ${id}.`);
        }
      }
    }
    return out;
  },

  endEnemyTurn(this: GameScene, enemy: Actor): void {
    if (enemy && enemy !== 'player' && enemy.alive) {
      this.processStatusEffectsForActor(enemy, 'turn_end');
    }
    this.advanceEnemyTurn();
  },

  startExploreStatusTicker(this: GameScene): void {
    const tickMs = Math.max(250, Number(STATUS_RULES?.exploreTickMs || 1000));
    this.time.addEvent({
      delay: tickMs,
      loop: true,
      callback: () => {
        if (!this.isExploreMode()) return;
        this.processStatusEffectsForActor('player', 'time_tick', { deltaMs: tickMs });
        for (const e of this.enemies) {
          if (!e.alive || e.inCombat) continue;
          this.processStatusEffectsForActor(e, 'time_tick', { deltaMs: tickMs });
        }
      },
    });
  },
};

declare module '@/game' {
  interface GameScene {
    actorEffects(actor: Actor): StatusEffect[];
    removeEffect(actor: Actor, index: number): StatusEffect | null;
    processStatusEffectsForActor(actor: Actor, trigger: string, ctx?: { deltaMs?: number }): ProcessResult;
    endEnemyTurn(enemy: Actor): void;
    startExploreStatusTicker(): void;
    advanceEnemyTurn(): void;
    actorLabel(actor: Actor): string;
    formatDamageBreakdown(dr: { total: number; bonus?: number; isCrit?: boolean; baseRolls: Array<{ kind: string; value: number }>; critRolls: Array<{ kind: string; value: number }> }): string;
    normalizeEffects(effects: StatusEffect[]): StatusEffect[];
    getStatusEngine(): StatusEngine;
    applyStatusToActor(actor: Actor, statusId: string, duration?: number, source?: Actor | null): void;
    removeStatusFromActor(actor: Actor, statusId: string): void;
    removeStatusesBySource(actor: Actor, source: Actor): void;
    resetStatusEngine(): void;
  }
}
