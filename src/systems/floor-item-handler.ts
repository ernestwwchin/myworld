import { S } from '@/config';
import { withCombatLog, withHotbar, withSidePanel } from '@/helpers';
import type { GameScene } from '@/game';
import type { FloorItemEntity } from '@/entities/floor-item-entity';
import type { GameEntity } from '@/types/entities';
import type { InventoryItem } from '@/config';

export const FloorItemHandlerMixin = {
  spawnFloorItem(
    this: GameScene,
    tx: number,
    ty: number,
    loot: { gold: number; items: InventoryItem[]; sourceLabel?: string },
  ): FloorItemEntity {
    const id = `floor_item:${tx},${ty}:${Date.now()}`;
    const w = window as unknown as { FloorItemEntity?: new (def: Record<string, unknown>) => FloorItemEntity };
    const FloorItemEntityCtor = w.FloorItemEntity!;
    const ent = new FloorItemEntityCtor({
      id,
      x: tx,
      y: ty,
      gold: loot.gold || 0,
      items: loot.items || [],
      sourceLabel: loot.sourceLabel || 'loot',
    });
    this._registerEntity(ent as unknown as GameEntity);
    this._createEntitySprite(ent as unknown as GameEntity);

    if (ent.sprite) {
      ent.sprite.setScale(0).setDepth(4);
      this.tweens.add({
        targets: ent.sprite,
        scaleX: 1,
        scaleY: 1,
        duration: 250,
        ease: 'Back.easeOut',
      });
    }

    const cx = tx * S + S / 2;
    const cy = ty * S + S / 2;
    const glow = this.add.graphics().setDepth(3).setAlpha(0.3);
    glow.fillStyle(0xf0c060, 0.2);
    glow.fillCircle(cx, cy, S * 0.4);
    this.tweens.add({
      targets: glow,
      alpha: 0.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    (ent as FloorItemEntity & { _glow: Phaser.GameObjects.Graphics })._glow = glow;

    return ent;
  },

  collectFloorItem(this: GameScene, ent: FloorItemEntity & { _glow?: Phaser.GameObjects.Graphics }): { ok: boolean; kind?: string } {
    if (!ent || ent.collected) return { ok: false };
    ent.collected = true;

    const drops: string[] = [];

    if (ent.gold > 0) {
      this.pStats.gold = (Number(this.pStats.gold) || 0) + ent.gold;
      drops.push(`+${ent.gold} gold`);
      const wx = ent.x * S + S / 2;
      const wy = ent.y * S + S / 2;
      this.spawnFloat(wx, wy - S / 2, `+${ent.gold}g`, '#f0c060');
    }

    for (const item of (ent.items || [])) {
      this.addItemToInventory(item, Number(item.qty || 1));
      drops.push(`${item.icon ? item.icon + ' ' : ''}${item.name || item.id || 'item'}`);
    }

    if (drops.length) {
      const msg = `Picked up: ${drops.join(', ')}`;
      withCombatLog((cl) => (cl as { log: (m: string, t: string, s: string) => void }).log(msg, 'loot', 'system'));
      this.showStatus(msg);
      withSidePanel((sp) => {
        const sidePanel = sp as { _activeTab?: string; refresh?: () => void };
        if (sidePanel._activeTab === 'inventory') sidePanel.refresh?.();
      });
      withHotbar((hb) => (hb as { refreshItems?: () => void }).refreshItems?.());
      this.updateHUD();
    }

    if (ent.sprite) {
      this.tweens.add({
        targets: ent.sprite,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 200,
        ease: 'Cubic.easeIn',
        onComplete: () => { if (ent.sprite) ent.sprite.destroy(); },
      });
    }
    if (ent._glow) {
      this.tweens.add({
        targets: ent._glow,
        alpha: 0,
        duration: 200,
        onComplete: () => { if (ent._glow) ent._glow.destroy(); },
      });
    }

    this._updateEntitySprite(ent as unknown as GameEntity);
    return { ok: true, kind: 'floor_item' };
  },

  checkFloorItemPickup(this: GameScene): void {
    const px = this.playerTile.x;
    const py = this.playerTile.y;
    for (const ent of this.entities as GameEntity[]) {
      if (ent.kind !== 'floor_item') continue;
      const fi = ent as unknown as FloorItemEntity;
      if (fi.collected) continue;
      if (fi.x === px && fi.y === py) {
        this.collectFloorItem(fi);
      }
    }
  },
};

declare module '@/game' {
  interface GameScene {
    spawnFloorItem(tx: number, ty: number, loot: { gold: number; items: InventoryItem[]; sourceLabel?: string }): FloorItemEntity;
    collectFloorItem(ent: FloorItemEntity): { ok: boolean; kind?: string };
    checkFloorItemPickup(): void;
  }
}
