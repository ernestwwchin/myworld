import { S, ITEM_DEFS, WEAPON_DEFS, STATUS_DEFS, dnd, type InventoryItem } from '@/config';
import { withHotbar, withSidePanel, withCombatLog } from '@/helpers';
import type { GameScene } from '@/game';
import type { Enemy } from '@/types/actors';

interface ResolvedLoot {
  gold: number;
  items: InventoryItem[];
}

export const InventorySystemMixin = {
  _getItemMaxStack(this: GameScene, item: InventoryItem | null | undefined): number {
    if (!item) return 1;
    const def = item.id ? ITEM_DEFS[item.id] : null;
    const explicit = Number(item.maxStack ?? def?.maxStack);
    if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);

    if (item.type === 'weapon' || item.type === 'armor') return 1;
    if (item.type === 'consumable') return 20;
    if (item.type === 'gem') return 50;
    if (item.type === 'misc') return 99;
    return 1;
  },

  _isStackableItem(this: GameScene, item: InventoryItem | null | undefined): boolean {
    if (!item) return false;
    if (typeof item.stackable === 'boolean') return item.stackable;
    return this._getItemMaxStack(item) > 1;
  },

  addItemToInventory(
    this: GameScene,
    item: InventoryItem,
    qty = 1,
  ): InventoryItem | null {
    if (!item) return null;
    if (!Array.isArray(this.pStats.inventory)) this.pStats.inventory = [];
    const inv = this.pStats.inventory as InventoryItem[];
    const addQty = Math.max(1, Math.floor(Number(qty || item.qty || 1)));
    const isStackable = this._isStackableItem(item);
    const maxStack = this._getItemMaxStack(item);
    let firstResult: InventoryItem | null = null;

    if (!isStackable || maxStack <= 1) {
      for (let i = 0; i < addQty; i++) {
        const entry: InventoryItem = { ...item };
        delete entry.qty;
        inv.push(entry);
        if (!firstResult) firstResult = entry;
      }
      return firstResult;
    }

    let remaining = addQty;

    for (const existing of inv) {
      if (!existing || existing.id !== item.id || !this._isStackableItem(existing)) continue;
      const current = Math.max(1, Math.floor(Number(existing.qty || 1)));
      const room = maxStack - current;
      if (room <= 0) continue;
      const move = Math.min(room, remaining);
      existing.qty = current + move;
      remaining -= move;
      if (!firstResult) firstResult = existing;
      if (remaining <= 0) return firstResult;
    }

    while (remaining > 0) {
      const stackQty = Math.min(maxStack, remaining);
      const entry: InventoryItem = { ...item, qty: stackQty, maxStack };
      inv.push(entry);
      remaining -= stackQty;
      if (!firstResult) firstResult = entry;
    }

    return firstResult;
  },

  handleEnemyDefeatLoot(this: GameScene, enemy: Enemy): ResolvedLoot {
    if (!enemy || enemy._lootDropped) return { gold: 0, items: [] };
    enemy._lootDropped = true;

    const meta = (window as unknown as { _MAP_META?: { lootTables?: Record<string, unknown> } })._MAP_META;
    const tables = meta?.lootTables || {};
    const table = enemy.lootTable ? (tables as Record<string, unknown>)[enemy.lootTable as string] : null;
    const fixedGold = Number(enemy.gold || 0);
    const fixedItems = Array.isArray(enemy.loot) ? (enemy.loot as InventoryItem[]) : [];

    const chest = (window as unknown as {
      ChestEntity?: { resolveTableLoot?: (g: number, i: InventoryItem[], t: unknown) => ResolvedLoot };
    }).ChestEntity;
    const resolved: ResolvedLoot = chest?.resolveTableLoot
      ? chest.resolveTableLoot(fixedGold, fixedItems, table)
      : { gold: fixedGold, items: fixedItems.map((i) => ({ ...i })) };

    if (!resolved.gold && (!resolved.items || !resolved.items.length)) return resolved;

    if (typeof this.spawnFloorItem === 'function') {
      this.spawnFloorItem(enemy.tx, enemy.ty, {
        gold: resolved.gold,
        items: resolved.items,
        sourceLabel: enemy.displayName || enemy.type || 'enemy',
      });
      const ew = this.enemyWorldPos(enemy as Enemy & { img: Phaser.GameObjects.Sprite });
      this.spawnFloat(ew.x, ew.y - S / 2 - 20, 'LOOT!', '#f0c060');
      const drops: string[] = [];
      if (resolved.gold > 0) drops.push(`${resolved.gold} gold`);
      for (const item of resolved.items || []) drops.push(item.name || item.id || 'item');
      if (drops.length) {
        const msg = `${enemy.displayName || enemy.type} dropped: ${drops.join(', ')}`;
        withCombatLog((cl) => (cl as { log: (m: string, a: string, s: string) => void }).log(msg, 'loot', 'system'));
      }
    } else {
      const drops: string[] = [];
      if (resolved.gold > 0) {
        this.pStats.gold = (Number(this.pStats.gold) || 0) + resolved.gold;
        drops.push(`+${resolved.gold} gold`);
        const ew = this.enemyWorldPos(enemy as Enemy & { img: Phaser.GameObjects.Sprite });
        this.spawnFloat(ew.x, ew.y - S / 2 - 20, `+${resolved.gold}g`, '#f0c060');
      }
      for (const item of resolved.items || []) {
        this.addItemToInventory(item, Number(item.qty || 1));
        drops.push(`${item.icon ? item.icon + ' ' : ''}${item.name || item.id || 'item'}`);
      }
      if (drops.length) {
        const msg = `Looted ${enemy.displayName || enemy.type}: ${drops.join(', ')}`;
        withCombatLog((cl) => (cl as { log: (m: string, a: string, s: string) => void }).log(msg, 'loot', 'system'));
        this.showStatus(msg);
        withSidePanel((sp) => {
          const sidePanel = sp as { _activeTab?: string; refresh?: () => void };
          if (sidePanel._activeTab === 'inventory') sidePanel.refresh?.();
        });
        withHotbar((hb) => (hb as { refreshItems?: () => void }).refreshItems?.());
        this.updateHUD();
      }
    }
    return resolved;
  },

  useItem(this: GameScene, item: InventoryItem): void {
    if (!item) return;
    const inv = this.pStats.inventory as InventoryItem[];
    if (!Array.isArray(inv)) return;
    const idx = inv.indexOf(item);
    if (idx < 0) return;

    const def = (item.id && ITEM_DEFS[item.id]) || item;
    const onUse = (def as { onUse?: {
      useAbility?: string;
      effects?: Array<Record<string, unknown>>;
      consumeOnUse?: boolean;
    } }).onUse;

    if (onUse?.useAbility) {
      if (typeof this.selectAction === 'function') this.selectAction(onUse.useAbility);
      if (Number(item.qty || 1) > 1) item.qty = Math.max(1, Number(item.qty || 1) - 1);
      else inv.splice(idx, 1);
      withSidePanel((sp) => (sp as { refresh?: () => void }).refresh?.());
      withHotbar((hb) => (hb as { refreshItems?: () => void }).refreshItems?.());
      return;
    }

    const effects: Array<Record<string, unknown>> = onUse?.effects || [];

    if (!effects.length && item.heal) {
      effects.push({ type: 'heal', amount: item.heal });
    }

    if (!effects.length) {
      this.showStatus(`${item.name || item.id} can't be used right now.`);
      return;
    }

    const consumed = onUse?.consumeOnUse !== false;
    let didSomething = false;

    for (const fx of effects) {
      switch (fx.type) {
        case 'heal': {
          const healed = dnd.rollDamageSpec((fx.amount as string) || '1d4', false).total;
          this.playerHP = Math.min(this.playerMaxHP, this.playerHP + healed);
          this.showStatus(`${item.icon || ''} ${item.name || item.id}: restored ${healed} HP!`);
          withCombatLog((cl) =>
            (cl as { log: (m: string, a: string) => void }).log(
              `${item.icon || ''}${item.name || item.id}: +${healed} HP`,
              'player',
            ),
          );
          didSomething = true;
          break;
        }
        case 'removeStatus': {
          const efx = this.playerEffects as Array<{ id?: string; type?: string }>;
          const i = efx.findIndex((e) => (e.id || e.type) === fx.statusId);
          if (i >= 0) {
            efx.splice(i, 1);
            this.showStatus(`${item.name || item.id}: ${fx.statusId} cured!`);
          } else {
            this.showStatus(`${item.name || item.id}: you aren't ${fx.statusId}.`);
          }
          didSomething = true;
          break;
        }
        case 'applyStatus': {
          const base = (STATUS_DEFS[fx.statusId as string] || {}) as {
            duration?: number;
            trigger?: string;
            onTrigger?: Record<string, unknown>;
          };
          (this.playerEffects as Array<Record<string, unknown>>).push({
            id: fx.statusId,
            type: fx.statusId,
            duration: fx.duration ?? base.duration ?? 3,
            trigger: fx.trigger || base.trigger || 'turn_end',
            ...(base.onTrigger ? { onTrigger: base.onTrigger } : {}),
          });
          this.showStatus(`${item.name || item.id}: ${fx.statusId} applied!`);
          didSomething = true;
          break;
        }
        case 'modifyStat': {
          const stat = fx.stat as string;
          if (!stat) break;
          const p = this.pStats as unknown as Record<string, number | unknown>;
          const prev = (Number(p[stat]) || 0) as number;
          p[stat] = prev + Number(fx.bonus || 0);
          if (!(p as { _statMods?: unknown })._statMods) {
            (p as Record<string, unknown>)._statMods = [];
          }
          const turns = (fx.duration as number) ?? 10;
          ((p as { _statMods: Array<{ stat: string; bonus: number; turnsLeft: number }> })._statMods).push({
            stat,
            bonus: Number(fx.bonus || 0),
            turnsLeft: turns,
          });
          this.showStatus(
            `${item.name || item.id}: ${stat.toUpperCase()} ${Number(fx.bonus) >= 0 ? '+' : ''}${fx.bonus} for ${turns} turns.`,
          );
          didSomething = true;
          break;
        }
        case 'log': {
          withCombatLog((cl) => (cl as { log: (m: string, s: string) => void }).log((fx.message as string) || '', 'system'));
          break;
        }
      }
    }

    if (consumed && didSomething) {
      if (Number(item.qty || 1) > 1) item.qty = Math.max(1, Number(item.qty || 1) - 1);
      else inv.splice(idx, 1);
    }

    this.updateHUD();
    withSidePanel((sp) => (sp as { refresh?: () => void }).refresh?.());
    withHotbar((hb) => (hb as { refreshItems?: () => void }).refreshItems?.());
  },

  tickStatMods(this: GameScene): void {
    const p = this.pStats as unknown as { _statMods?: Array<{ stat: string; bonus: number; turnsLeft: number }> } & Record<string, unknown>;
    const mods = p._statMods;
    if (!Array.isArray(mods) || !mods.length) return;
    for (let i = mods.length - 1; i >= 0; i--) {
      const m = mods[i];
      m.turnsLeft--;
      if (m.turnsLeft <= 0) {
        p[m.stat] = (Number(p[m.stat]) || 0) - m.bonus;
        this.showStatus(`${m.stat.toUpperCase()} bonus expired.`);
        mods.splice(i, 1);
      }
    }
  },

  equipItem(this: GameScene, item: InventoryItem): void {
    if (!item) return;
    const inv = this.pStats.inventory as InventoryItem[];
    if (!Array.isArray(inv) || !inv.includes(item)) return;

    if (item.type === 'weapon' && item.weaponId) {
      const old = this.pStats.equippedWeapon;
      if (old) inv.push(old);
      inv.splice(inv.indexOf(item), 1);
      this.pStats.equippedWeapon = item;
      this.pStats.weaponId = item.weaponId as string;
      const weapon = WEAPON_DEFS[item.weaponId as string];
      if (weapon) {
        this.pStats.damageFormula = dnd.damageSpecToString(weapon.damageDice);
        this.pStats.atkRange = weapon.range || 1;
      }
      this.showStatus(`Equipped ${item.name || item.id}.`);
    } else if (item.type === 'armor' && item.acBonus) {
      const old = this.pStats.equippedArmor;
      if (old) inv.push(old);
      inv.splice(inv.indexOf(item), 1);
      this.pStats.equippedArmor = item;
      this.pStats.ac = (Number(this.pStats.baseAC) || 10) + Number(item.acBonus);
      this.showStatus(`Equipped ${item.name || item.id} (+${item.acBonus} AC).`);
    } else {
      this.showStatus(`Can't equip ${item.name || item.id}.`);
    }

    withSidePanel((sp) => (sp as { refresh?: () => void }).refresh?.());
    withHotbar((hb) => (hb as { refreshItems?: () => void }).refreshItems?.());
  },

  dropItem(this: GameScene, item: InventoryItem): void {
    if (!item) return;
    const inv = this.pStats.inventory as InventoryItem[];
    if (!Array.isArray(inv)) return;
    const idx = inv.indexOf(item);
    if (idx < 0) return;
    if (Number(item.qty || 1) > 1) {
      item.qty = Math.max(1, Number(item.qty || 1) - 1);
      this.showStatus(`Dropped 1x ${item.name || item.id}.`);
    } else {
      inv.splice(idx, 1);
      this.showStatus(`Dropped ${item.name || item.id}.`);
    }
    withSidePanel((sp) => (sp as { refresh?: () => void }).refresh?.());
    withHotbar((hb) => (hb as { refreshItems?: () => void }).refreshItems?.());
  },
};

declare module '@/game' {
  interface GameScene {
    _getItemMaxStack(item: InventoryItem | null | undefined): number;
    _isStackableItem(item: InventoryItem | null | undefined): boolean;
    addItemToInventory(item: InventoryItem, qty?: number): InventoryItem | null;
    handleEnemyDefeatLoot(enemy: Enemy): ResolvedLoot;
    useItem(item: InventoryItem): void;
    tickStatMods(): void;
    equipItem(item: InventoryItem): void;
    dropItem(item: InventoryItem): void;
    spawnFloorItem(tx: number, ty: number, loot: { gold: number; items: InventoryItem[]; sourceLabel?: string }): unknown;
    selectAction(action: string): void;
  }
}
