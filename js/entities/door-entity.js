// Door entity with per-instance behavior presets.
class DoorEntity extends InteractableEntity {
  static behaviorPresets = {
    standard: {
      canOpen: () => ({ ok: true }),
      onOpen: () => {},
      onClose: () => {},
    },
    timed: {
      canOpen: () => ({ ok: true }),
      onOpen(scene, door) {
        const delay = Math.max(200, Number(door.closeDelayMs || 1500));
        if (scene && scene.time) {
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

  constructor(def = {}) {
    super({ ...def, kind: 'door' });
    this.open = !!def.open;
    this.locked = !!def.locked;
    this.auto = def.auto === undefined ? false : !!def.auto;
    this.keyId = def.keyId || null;
    this.behavior = String(def.behavior || (this.locked ? 'locked' : 'standard')).toLowerCase();
    this.closeDelayMs = Number(def.closeDelayMs || 0);
  }

  getBehavior() {
    return DoorEntity.behaviorPresets[this.behavior] || DoorEntity.behaviorPresets.standard;
  }

  canOpen(scene, actor = null, ctx = {}) {
    if (this.locked && this.keyId) {
      const hasKey = typeof scene?.hasKey === 'function' ? !!scene.hasKey(this.keyId) : false;
      if (!hasKey) return { ok: false, reason: 'Door requires a key.' };
    }
    const behavior = this.getBehavior();
    if (behavior && typeof behavior.canOpen === 'function') {
      return behavior.canOpen(scene, this, actor, ctx) || { ok: true };
    }
    return { ok: true };
  }

  setOpen(scene, open, opts = {}) {
    const silent = !!opts.silent;
    if (!!open === this.open) return { ok: true, changed: false };

    if (open) {
      const chk = this.canOpen(scene, opts.actor || null, opts);
      if (!chk.ok) {
        if (!silent && chk.reason) scene?.showStatus?.(chk.reason);
        return { ok: false, reason: chk.reason || 'Cannot open door.' };
      }
    }

    this.open = !!open;
    const behavior = this.getBehavior();
    if (this.open) behavior?.onOpen?.(scene, this, opts.actor || null, opts);
    else behavior?.onClose?.(scene, this, opts.actor || null, opts);
    return { ok: true, changed: true };
  }

  toggle(scene, opts = {}) {
    return this.setOpen(scene, !this.open, opts);
  }
}

window.DoorEntity = DoorEntity;
