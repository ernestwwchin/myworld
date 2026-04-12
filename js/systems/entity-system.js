// ═══════════════════════════════════════════════════════
// entity-system.js — Generic entity registry & dispatcher
// Owns the unified tile index, entity lifecycle, and the
// interaction protocol (interactAtTile / buildTileMenu).
// Type-specific scene handlers live in their own files:
//   door-handler.js, chest-handler.js, etc.
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  // ─────────────────────────────────────────
  // REGISTRY
  // ─────────────────────────────────────────
  initEntities() {
    this.entities = [];
    this.entityById = {};
    this._entityTileIndex = {};   // key → [entity, ...] (multiple per tile)
    this.doorEntities = {};       // fast door lookup (compat)
    this.chestEntities = {};      // fast chest lookup (compat)
    this._entitySprites = {};     // key → Phaser.Image (entity overlay sprites)

    const _isDoor = (x, y) => { const v = MAP?.[y]?.[x]; return v === TILE.DOOR || v === 'D'; };
    const _isChest = (x, y) => { const v = MAP?.[y]?.[x]; return v === TILE.CHEST || v === 'C'; };

    // 1. Create doors + chests from MAP tile data (default state)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (_isDoor(x, y)) {
        this._registerEntity(new DoorEntity({
          id: `door:${x},${y}`, x, y,
          open: false, locked: false,
          auto: !!DOOR_RULES.defaultAuto,
          behavior: 'standard',
        }));
      } else if (_isChest(x, y)) {
        this._registerEntity(new ChestEntity({
          id: `chest:${x},${y}`, x, y,
          lootTable: 'starter_common',
        }));
      }
    }

    // 2. Override/add from map metadata (interactables + legacy doors)
    const meta = window._MAP_META || {};
    const legacyDoors = (Array.isArray(meta.doors) ? meta.doors : []).map(d => ({ ...d, kind: 'door' }));
    const interactables = Array.isArray(meta.interactables) ? meta.interactables : [];
    const defs = [...legacyDoors, ...interactables];

    for (const raw of defs) {
      const kind = String(raw.kind || raw.type || '').toLowerCase();
      const x = Number(raw.x), y = Number(raw.y);

      if (kind === 'door' && MAP[y] && _isDoor(x, y)) {
        this._registerEntity(new DoorEntity({
          id: raw.id || `door:${x},${y}`, x, y,
          open: !!raw.open,
          locked: !!raw.locked,
          auto: raw.auto === undefined ? !!DOOR_RULES.defaultAuto : !!raw.auto,
          behavior: raw.behavior || (raw.locked ? 'locked' : 'standard'),
          keyId: raw.keyId || null,
          closeDelayMs: raw.closeDelayMs,
          tags: raw.tags || [],
          state: raw.state || {},
        }));
      } else if (kind === 'chest') {
        this._registerEntity(new ChestEntity({
          id: raw.id || `chest:${x},${y}`, x, y,
          open: !!raw.open,
          locked: !!raw.locked,
          keyId: raw.keyId || null,
          behavior: raw.behavior || (raw.locked ? 'locked' : 'standard'),
          trapDamage: raw.trapDamage || 0,
          gold: Number(raw.gold || 0),
          loot: raw.loot || [],
          lootTable: raw.lootTable || null,
          tags: raw.tags || [],
          state: raw.state || {},
        }));
      } else {
        this._registerEntity(new InteractableEntity(raw));
      }
    }

    // 3. Convert MAP cells to FLOOR — entities are now the source of truth
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (_isDoor(x, y) || _isChest(x, y)) {
        MAP[y][x] = TILE.FLOOR;
      }
    }

    // 4. Create entity overlay sprites on top of floor tiles
    this._createAllEntitySprites();
    this.initChestGlows();
  },

  // Create Phaser sprites for all entities that have a texture
  _createAllEntitySprites() {
    for (const ent of this.entities) {
      this._createEntitySprite(ent);
    }
  },

  // Create a single entity's overlay sprite
  _createEntitySprite(ent) {
    const tex = ent.getTexture();
    if (!tex) return;
    const key = this._entityKey(ent.x, ent.y);
    // Destroy existing sprite if any
    if (this._entitySprites[key]) {
      this._entitySprites[key].destroy();
    }
    const spr = this.add.image(ent.x * S + S / 2, ent.y * S + S / 2, ...getTileTex(tex))
      .setDisplaySize(S, S).setDepth(3);
    this._entitySprites[key] = spr;
    ent.sprite = spr;
  },

  // Update an entity's sprite texture (called after state changes)
  _updateEntitySprite(ent) {
    const tex = ent.getTexture();
    if (!tex) return;
    if (ent.sprite) {
      ent.sprite.setTexture(...getTileTex(tex));
    } else {
      this._createEntitySprite(ent);
    }
  },

  // ─────────────────────────────────────────
  // TILE INDEX
  // ─────────────────────────────────────────
  _registerEntity(ent) {
    // Remove existing entity with same id (override)
    const existing = this.entityById[ent.id];
    if (existing) {
      const idx = this.entities.indexOf(existing);
      if (idx >= 0) this.entities.splice(idx, 1);
      const oldKey = this._entityKey(existing.x, existing.y);
      const arr = this._entityTileIndex[oldKey];
      if (arr) {
        const ai = arr.indexOf(existing);
        if (ai >= 0) arr.splice(ai, 1);
        if (!arr.length) delete this._entityTileIndex[oldKey];
      }
    }
    this.entities.push(ent);
    this.entityById[ent.id] = ent;
    // Unified tile index (supports multiple entities per tile)
    const key = this._entityKey(ent.x, ent.y);
    if (!this._entityTileIndex[key]) this._entityTileIndex[key] = [];
    this._entityTileIndex[key].push(ent);
    // Type-specific fast lookup (compat)
    if (ent instanceof DoorEntity) {
      this.doorEntities[key] = ent;
    } else if (ent instanceof ChestEntity) {
      this.chestEntities[key] = ent;
    }
  },

  _entityKey(x, y) { return `${x},${y}`; },

  getEntityById(id) {
    return this.entityById[String(id)] || null;
  },

  getEntitiesAt(x, y) {
    return this._entityTileIndex[this._entityKey(x, y)] || [];
  },

  getEntityAt(x, y, kind) {
    const ents = this.getEntitiesAt(x, y);
    if (!kind) return ents[0] || null;
    const k = String(kind).toLowerCase();
    return ents.find(e => e.kind === k) || null;
  },

  hasEntityType(x, y, kind) {
    return this.getEntitiesAt(x, y).some(e => e.kind === String(kind).toLowerCase());
  },

  // ─────────────────────────────────────────
  // GENERIC TILE INTERACTION (entity protocol)
  // ─────────────────────────────────────────
  _findInteractionApproachTile(tx, ty) {
    const dirs = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },                    { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
    ];

    const blk = (x, y) => this.isBlockedTile(x, y, { doorMode: 'passable' });
    let best = null;

    for (const d of dirs) {
      const ax = tx + d.x;
      const ay = ty + d.y;
      if (ax < 0 || ay < 0 || ax >= COLS || ay >= ROWS) continue;
      if (blk(ax, ay)) continue;

      const path = bfs(this.playerTile.x, this.playerTile.y, ax, ay, blk);
      if (!path.length) continue;
      if (!best || path.length < best.path.length) best = { x: ax, y: ay, path };
    }

    return best;
  },

  interactAtTile(tx, ty, opts = {}) {
    const ents = this.getEntitiesAt(tx, ty);
    if (!ents.length) return null;

    const dist = tileDist(this.playerTile.x, this.playerTile.y, tx, ty);
    const needsAdj = ents.some(e => e.needsAdjacency());
    if (needsAdj && dist > 1.5) {
      if (opts.autoMove) {
        const canStandOnTarget = !ents.some(e => e.blocksMovement(this))
          && !this.isBlockedTile(tx, ty, { doorMode: 'passable' });

        const approach = canStandOnTarget
          ? { x: tx, y: ty }
          : this._findInteractionApproachTile(tx, ty);
        if (approach) {
          this.setDestination(approach.x, approach.y, () => {
            this.interactAtTile(tx, ty, { ...opts, autoMove: false });
            if (typeof opts.onAutoMoveComplete === 'function') opts.onAutoMoveComplete();
          });
          return 'moving';
        }
      }
      this.showStatus(`Move closer to interact with ${ents[0].getLabel()}.`);
      return 'blocked';
    }

    const actions = [];
    for (const ent of ents) {
      for (const opt of ent.getMenuOptions(this)) {
        if (opt.enabled) actions.push({ ...opt, entity: ent });
      }
    }

    if (!actions.length) {
      this.showStatus(`Cannot interact with ${ents[0].getLabel()}.`);
      return 'blocked';
    }

    if (actions.length === 1) return this._executeEntityAction(actions[0]);

    if (opts.ptr) {
      // Deduplicate by label (same entity type at same tile registered twice)
      const seen = new Set();
      const items = [];
      for (const a of actions) {
        const lbl = `${a.icon} ${a.label}`;
        if (seen.has(lbl)) continue;
        seen.add(lbl);
        items.push({ label: lbl, action: () => this._executeEntityAction(a) });
      }
      if (items.length === 1) return this._executeEntityAction(actions[0]);
      const ev = opts.ptr.event || opts.ptr;
      this.showContextMenu(ev.clientX || 0, ev.clientY || 0, items);
      return 'menu';
    }

    return this._executeEntityAction(actions[0]);
  },

  buildTileMenu(tx, ty, enemy, ptr, afterAction) {
    const menuItems = [];
    if (enemy) {
      menuItems.push({ label: '⚔ Engage', action: () => this.onTapEnemy(enemy) });
    }
    const ents = this.getEntitiesAt(tx, ty);
    const dist = tileDist(this.playerTile.x, this.playerTile.y, tx, ty);
    for (const ent of ents) {
      if (ent.needsAdjacency() && dist > 1.5) continue;
      for (const opt of ent.getMenuOptions(this)) {
        if (!opt.enabled) continue;
        menuItems.push({
          label: `${opt.icon} ${opt.label}`,
          action: () => {
            this._executeEntityAction({ ...opt, entity: ent });
            if (afterAction) afterAction(ent.kind);
          },
        });
      }
    }
    if (menuItems.length > 1) { const ev = ptr.event || ptr; this.showContextMenu(ev.clientX || 0, ev.clientY || 0, menuItems); return true; }
    if (menuItems.length === 1) { menuItems[0].action(); return true; }
    return false;
  },

  _executeEntityAction(actionDef) {
    const ent = actionDef.entity;
    const kind = ent.kind;
    const action = actionDef.action;

    // Interacting with entities makes noise → breaks stealth (BG3-style)
    if (this.playerHidden && (kind === 'door' || kind === 'chest')) {
      this._breakStealth('Interaction noise reveals your position!');
    }

    // Type-specific scene handlers (defined in door-handler.js, chest-handler.js, etc.)
    if (kind === 'door' && action === 'toggle') { this.toggleDoor(ent.x, ent.y); return 'door'; }
    if (kind === 'chest' && action === 'open') { this.tryOpenChest(ent.x, ent.y); return 'chest'; }
    if (kind === 'floor_item' && action === 'pickup') { this.collectFloorItem(ent); return 'floor_item'; }

    // Generic fallback
    const result = ent.interact(this, action);
    if (result?.ok && this.log) this.log('ENTITY', `${kind}:${action} at (${ent.x},${ent.y})`);
    return kind;
  },

});
