// Door system extracted from GameScene to keep scene class focused.
const GameSceneDoorSystem = {
  doorKey(x, y) { return `${x},${y}`; },

  getDoorEntity(x, y) {
    if (!this.doorEntities) this.doorEntities = {};
    return this.doorEntities[this.doorKey(x, y)] || null;
  },

  initDoorStates() {
    this.doorStates = {};
    this.doorEntities = {};
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!this.isDoorTile(x, y)) continue;
      const ent = new DoorEntity({
        id: `door:${x},${y}`,
        x,
        y,
        open: false,
        locked: false,
        auto: !!DOOR_RULES.defaultAuto,
        behavior: 'standard',
      });
      this.doorEntities[this.doorKey(x, y)] = ent;
      this.doorStates[this.doorKey(x, y)] = { open: ent.open, locked: ent.locked, auto: ent.auto };
    }
    const legacyDefs = (window._MAP_META && Array.isArray(window._MAP_META.doors)) ? window._MAP_META.doors : [];
    const interactables = (window._MAP_META && Array.isArray(window._MAP_META.interactables)) ? window._MAP_META.interactables : [];
    const defs = [
      ...legacyDefs.map(d => ({ ...d, kind: 'door' })),
      ...interactables.filter(i => String(i.kind || i.type || '').toLowerCase() === 'door'),
    ];
    for (const d of defs) {
      const x = Number(d.x), y = Number(d.y);
      if (MAP[y] && this.isDoorTile(x, y)) {
        const ent = new DoorEntity({
          id: d.id || `door:${x},${y}`,
          x,
          y,
          open: !!d.open,
          locked: !!d.locked,
          auto: d.auto === undefined ? !!DOOR_RULES.defaultAuto : !!d.auto,
          behavior: d.behavior || (d.locked ? 'locked' : 'standard'),
          keyId: d.keyId || null,
          closeDelayMs: d.closeDelayMs,
          tags: d.tags || [],
          state: d.state || {},
        });
        this.doorEntities[this.doorKey(x, y)] = ent;
        this.doorStates[this.doorKey(x, y)] = { open: ent.open, locked: ent.locked, auto: ent.auto };
      }
    }
    this.refreshDoorTiles();
  },

  getDoorState(x, y) {
    const ent = this.getDoorEntity(x, y);
    if (ent) return { open: !!ent.open, locked: !!ent.locked, auto: !!ent.auto };
    return this.doorStates[this.doorKey(x, y)] || { open: false, locked: false, auto: !!DOOR_RULES.defaultAuto };
  },

  isDoorClosed(x, y) {
    if (MAP[y] && !this.isDoorTile(x, y)) return false;
    return !this.getDoorState(x, y).open;
  },

  isDoorPassable(x, y) {
    if (MAP[y] && !this.isDoorTile(x, y)) return true;
    const d = this.getDoorState(x, y);
    return d.open || !d.locked;
  },

  refreshDoorTile(x, y) {
    if (!this.tileSprites[y] || !this.tileSprites[y][x] || !this.isDoorTile(x, y)) return;
    const door = this.getDoorState(x, y);
    const img = this.tileSprites[y][x];
    img.setTexture(door.open ? 't_door_open' : 't_door');
  },

  refreshDoorTiles() {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (this.isDoorTile(x, y)) this.refreshDoorTile(x, y);
  },

  setDoorOpen(x, y, open, silent) {
    if (MAP[y] && !this.isDoorTile(x, y)) return false;
    const k = this.doorKey(x, y);
    const ent = this.getDoorEntity(x, y);
    const result = ent
      ? ent.setOpen(this, !!open, { silent: !!silent, actor: 'player' })
      : { ok: true, changed: true };
    if (!result.ok) return false;

    const d = this.getDoorState(x, y);
    this.doorStates[k] = d;
    this.refreshDoorTile(x, y);
    if (!silent && result.changed) {
      const msg = d.open ? 'Door opened.' : 'Door closed.';
      this.showStatus(msg);
      if (this.log) this.log('DOOR', `${msg} at (${x},${y})`);
    }
    this.updateFogOfWar();
    if (this.mode === MODE.EXPLORE) this.drawSightOverlays();
    return true;
  },

  toggleDoor(x, y) {
    if (MAP[y] && !this.isDoorTile(x, y)) return;
    const d = this.getDoorState(x, y);
    this.setDoorOpen(x, y, !d.open, false);
  },
};

Object.assign(GameScene.prototype, GameSceneDoorSystem);
