import { InteractableEntity } from '@/entities/interactable-entity';
import type { GameScene } from '@/game';
import type { InventoryItem } from '@/config';
import type { MenuOption } from '@/types/entities';

export class FloorItemEntity extends InteractableEntity {
  gold: number;
  items: InventoryItem[];
  collected: boolean;
  sourceLabel: string;
  _glow?: Phaser.GameObjects.Graphics;

  constructor(def: Record<string, unknown> = {}) {
    super({ ...def, kind: 'floor_item' });
    this.gold = Number(def.gold || 0);
    this.items = Array.isArray(def.items) ? (def.items as InventoryItem[]) : [];
    this.collected = false;
    this.sourceLabel = (def.sourceLabel as string) || 'loot';
  }

  override getIcon(): string { return '💰'; }
  override getLabel(): string { return `Loot (${this.sourceLabel})`; }
  override getTexture(): string | null { return this.collected ? null : 't_loot_bag'; }
  override needsAdjacency(): boolean { return true; }

  override getMenuOptions(_scene: GameScene | null): MenuOption[] {
    if (this.collected) return [];
    return [{ label: `Pick up ${this.getLabel()}`, icon: this.getIcon(), action: 'pickup', enabled: true }];
  }

  override interact(scene: GameScene | null, action: string, _opts?: Record<string, unknown>): { ok: boolean; reason?: string; kind?: string } {
    if (action === 'pickup' && !this.collected) {
      const s = scene as unknown as { collectFloorItem?: (e: FloorItemEntity) => { ok: boolean; kind?: string } };
      return s?.collectFloorItem?.(this) ?? { ok: false };
    }
    return { ok: false, reason: 'Nothing to pick up.' };
  }
}

(window as unknown as { FloorItemEntity: typeof FloorItemEntity }).FloorItemEntity = FloorItemEntity;
