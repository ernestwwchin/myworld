// Generic interactable registry for stage-defined objects.
const GameSceneInteractableSystem = {
  initInteractables() {
    this.interactables = [];
    this.interactableById = {};

    const defs = (window._MAP_META && Array.isArray(window._MAP_META.interactables))
      ? window._MAP_META.interactables
      : [];

    for (const raw of defs) {
      const kind = String(raw.kind || raw.type || '').toLowerCase();
      let ent = null;
      if (kind === 'door') ent = new DoorEntity(raw);
      else ent = new InteractableEntity(raw);

      this.interactables.push(ent);
      this.interactableById[ent.id] = ent;
    }
  },

  getInteractableById(id) {
    if (!this.interactableById) return null;
    return this.interactableById[String(id)] || null;
  },

  getInteractableAt(x, y, kind = null) {
    if (!this.interactables) return null;
    const kindNorm = kind ? String(kind).toLowerCase() : null;
    return this.interactables.find(i => i.x === x && i.y === y && (!kindNorm || i.kind === kindNorm)) || null;
  },
};

Object.assign(GameScene.prototype, GameSceneInteractableSystem);
