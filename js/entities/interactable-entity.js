// Base class for map interactables (doors, traps, machines, etc.).
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

  canInteract(_scene, _actor, _action, _ctx = {}) {
    return this.enabled;
  }

  onInteract(_scene, _actor, _action, _ctx = {}) {
    return { ok: false, reason: 'No interaction handler.' };
  }
}

window.InteractableEntity = InteractableEntity;
