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
  getIcon() { return this.state?.icon || '❓'; }
  getLabel() {
    if (this.state?.label) return String(this.state.label);
    return this.kind.charAt(0).toUpperCase() + this.kind.slice(1);
  }

  // ── Interaction protocol ──
  // Returns array of { label, icon, action, enabled }
  // Each entry becomes a context menu option when multiple are present.
  getMenuOptions(_scene) {
    if (!this.enabled) return [];
    const actions = Array.isArray(this.state?.actions) ? this.state.actions : null;
    if (actions && actions.length) {
      return actions.map((a) => ({
        label: String(a.label || this.getLabel()),
        icon: a.icon || this.getIcon(),
        action: String(a.action || 'inspect'),
        enabled: a.enabled !== false,
      }));
    }
    return [{ label: `Inspect ${this.getLabel()}`, icon: this.getIcon(), action: 'inspect', enabled: true }];
  }

  // Returns true if player must be adjacent to interact (default: yes)
  needsAdjacency() {
    if (typeof this.state?.needsAdjacency === 'boolean') return this.state.needsAdjacency;
    return true;
  }

  // Returns true if this entity blocks tile movement
  blocksMovement(_scene) { return false; }

  // Returns true if this entity blocks line of sight
  blocksSight() { return false; }

  // Returns the Phaser texture key for this entity's current state (null = no sprite)
  getTexture() {
    if (this.state?.texture) return String(this.state.texture);

    // Reasonable defaults so interactables are visible without per-entity art setup.
    const tags = new Set((Array.isArray(this.tags) ? this.tags : []).map((t) => String(t).toLowerCase()));
    if (tags.has('portal')) return 't_stairs';
    if (tags.has('quests')) return 'deco_banner';
    if (tags.has('merchant')) return 't_chest';
    if (tags.has('stash')) return 'deco_crystal';
    return 'deco_banner';
  }

  // Dispatch an action string to the entity's handler.
  // Returns { ok, reason?, kind } or null if action not handled.
  interact(scene, action, _opts = {}) {
    const a = String(action || 'inspect').toLowerCase();

    if (a.startsWith('dialog:')) {
      const dialogId = String(action || '').slice('dialog:'.length).trim();
      if (!dialogId) return { ok: false, reason: 'Dialog id is missing.', kind: this.kind };
      if (typeof DialogRunner === 'undefined' || typeof DialogRunner.start !== 'function') {
        return { ok: false, reason: 'Dialog system unavailable.', kind: this.kind };
      }
      DialogRunner.start(dialogId);
      return { ok: true, kind: this.kind };
    }

    if (a === 'inspect') {
      if (scene?.showStatus) {
        scene.showStatus(this.state?.description || `You inspect ${this.getLabel()}.`);
      }
      return { ok: true, kind: this.kind };
    }

    if (a === 'travel') {
      if (typeof ModLoader === 'undefined') {
        return { ok: false, reason: 'Travel system unavailable.', kind: this.kind };
      }
      const targetWorld = this.state?.targetWorld || null;
      const targetStage = this.state?.targetStage || null;

      if (targetWorld && typeof ModLoader.startRun === 'function') {
        ModLoader.startRun(targetWorld, scene, { targetStage });
        return { ok: true, kind: this.kind };
      }

      const resolved = (typeof ModLoader.resolveNextStage === 'function')
        ? ModLoader.resolveNextStage(targetStage, scene)
        : targetStage;
      if (!resolved) return { ok: false, reason: 'No destination configured.', kind: this.kind };

      const townResolved = (typeof ModLoader.resolveNextStage === 'function')
        ? ModLoader.resolveNextStage('town', scene)
        : 'town_hub';
      const travelIsExtraction = String(targetStage || '').toLowerCase() === 'town' && resolved === townResolved;
      if (travelIsExtraction && typeof ModLoader.resolveRunOutcome === 'function') {
        ModLoader.resolveRunOutcome(scene, 'extract');
        return { ok: true, kind: this.kind };
      }

      ModLoader.transitionToStage(resolved, scene);
      return { ok: true, kind: this.kind };
    }

    if (a === 'stash') {
      if (scene?.showTownStashSummary) {
        scene.showTownStashSummary();
      } else {
        scene?.showStatus?.('Stash is not implemented yet. Coming soon.');
      }
      return { ok: true, kind: this.kind };
    }

    if (a === 'stash_deposit_all') {
      if (scene?.depositAllToStash) {
        scene.depositAllToStash();
      } else {
        scene?.showStatus?.('Stash deposit is not available yet.');
      }
      return { ok: true, kind: this.kind };
    }

    if (a === 'stash_withdraw_all') {
      if (scene?.withdrawAllFromStash) {
        scene.withdrawAllFromStash();
      } else {
        scene?.showStatus?.('Stash withdraw is not available yet.');
      }
      return { ok: true, kind: this.kind };
    }

    if (a === 'shop') {
      scene?.showStatus?.('Quartermaster services are not implemented yet. Coming soon.');
      return { ok: true, kind: this.kind };
    }

    if (a === 'quests') {
      scene?.showStatus?.('Quest board is not implemented yet. Coming soon.');
      return { ok: true, kind: this.kind };
    }

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
