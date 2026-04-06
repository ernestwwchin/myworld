// Treasure chest entity with loot, lock, and trap behaviors.
class ChestEntity extends InteractableEntity {
  static behaviorPresets = {
    standard: {
      canOpen: () => ({ ok: true }),
      onOpen: () => {},
    },
    locked: {
      canOpen(_scene, chest) {
        if (chest.locked) return { ok: false, reason: 'Chest is locked.' };
        return { ok: true };
      },
      onOpen: () => {},
    },
    trapped: {
      canOpen: () => ({ ok: true }),
      onOpen(scene, chest) {
        if (chest.trapTriggered) return;
        chest.trapTriggered = true;
        const dmg = chest.trapDamage || 4;
        scene.showStatus(`Trap! You take ${dmg} damage.`);
        scene.spawnFloat(scene.player.x, scene.player.y - 10, `-${dmg}`, '#e74c3c');
        scene.playerHP = Math.max(0, scene.playerHP - dmg);
        scene.cameras.main.shake(200, 0.005);
        scene.updateHUD();
      },
    },
  };

  constructor(def = {}) {
    super({ ...def, kind: 'chest' });
    this.open = !!def.open;
    this.locked = !!def.locked;
    this.keyId = def.keyId || null;
    this.behavior = String(def.behavior || (this.locked ? 'locked' : 'standard')).toLowerCase();
    this.trapDamage = Number(def.trapDamage || 0);
    this.trapTriggered = false;
    // Fixed loot: always given
    this.loot = Array.isArray(def.loot) ? [...def.loot] : [];
    // Fixed gold (overridden by lootTable gold range if table is set)
    this.gold = Number(def.gold || 0);
    // Loot table ID: rolls random items at open time
    this.lootTable = def.lootTable || (def.state?.lootTable) || null;
    this.looted = false;
    this._resolvedLoot = null;
  }

  // Resolve loot at open time: fixed loot + random rolls from table
  resolveLoot(lootTables) {
    if (this._resolvedLoot) return this._resolvedLoot;
    const result = { gold: this.gold, items: [...this.loot] };

    if (this.lootTable && lootTables) {
      const table = lootTables[this.lootTable];
      if (table) {
        // Gold range: [min, max]
        if (Array.isArray(table.gold) && table.gold.length === 2) {
          const [min, max] = table.gold;
          result.gold += min + Math.floor(Math.random() * (max - min + 1));
        }
        // Weighted random item rolls
        const rolls = Number(table.rolls || 0);
        const pool = Array.isArray(table.pool) ? table.pool : [];
        if (pool.length && rolls > 0) {
          const totalWeight = pool.reduce((s, e) => s + (Number(e.weight) || 1), 0);
          for (let r = 0; r < rolls; r++) {
            let roll = Math.random() * totalWeight;
            for (const entry of pool) {
              roll -= (Number(entry.weight) || 1);
              if (roll <= 0) {
                result.items.push({ ...entry });
                break;
              }
            }
          }
        }
      }
    }

    this._resolvedLoot = result;
    this.looted = true;
    return result;
  }

  // ── Type protocol ──
  getIcon() { return this.open ? '📭' : '📦'; }
  getLabel() {
    if (this.open) return 'Opened Chest';
    if (this.locked) return 'Locked Chest';
    return 'Chest';
  }

  getTexture() { return this.open ? 't_chest_open' : 't_chest'; }

  getMenuOptions(_scene) {
    if (this.open) return [{ label: 'Chest (opened)', icon: '📭', action: 'open', enabled: false }];
    if (this.locked) return [{ label: 'Unlock Chest', icon: '🔑', action: 'open', enabled: false }];
    return [{ label: 'Open Chest', icon: '📦', action: 'open', enabled: true }];
  }

  interact(scene, action, opts = {}) {
    if (action === 'open') {
      // Delegate to scene.tryOpenChest which has the full VFX sequence
      const ok = scene.tryOpenChest?.(this.x, this.y);
      return { ok: !!ok, kind: 'chest' };
    }
    return { ok: false, reason: 'Unknown chest action.', kind: 'chest' };
  }

  getBehavior() {
    return ChestEntity.behaviorPresets[this.behavior] || ChestEntity.behaviorPresets.standard;
  }

  canOpen(scene, actor = null, ctx = {}) {
    if (this.open) return { ok: false, reason: 'Already opened.' };
    if (this.locked && this.keyId) {
      const hasKey = typeof scene?.hasKey === 'function' ? !!scene.hasKey(this.keyId) : false;
      if (!hasKey) return { ok: false, reason: 'Chest requires a key.' };
    }
    const behavior = this.getBehavior();
    if (behavior && typeof behavior.canOpen === 'function') {
      return behavior.canOpen(scene, this, actor, ctx) || { ok: true };
    }
    return { ok: true };
  }

  tryOpen(scene, opts = {}) {
    const silent = !!opts.silent;
    if (this.open) return { ok: false, reason: 'Already opened.' };

    const chk = this.canOpen(scene, opts.actor || null, opts);
    if (!chk.ok) {
      if (!silent && chk.reason) scene?.showStatus?.(chk.reason);
      return { ok: false, reason: chk.reason || 'Cannot open chest.' };
    }

    this.open = true;
    const behavior = this.getBehavior();
    behavior?.onOpen?.(scene, this, opts.actor || null, opts);
    return { ok: true, changed: true };
  }
}

window.ChestEntity = ChestEntity;
