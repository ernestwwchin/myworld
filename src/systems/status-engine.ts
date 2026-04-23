import type { Actor } from '@/types/actors';

export interface StatusInstance {
  id: string;
  def: StatusDef;
  remaining: number;
  stacks: number;
  source: Actor | null;
}

export interface StatusDef {
  id: string;
  duration?: number;
  onReapply?: 'overwrite' | 'stack' | 'independent';
  stackId?: string;
  stackPriority?: number;
  maxStacks?: number;
  boosts?: string;
  onApply?: string;
  onRemove?: string;
  onTick?: string;
  skipTurn?: boolean;
  saveToRemove?: { stat: string; dc: number };
  [key: string]: unknown;
}

export interface StatusEffectsAdapter {
  getStatuses(actor: Actor): StatusInstance[];
  setStatuses(actor: Actor, statuses: StatusInstance[]): void;
}

export type ApplyResult =
  | { action: 'added'; instance: StatusInstance }
  | { action: 'overwritten'; instance: StatusInstance; replaced: StatusInstance }
  | { action: 'stacked'; instance: StatusInstance; newStacks: number }
  | { action: 'blocked'; reason: string }
  | { action: 'replaced_by_priority'; instance: StatusInstance; removed: StatusInstance[] };

export class StatusEngine {
  private _adapter: StatusEffectsAdapter;

  constructor(adapter: StatusEffectsAdapter) {
    this._adapter = adapter;
  }

  applyStatus(
    actor: Actor,
    def: StatusDef,
    source: Actor | null = null,
    durationOverride?: number,
  ): ApplyResult {
    const statuses = this._adapter.getStatuses(actor);
    const duration = durationOverride ?? def.duration ?? 1;
    const onReapply = def.onReapply ?? 'overwrite';

    if (def.stackId) {
      const existing = statuses.filter(s => s.def.stackId === def.stackId);
      if (existing.length > 0) {
        const existingPriority = existing[0].def.stackPriority ?? 0;
        const newPriority = def.stackPriority ?? 0;

        if (newPriority > existingPriority) {
          const removed = [...existing];
          const filtered = statuses.filter(s => s.def.stackId !== def.stackId);
          const instance: StatusInstance = { id: def.id, def, remaining: duration, stacks: 1, source };
          filtered.push(instance);
          this._adapter.setStatuses(actor, filtered);
          return { action: 'replaced_by_priority', instance, removed };
        }

        if (newPriority < existingPriority) {
          return { action: 'blocked', reason: 'lower_priority' };
        }

        const sameId = existing.find(s => s.id === def.id);
        if (sameId) {
          return this._handleReapply(actor, statuses, sameId, def, source, duration, onReapply);
        }

        const removed = [...existing];
        const filtered = statuses.filter(s => s.def.stackId !== def.stackId);
        const instance: StatusInstance = { id: def.id, def, remaining: duration, stacks: 1, source };
        filtered.push(instance);
        this._adapter.setStatuses(actor, filtered);
        return { action: 'replaced_by_priority', instance, removed };
      }
    }

    const sameId = statuses.find(s => s.id === def.id);
    if (sameId) {
      return this._handleReapply(actor, statuses, sameId, def, source, duration, onReapply);
    }

    const instance: StatusInstance = { id: def.id, def, remaining: duration, stacks: 1, source };
    statuses.push(instance);
    this._adapter.setStatuses(actor, statuses);
    return { action: 'added', instance };
  }

  removeStatus(actor: Actor, statusId: string): StatusInstance | null {
    const statuses = this._adapter.getStatuses(actor);
    const idx = statuses.findIndex(s => s.id === statusId);
    if (idx < 0) return null;
    const removed = statuses.splice(idx, 1)[0];
    this._adapter.setStatuses(actor, statuses);
    return removed;
  }

  removeStatusBySource(actor: Actor, source: Actor): StatusInstance[] {
    const statuses = this._adapter.getStatuses(actor);
    const removed: StatusInstance[] = [];
    const remaining: StatusInstance[] = [];
    for (const s of statuses) {
      if (s.source === source) {
        removed.push(s);
      } else {
        remaining.push(s);
      }
    }
    if (removed.length) {
      this._adapter.setStatuses(actor, remaining);
    }
    return removed;
  }

  removeAll(actor: Actor): StatusInstance[] {
    const statuses = this._adapter.getStatuses(actor);
    const removed = [...statuses];
    this._adapter.setStatuses(actor, []);
    return removed;
  }

  getStatuses(actor: Actor): StatusInstance[] {
    return this._adapter.getStatuses(actor);
  }

  hasStatus(actor: Actor, statusId: string): boolean {
    return this._adapter.getStatuses(actor).some(s => s.id === statusId);
  }

  getStacks(actor: Actor, statusId: string): number {
    const s = this._adapter.getStatuses(actor).find(s => s.id === statusId);
    return s?.stacks ?? 0;
  }

  tickStatuses(actor: Actor): { expired: StatusInstance[]; ticked: StatusInstance[] } {
    const statuses = this._adapter.getStatuses(actor);
    const expired: StatusInstance[] = [];
    const ticked: StatusInstance[] = [];

    for (let i = statuses.length - 1; i >= 0; i--) {
      const s = statuses[i];
      if (s.remaining < 0) {
        ticked.push(s);
        continue;
      }
      s.remaining -= 1;
      ticked.push(s);
      if (s.remaining <= 0) {
        expired.push(statuses.splice(i, 1)[0]);
      }
    }

    this._adapter.setStatuses(actor, statuses);
    return { expired, ticked };
  }

  private _handleReapply(
    actor: Actor,
    statuses: StatusInstance[],
    existing: StatusInstance,
    def: StatusDef,
    source: Actor | null,
    duration: number,
    onReapply: string,
  ): ApplyResult {
    switch (onReapply) {
      case 'stack': {
        const max = def.maxStacks ?? Infinity;
        if (existing.stacks < max) {
          existing.stacks += 1;
        }
        existing.remaining = Math.max(existing.remaining, duration);
        existing.source = source;
        this._adapter.setStatuses(actor, statuses);
        return { action: 'stacked', instance: existing, newStacks: existing.stacks };
      }
      case 'independent': {
        const instance: StatusInstance = { id: def.id, def, remaining: duration, stacks: 1, source };
        statuses.push(instance);
        this._adapter.setStatuses(actor, statuses);
        return { action: 'added', instance };
      }
      default: {
        const replaced = { ...existing };
        existing.remaining = duration;
        existing.stacks = 1;
        existing.source = source;
        this._adapter.setStatuses(actor, statuses);
        return { action: 'overwritten', instance: existing, replaced };
      }
    }
  }
}
