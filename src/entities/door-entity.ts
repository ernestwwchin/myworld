import { InteractableEntity } from '@/entities/interactable-entity';
import { dnd, PLAYER_STATS } from '@/config';
import type { GameScene } from '@/game';
import type { MenuOption } from '@/types/entities';

type BehaviorPreset = {
  canOpen(scene: GameScene | null, door: DoorEntity, actor?: unknown, ctx?: unknown): { ok: boolean; reason?: string };
  onOpen(scene: GameScene | null, door: DoorEntity, actor?: unknown, ctx?: unknown): void;
  onClose(scene: GameScene | null, door: DoorEntity, actor?: unknown, ctx?: unknown): void;
};

export class DoorEntity extends InteractableEntity {
  static behaviorPresets: Record<string, BehaviorPreset> = {
    standard: {
      canOpen: () => ({ ok: true }),
      onOpen: () => {},
      onClose: () => {},
    },
    timed: {
      canOpen: () => ({ ok: true }),
      onOpen(scene, door) {
        const delay = Math.max(200, Number(door.closeDelayMs || 1500));
        if (scene?.time) {
          scene.time.delayedCall(delay, () => {
            if (door.open && door.auto) door.setOpen(scene, false, { silent: true });
          });
        }
      },
      onClose: () => {},
    },
    locked: {
      canOpen(_scene, door) {
        if (door.locked) return { ok: false, reason: 'Door is locked.' };
        return { ok: true };
      },
      onOpen: () => {},
      onClose: () => {},
    },
  };

  override open: boolean;
  locked: boolean;
  auto: boolean;
  keyId: string | null;
  behavior: string;
  closeDelayMs: number;
  lockDc: number;
  breakDc: number;

  constructor(def: Record<string, unknown> = {}) {
    super({ ...def, kind: 'door' });
    this.open = !!def.open;
    this.locked = !!def.locked;
    this.auto = def.auto === undefined ? false : !!def.auto;
    this.keyId = (def.keyId as string) || null;
    this.behavior = String(def.behavior || (this.locked ? 'locked' : 'standard')).toLowerCase();
    this.closeDelayMs = Number(def.closeDelayMs || 0);
    this.lockDc = Number(def.lockDc || 15);
    this.breakDc = Number(def.breakDc || 18);
  }

  override getIcon(): string { return '🚪'; }
  override getLabel(): string { return this.locked ? 'Locked Door' : (this.open ? 'Open Door' : 'Door'); }

  override getMenuOptions(_scene: GameScene | null): MenuOption[] {
    if (this.locked) {
      const opts: MenuOption[] = [];
      if (this.lockDc > 0) opts.push({ label: 'Lockpick', icon: '🔓', action: 'lockpick', enabled: true });
      if (this.breakDc > 0) opts.push({ label: 'Force Open', icon: '💪', action: 'break_door', enabled: true });
      if (!opts.length) opts.push({ label: 'Unlock Door', icon: '🔑', action: 'toggle', enabled: false });
      return opts;
    }
    const label = this.open ? 'Close Door' : 'Open Door';
    return [{ label, icon: '🚪', action: 'toggle', enabled: true }];
  }

  override blocksMovement(_scene: GameScene | null): boolean { return !this.open; }
  override blocksSight(): boolean { return !this.open; }
  override getTexture(): string { return this.open ? 't_door_open' : 't_door'; }

  override interact(scene: GameScene | null, action: string, opts: Record<string, unknown> = {}): { ok?: boolean; reason?: string; kind: string } {
    if (action === 'toggle') {
      const result = this.toggle(scene, opts);
      return { ...result, kind: 'door' };
    }
    if (action === 'lockpick') {
      const result = dnd.skillCheck('sleightOfHand', PLAYER_STATS as unknown as Record<string, unknown>, this.lockDc);
      if (result.success) {
        this.locked = false;
        scene?.showStatus?.(`Lockpick success! (${result.total} vs DC ${this.lockDc})`);
        this.toggle(scene, opts);
      } else {
        scene?.showStatus?.(`Lockpick failed. (${result.total} vs DC ${this.lockDc})`);
      }
      return { ok: result.success, kind: 'door' };
    }
    if (action === 'break_door') {
      const result = dnd.skillCheck('athletics', PLAYER_STATS as unknown as Record<string, unknown>, this.breakDc);
      if (result.success) {
        this.locked = false;
        scene?.showStatus?.(`Forced the door open! (${result.total} vs DC ${this.breakDc})`);
        this.toggle(scene, opts);
      } else {
        scene?.showStatus?.(`Couldn't force the door. (${result.total} vs DC ${this.breakDc})`);
      }
      return { ok: result.success, kind: 'door' };
    }
    return { ok: false, reason: 'Unknown door action.', kind: 'door' };
  }

  getBehavior(): BehaviorPreset {
    return DoorEntity.behaviorPresets[this.behavior] || DoorEntity.behaviorPresets.standard;
  }

  canOpen(scene: GameScene | null, actor: unknown = null, ctx: Record<string, unknown> = {}): { ok: boolean; reason?: string } {
    if (this.locked && this.keyId) {
      const hasKey = typeof (scene as unknown as { hasKey?: (k: string) => boolean })?.hasKey === 'function'
        ? !!(scene as unknown as { hasKey: (k: string) => boolean }).hasKey(this.keyId!)
        : false;
      if (!hasKey) return { ok: false, reason: 'Door requires a key.' };
    }
    const behavior = this.getBehavior();
    return behavior.canOpen(scene, this, actor, ctx) || { ok: true };
  }

  setOpen(scene: GameScene | null, open: boolean, opts: { silent?: boolean; actor?: unknown } = {}): { ok: boolean; changed?: boolean; reason?: string } {
    const silent = !!opts.silent;
    if (!!open === this.open) return { ok: true, changed: false };

    if (open) {
      const chk = this.canOpen(scene, opts.actor || null, opts as Record<string, unknown>);
      if (!chk.ok) {
        if (!silent && chk.reason) scene?.showStatus?.(chk.reason);
        return { ok: false, reason: chk.reason || 'Cannot open door.' };
      }
    }

    this.open = !!open;
    const behavior = this.getBehavior();
    if (this.open) behavior.onOpen?.(scene, this, opts.actor || null, opts);
    else behavior.onClose?.(scene, this, opts.actor || null, opts);
    return { ok: true, changed: true };
  }

  toggle(scene: GameScene | null, opts: { silent?: boolean; actor?: unknown } = {}): { ok: boolean; changed?: boolean; reason?: string } {
    return this.setOpen(scene, !this.open, opts);
  }
}

(window as unknown as { DoorEntity: typeof DoorEntity }).DoorEntity = DoorEntity;
