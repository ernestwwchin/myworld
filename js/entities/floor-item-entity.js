// ═══════════════════════════════════════════════════════
// FloorItemEntity — Dropped loot bag on the map.
// Spawns when an enemy is defeated. Player picks up by
// clicking the tile or walking over it (auto-collect).
// ═══════════════════════════════════════════════════════
class FloorItemEntity extends InteractableEntity {
  constructor(def = {}) {
    super({ ...def, kind: 'floor_item' });
    this.gold = Number(def.gold || 0);
    this.items = Array.isArray(def.items) ? def.items : [];
    this.collected = false;
    this.sourceLabel = def.sourceLabel || 'loot';
  }

  getIcon() { return '💰'; }
  getLabel() { return `Loot (${this.sourceLabel})`; }
  getTexture() { return this.collected ? null : 't_loot_bag'; }
  needsAdjacency() { return true; }

  getMenuOptions(_scene) {
    if (this.collected) return [];
    return [{ label: `Pick up ${this.getLabel()}`, icon: this.getIcon(), action: 'pickup', enabled: true }];
  }

  interact(scene, action) {
    if (action === 'pickup' && !this.collected) {
      return scene.collectFloorItem(this);
    }
    return { ok: false, reason: 'Nothing to pick up.' };
  }
}

window.FloorItemEntity = FloorItemEntity;
