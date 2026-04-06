// ═══════════════════════════════════════════════════════
// InteractableEntity — Base class for all map entities.
// Subclasses override getMenuOptions() and interact() to
// define their own behaviors. The entity-system collects
// menu options from ALL entities at a tile and builds a
// unified context menu or auto-executes single actions.
// ═══════════════════════════════════════════════════════
class InteractableEntity {
  constructor(def = {}) {
    this.id = String(def.id || `${def.kind || 'interactable'}:${def.x},${def.y}`);
    this.kind = String(def.kind || 'interactable').toLowerCase();
    this.x = Number(def.x || 0);
    this.y = Number(def.y || 0);
    this.enabled = def.enabled !== false;
    this.tags = Array.isArray(def.tags) ? [...def.tags] : [];
    this.state = { ...(def.state || {}) };
  }

  // ── Type identification ──
  getType() { return this.kind; }
  getIcon() { return '❓'; }
  getLabel() { return this.kind.charAt(0).toUpperCase() + this.kind.slice(1); }

  // ── Interaction protocol ──
  // Returns array of { label, icon, action, enabled }
  // Each entry becomes a context menu option when multiple are present.
  getMenuOptions(_scene) {
    if (!this.enabled) return [];
    return [{ label: `Inspect ${this.getLabel()}`, icon: this.getIcon(), action: 'inspect', enabled: true }];
  }

  // Returns true if player must be adjacent to interact (default: yes)
  needsAdjacency() { return true; }

  // Returns true if this entity blocks tile movement
  blocksMovement(_scene) { return false; }

  // Returns true if this entity blocks line of sight
  blocksSight() { return false; }

  // Returns the Phaser texture key for this entity's current state (null = no sprite)
  getTexture() { return null; }

  // Dispatch an action string to the entity's handler.
  // Returns { ok, reason?, kind } or null if action not handled.
  interact(_scene, _action, _opts = {}) {
    return { ok: false, reason: 'No interaction handler.', kind: this.kind };
  }

  // Legacy compat
  canInteract(scene, _actor, _action, _ctx = {}) {
    return this.enabled && this.getMenuOptions(scene).some(o => o.enabled);
  }

  onInteract(scene, _actor, action, ctx = {}) {
    return this.interact(scene, action, ctx);
  }
}

window.InteractableEntity = InteractableEntity;
