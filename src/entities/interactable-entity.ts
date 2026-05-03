import { dnd, PLAYER_STATS } from '@/config';
import type { GameScene } from '@/game';
import type { GameEntity, MenuOption } from '@/types/entities';
import { showStashPanel, showShopPanel, showJobSelectorPanel, showQuestBoardPanel } from '@/ui/town-panels';

type EntityState = {
  label?: string;
  description?: string;
  icon?: string;
  texture?: string;
  needsAdjacency?: boolean;
  actions?: Array<{ label?: string; icon?: string; action?: string; enabled?: boolean }>;
  targetWorld?: string;
  targetStage?: string;
};

export class InteractableEntity implements GameEntity {
  id: string;
  kind: string;
  x: number;
  y: number;
  enabled: boolean;
  tags: string[];
  state: EntityState;
  sprite?: Phaser.GameObjects.Image;
  open?: boolean;

  constructor(def: Record<string, unknown> = {}) {
    this.id = String(def.id || `${def.kind || 'interactable'}:${def.x},${def.y}`);
    this.kind = String(def.kind || 'interactable').toLowerCase();
    this.x = Number(def.x || 0);
    this.y = Number(def.y || 0);
    this.enabled = def.enabled !== false;
    this.tags = Array.isArray(def.tags) ? [...(def.tags as string[])] : [];
    this.state = { ...((def.state as EntityState) || {}) };
  }

  getType(): string { return this.kind; }
  getIcon(): string { return this.state?.icon || '❓'; }

  getLabel(): string {
    if (this.state?.label) return String(this.state.label);
    return this.kind.charAt(0).toUpperCase() + this.kind.slice(1);
  }

  getMenuOptions(_scene: GameScene | null): MenuOption[] {
    if (!this.enabled) return [];
    const actions = Array.isArray(this.state?.actions) ? this.state.actions : null;
    if (actions && actions.length) {
      return actions.map((a) => ({
        label: String(a.label || this.getLabel()),
        icon: String(a.icon || this.getIcon()),
        action: String(a.action || 'inspect'),
        enabled: a.enabled !== false,
      }));
    }
    return [{ label: `Inspect ${this.getLabel()}`, icon: this.getIcon(), action: 'inspect', enabled: true }];
  }

  needsAdjacency(): boolean {
    if (typeof this.state?.needsAdjacency === 'boolean') return this.state.needsAdjacency;
    return true;
  }

  blocksMovement(_scene: GameScene | null): boolean { return false; }
  blocksSight(): boolean { return false; }

  getTexture(): string | null {
    if (this.state?.texture) return String(this.state.texture);
    const tags = new Set((Array.isArray(this.tags) ? this.tags : []).map((t) => String(t).toLowerCase()));
    if (tags.has('portal')) return 't_stairs';
    if (tags.has('quests')) return 'deco_banner';
    if (tags.has('merchant')) return 't_chest';
    if (tags.has('stash')) return 'deco_crystal';
    return 'deco_banner';
  }

  interact(scene: GameScene | null, action: string, _opts: Record<string, unknown> = {}): { ok?: boolean; reason?: string; kind?: string } | null {
    const a = String(action || 'inspect').toLowerCase();

    if (a.startsWith('dialog:')) {
      const dialogId = String(action || '').slice('dialog:'.length).trim();
      if (!dialogId) return { ok: false, reason: 'Dialog id is missing.', kind: this.kind };
      const w = window as unknown as { DialogRunner?: { start: (id: string) => Promise<void> } };
      if (!w.DialogRunner?.start) return { ok: false, reason: 'Dialog system unavailable.', kind: this.kind };
      w.DialogRunner.start(dialogId);
      return { ok: true, kind: this.kind };
    }

    if (a === 'inspect') {
      scene?.showStatus?.(this.state?.description || `You inspect ${this.getLabel()}.`);
      return { ok: true, kind: this.kind };
    }

    if (a === 'travel') {
      const w = window as unknown as { ModLoader?: { startRun?: (world: string, scene: GameScene | null, opts: unknown) => void; resolveNextStage?: (stage: string | null, scene: GameScene | null) => string | null; transitionToStage?: (stage: string, scene: GameScene | null) => void; resolveRunOutcome?: (scene: GameScene | null, outcome: string) => void } };
      const ModLoader = w.ModLoader;
      if (!ModLoader) return { ok: false, reason: 'Travel system unavailable.', kind: this.kind };

      const targetWorld = this.state?.targetWorld || null;
      const targetStage = this.state?.targetStage || null;

      if (targetWorld && typeof ModLoader.startRun === 'function') {
        ModLoader.startRun(targetWorld, scene, { targetStage });
        return { ok: true, kind: this.kind };
      }

      const resolved = typeof ModLoader.resolveNextStage === 'function'
        ? ModLoader.resolveNextStage(targetStage, scene)
        : targetStage;
      if (!resolved) return { ok: false, reason: 'No destination configured.', kind: this.kind };

      const townResolved = typeof ModLoader.resolveNextStage === 'function'
        ? ModLoader.resolveNextStage('town', scene)
        : 'town_hub';
      const travelIsExtraction = String(targetStage || '').toLowerCase() === 'town' && resolved === townResolved;
      if (travelIsExtraction && typeof ModLoader.resolveRunOutcome === 'function') {
        ModLoader.resolveRunOutcome(scene, 'extract');
        return { ok: true, kind: this.kind };
      }

      ModLoader.transitionToStage?.(resolved, scene);
      return { ok: true, kind: this.kind };
    }

    if (a === 'stash' || a === 'stash_deposit_all' || a === 'stash_withdraw_all') {
      if (scene) showStashPanel(scene);
      return { ok: true, kind: this.kind };
    }

    if (a === 'shop') {
      if (scene) showShopPanel(scene);
      return { ok: true, kind: this.kind };
    }

    if (a === 'quests') {
      if (scene) showQuestBoardPanel(scene);
      return { ok: true, kind: this.kind };
    }

    if (a === 'jobselect') {
      if (scene) showJobSelectorPanel(scene);
      return { ok: true, kind: this.kind };
    }

    if (a === 'camp_rest') {
      const conMod = Math.floor(((PLAYER_STATS.con ?? 10) - 10) / 2);
      const roll = dnd.roll(1, 8);
      const heal = Math.max(1, roll + conMod);
      const s = scene as GameScene & { playerHP?: number; playerMaxHP?: number; updateHUD?: () => void; spawnFloat?: (x: number, y: number, t: string, c: string) => void; player?: { x: number; y: number } };
      if (s && typeof s.playerHP === 'number' && typeof s.playerMaxHP === 'number') {
        const before = s.playerHP;
        s.playerHP = Math.min(s.playerMaxHP, s.playerHP + heal);
        const gained = s.playerHP - before;
        s.updateHUD?.();
        s.spawnFloat?.(s.player?.x ?? 0, (s.player?.y ?? 0) - 10, `+${gained}`, '#66bb6a');
        scene?.showStatus?.(`Short rest: recovered ${gained} HP (1d8${conMod >= 0 ? '+' : ''}${conMod} = ${roll}+${conMod}).`);
        // remove non-combat status effects
        const CLEANSABLE = ['poisoned', 'bleeding', 'burning', 'restrained', 'slow'];
        for (const sid of CLEANSABLE) {
          if (typeof (scene as unknown as { removeStatusFromActor?: (a: unknown, id: string) => void }).removeStatusFromActor === 'function') {
            (scene as unknown as { removeStatusFromActor: (a: unknown, id: string) => void }).removeStatusFromActor('player', sid);
          }
        }
      } else {
        scene?.showStatus?.('You rest by the fire and feel refreshed.');
      }
      return { ok: true, kind: this.kind };
    }

    return { ok: false, reason: 'No interaction handler.', kind: this.kind };
  }

  canInteract(scene: GameScene | null, _actor: unknown, _action: string, _ctx: Record<string, unknown> = {}): boolean {
    return this.enabled && this.getMenuOptions(scene).some((o) => o.enabled);
  }

  onInteract(scene: GameScene | null, _actor: unknown, action: string, ctx: Record<string, unknown> = {}): ReturnType<typeof this.interact> {
    return this.interact(scene, action, ctx);
  }
}

(window as unknown as { InteractableEntity: typeof InteractableEntity }).InteractableEntity = InteractableEntity;
