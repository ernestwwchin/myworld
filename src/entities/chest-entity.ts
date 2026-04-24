import { InteractableEntity } from '@/entities/interactable-entity';
import { dnd, PLAYER_STATS } from '@/config';
import type { GameScene } from '@/game';
import type { InventoryItem } from '@/config';
import type { MenuOption } from '@/types/entities';

type ResolvedLoot = { gold: number; items: InventoryItem[] };

type LootTable = {
  gold?: [number, number];
  rolls?: number;
  pool?: Array<{ weight?: number; rolls?: number | number[]; [k: string]: unknown }>;
  allowDuplicates?: boolean;
};

type BehaviorPreset = {
  canOpen(scene: GameScene | null, chest: ChestEntity, actor?: unknown, ctx?: unknown): { ok: boolean; reason?: string };
  onOpen(scene: GameScene | null, chest: ChestEntity, actor?: unknown, ctx?: unknown): void;
};

export class ChestEntity extends InteractableEntity {
  static resolveTableLoot(baseGold = 0, fixedItems: InventoryItem[] = [], table: LootTable | null = null): ResolvedLoot {
    const result: ResolvedLoot = {
      gold: Number(baseGold || 0),
      items: Array.isArray(fixedItems) ? fixedItems.map((i) => ({ ...i })) : [],
    };

    if (!table) return result;

    if (Array.isArray(table.gold) && table.gold.length === 2) {
      const [min, max] = table.gold;
      result.gold += min + Math.floor(Math.random() * (max - min + 1));
    }

    const rolls = Number(table.rolls || 0);
    const pool = Array.isArray(table.pool) ? table.pool : [];
    if (pool.length && rolls > 0) {
      const allowDuplicates = table.allowDuplicates !== false;
      const sourcePool = allowDuplicates ? pool : [...pool];
      const rollCount = allowDuplicates ? rolls : Math.min(rolls, sourcePool.length);
      for (let r = 0; r < rollCount; r++) {
        const totalWeight = sourcePool.reduce((s, e) => s + (Number(e.weight) || 1), 0);
        let roll = Math.random() * totalWeight;
        for (let i = 0; i < sourcePool.length; i++) {
          const entry = sourcePool[i];
          roll -= (Number(entry.weight) || 1);
          if (roll <= 0) {
            let itemRolls: number;
            if (Array.isArray(entry.rolls)) {
              itemRolls = (entry.rolls as number[])[Math.floor(Math.random() * (entry.rolls as number[]).length)];
            } else {
              itemRolls = Number(entry.rolls || 1);
            }
            for (let c = 0; c < itemRolls; c++) {
              result.items.push({ ...entry } as unknown as InventoryItem);
            }
            if (!allowDuplicates) sourcePool.splice(i, 1);
            break;
          }
        }
      }
    }

    return result;
  }

  static behaviorPresets: Record<string, BehaviorPreset> = {
    standard: {
      canOpen: () => ({ ok: true }),
      onOpen: () => {},
    },
    locked: {
      canOpen(_scene, chest) {
        if (chest.locked) return { ok: false, reason: 'Chest is locked.' };
        return { ok: true };
      },
      onOpen: () => {},
    },
    trapped: {
      canOpen: () => ({ ok: true }),
      onOpen(scene, chest) {
        if (chest.trapTriggered) return;
        chest.trapTriggered = true;
        const dmg = chest.trapDamage || 4;
        const s = scene as GameScene & { player?: { x: number; y: number }; playerHP?: number; spawnFloat?: (x: number, y: number, t: string, c: string) => void; updateHUD?: () => void };
        s?.showStatus?.(`Trap! You take ${dmg} damage.`);
        s?.spawnFloat?.(s.player?.x ?? 0, (s.player?.y ?? 0) - 10, `-${dmg}`, '#e74c3c');
        if (s && typeof s.playerHP === 'number') s.playerHP = Math.max(0, s.playerHP - dmg);
        scene?.cameras.main.shake(200, 0.005);
        s?.updateHUD?.();
      },
    },
  };

  override open: boolean;
  locked: boolean;
  keyId: string | null;
  behavior: string;
  trapDamage: number;
  trapTriggered: boolean;
  trapDetected: boolean;
  lockDc: number;
  trapDc: number;
  loot: InventoryItem[];
  gold: number;
  lootTable: string | null;
  looted: boolean;
  _resolvedLoot: ResolvedLoot | null;

  constructor(def: Record<string, unknown> = {}) {
    super({ ...def, kind: 'chest' });
    this.open = !!def.open;
    this.locked = !!def.locked;
    this.keyId = (def.keyId as string) || null;
    this.behavior = String(def.behavior || (this.locked ? 'locked' : 'standard')).toLowerCase();
    this.trapDamage = Number(def.trapDamage || 0);
    this.trapTriggered = false;
    this.trapDetected = false;
    this.lockDc = Number(def.lockDc || 13);
    this.trapDc = Number(def.trapDc || 0);
    this.loot = Array.isArray(def.loot) ? [...(def.loot as InventoryItem[])] : [];
    this.gold = Number(def.gold || 0);
    const stateData = def.state as { lootTable?: string } | undefined;
    this.lootTable = (def.lootTable as string) || stateData?.lootTable || null;
    this.looted = false;
    this._resolvedLoot = null;
  }

  resolveLoot(lootTables: Record<string, LootTable> | null | undefined): ResolvedLoot {
    if (this._resolvedLoot) return this._resolvedLoot;
    const table = (this.lootTable && lootTables) ? lootTables[this.lootTable] : null;
    const result = ChestEntity.resolveTableLoot(this.gold, this.loot, table ?? null);
    this._resolvedLoot = result;
    this.looted = true;
    return result;
  }

  override getIcon(): string { return this.open ? '📭' : '📦'; }

  override getLabel(): string {
    if (this.open) return 'Opened Chest';
    if (this.locked) return 'Locked Chest';
    return 'Chest';
  }

  override getTexture(): string { return this.open ? 't_chest_open' : 't_chest'; }

  override getMenuOptions(_scene: GameScene | null): MenuOption[] {
    if (this.open) return [{ label: 'Chest (opened)', icon: '📭', action: 'open', enabled: false }];
    const opts: MenuOption[] = [];
    if (this.trapDc > 0 && !this.trapDetected && !this.trapTriggered) {
      opts.push({ label: 'Check for Traps', icon: '👁', action: 'check_trap', enabled: true });
    }
    if (this.trapDetected && !this.trapTriggered) {
      opts.push({ label: 'Disarm Trap', icon: '🔧', action: 'disarm_trap', enabled: true });
    }
    if (this.locked) {
      if (this.lockDc > 0) opts.push({ label: 'Lockpick Chest', icon: '🔓', action: 'lockpick_chest', enabled: true });
      if (!opts.some((o) => o.action === 'lockpick_chest')) opts.push({ label: 'Unlock Chest', icon: '🔑', action: 'open', enabled: false });
    } else {
      opts.push({ label: 'Open Chest', icon: '📦', action: 'open', enabled: true });
    }
    return opts;
  }

  override interact(scene: GameScene | null, action: string, _opts: Record<string, unknown> = {}): { ok: boolean; reason?: string; kind: string } {
    if (action === 'open') {
      const s = scene as unknown as { tryOpenChest?: (x: number, y: number) => boolean };
      const ok = s?.tryOpenChest?.(this.x, this.y);
      return { ok: !!ok, kind: 'chest' };
    }
    const _fireSkillHook = (skill: string, dc: number, success: boolean, total: number) =>
      (scene as unknown as { executeAbilityHook?(h: string, ctx: Record<string, unknown>): void })?.executeAbilityHook?.('on_skill_check', { skill, dc, success, total });

    if (action === 'check_trap') {
      const result = dnd.skillCheck('perception', PLAYER_STATS as unknown as Record<string, unknown>, this.trapDc);
      _fireSkillHook('perception', this.trapDc, result.success, result.total);
      if (result.success) {
        this.trapDetected = true;
        scene?.showStatus?.(`You spot a trap! (${result.total} vs DC ${this.trapDc})`);
      } else {
        scene?.showStatus?.(`Nothing seems dangerous. (${result.total} vs DC ${this.trapDc})`);
      }
      return { ok: result.success, kind: 'chest' };
    }
    if (action === 'disarm_trap') {
      const result = dnd.skillCheck('sleightOfHand', PLAYER_STATS as unknown as Record<string, unknown>, this.trapDc);
      _fireSkillHook('sleightOfHand', this.trapDc, result.success, result.total);
      if (result.success) {
        this.trapTriggered = true;
        scene?.showStatus?.(`Trap disarmed! (${result.total} vs DC ${this.trapDc})`);
      } else {
        const dmg = this.trapDamage || 4;
        const s = scene as GameScene & { player?: { x: number; y: number }; playerHP?: number; spawnFloat?: (x: number, y: number, t: string, c: string) => void; updateHUD?: () => void; handlePlayerDefeat?: () => void };
        this.trapTriggered = true;
        s?.showStatus?.(`Trap triggered! You take ${dmg} damage. (${result.total} vs DC ${this.trapDc})`);
        s?.spawnFloat?.(s.player?.x ?? 0, (s.player?.y ?? 0) - 10, `-${dmg}`, '#e74c3c');
        if (s && typeof s.playerHP === 'number') {
          s.playerHP = Math.max(0, s.playerHP - dmg);
          s?.updateHUD?.();
          if (s.playerHP <= 0) s.handlePlayerDefeat?.();
        }
        scene?.cameras?.main?.shake(200, 0.005);
      }
      return { ok: result.success, kind: 'chest' };
    }
    if (action === 'lockpick_chest') {
      const result = dnd.skillCheck('sleightOfHand', PLAYER_STATS as unknown as Record<string, unknown>, this.lockDc);
      _fireSkillHook('sleightOfHand', this.lockDc, result.success, result.total);
      if (result.success) {
        this.locked = false;
        scene?.showStatus?.(`Chest unlocked! (${result.total} vs DC ${this.lockDc})`);
      } else {
        scene?.showStatus?.(`Couldn't pick the lock. (${result.total} vs DC ${this.lockDc})`);
      }
      return { ok: result.success, kind: 'chest' };
    }
    return { ok: false, reason: 'Unknown chest action.', kind: 'chest' };
  }

  getBehavior(): BehaviorPreset {
    return ChestEntity.behaviorPresets[this.behavior] || ChestEntity.behaviorPresets.standard;
  }

  canOpen(scene: GameScene | null, actor: unknown = null, ctx: Record<string, unknown> = {}): { ok: boolean; reason?: string } {
    if (this.open) return { ok: false, reason: 'Already opened.' };
    if (this.locked && this.keyId) {
      const hasKey = typeof (scene as unknown as { hasKey?: (k: string) => boolean })?.hasKey === 'function'
        ? !!(scene as unknown as { hasKey: (k: string) => boolean }).hasKey(this.keyId!)
        : false;
      if (!hasKey) return { ok: false, reason: 'Chest requires a key.' };
    }
    const behavior = this.getBehavior();
    return behavior.canOpen(scene, this, actor, ctx) || { ok: true };
  }

  tryOpen(scene: GameScene | null, opts: { silent?: boolean; actor?: unknown } = {}): { ok: boolean; changed?: boolean; reason?: string } {
    const silent = !!opts.silent;
    if (this.open) return { ok: false, reason: 'Already opened.' };

    const chk = this.canOpen(scene, opts.actor || null, opts as Record<string, unknown>);
    if (!chk.ok) {
      if (!silent && chk.reason) scene?.showStatus?.(chk.reason);
      return { ok: false, reason: chk.reason || 'Cannot open chest.' };
    }

    this.open = true;
    const behavior = this.getBehavior();
    behavior.onOpen?.(scene, this, opts.actor || null, opts);
    return { ok: true, changed: true };
  }
}

(window as unknown as { ChestEntity: typeof ChestEntity }).ChestEntity = ChestEntity;
