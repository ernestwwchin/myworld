// ═══════════════════════════════════════════════════════
// floor-item-handler.js — Scene integration for FloorItemEntity
// Spawn loot bags, collect items, auto-pickup on walk-over.
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  /**
   * Spawn a floor loot bag at a tile position.
   * @param {number} tx tile X
   * @param {number} ty tile Y
   * @param {{gold:number, items:Array, sourceLabel:string}} loot resolved loot
   * @returns {FloorItemEntity}
   */
  spawnFloorItem(tx, ty, loot) {
    const id = `floor_item:${tx},${ty}:${Date.now()}`;
    const ent = new FloorItemEntity({
      id, x: tx, y: ty,
      gold: loot.gold || 0,
      items: loot.items || [],
      sourceLabel: loot.sourceLabel || 'loot',
    });
    this._registerEntity(ent);
    this._createEntitySprite(ent);

    // Pop-in animation
    if (ent.sprite) {
      ent.sprite.setScale(0).setDepth(4);
      this.tweens.add({
        targets: ent.sprite,
        scaleX: 1, scaleY: 1,
        duration: 250, ease: 'Back.easeOut',
      });
    }

    // Pulsing glow (similar to chest glow)
    const cx = tx * S + S / 2, cy = ty * S + S / 2;
    const glow = this.add.graphics().setDepth(3).setAlpha(0.3);
    glow.fillStyle(0xf0c060, 0.2);
    glow.fillCircle(cx, cy, S * 0.4);
    this.tweens.add({
      targets: glow, alpha: 0.1,
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    ent._glow = glow;

    return ent;
  },

  /**
   * Collect a floor loot bag — add gold + items to player inventory.
   * Called by FloorItemEntity.interact() or auto-pickup.
   */
  collectFloorItem(ent) {
    if (!ent || ent.collected) return { ok: false };
    ent.collected = true;

    const drops = [];

    if (ent.gold > 0) {
      this.pStats.gold = (this.pStats.gold || 0) + ent.gold;
      drops.push(`+${ent.gold} gold`);
      const wx = ent.x * S + S / 2, wy = ent.y * S + S / 2;
      this.spawnFloat(wx, wy - S / 2, `+${ent.gold}g`, '#f0c060');
    }

    for (const item of (ent.items || [])) {
      this.addItemToInventory(item, Number(item.qty || 1));
      drops.push(`${item.icon ? item.icon + ' ' : ''}${item.name || item.id || 'item'}`);
    }

    if (drops.length) {
      const msg = `Picked up: ${drops.join(', ')}`;
      if (typeof CombatLog !== 'undefined') CombatLog.log(msg, 'loot', 'system');
      this.showStatus(msg);
      if (typeof SidePanel !== 'undefined' && SidePanel._activeTab === 'inventory') SidePanel.refresh();
      if (typeof Hotbar !== 'undefined') Hotbar.refreshItems();
      this.updateHUD();
    }

    // Remove sprite + glow
    if (ent.sprite) {
      this.tweens.add({
        targets: ent.sprite,
        alpha: 0, scaleX: 0.3, scaleY: 0.3,
        duration: 200, ease: 'Cubic.easeIn',
        onComplete: () => { if (ent.sprite) ent.sprite.destroy(); },
      });
    }
    if (ent._glow) {
      this.tweens.add({
        targets: ent._glow, alpha: 0, duration: 200,
        onComplete: () => { if (ent._glow) ent._glow.destroy(); },
      });
    }

    this._updateEntitySprite(ent);
    return { ok: true, kind: 'floor_item' };
  },

  /**
   * Auto-pickup: check if player is standing on or adjacent to any uncollected floor items.
   * Called from advancePath tile-boundary crossing.
   */
  checkFloorItemPickup() {
    const px = this.playerTile.x, py = this.playerTile.y;
    for (const ent of this.entities) {
      if (!(ent instanceof FloorItemEntity) || ent.collected) continue;
      if (ent.x === px && ent.y === py) {
        this.collectFloorItem(ent);
      }
    }
  },

});
