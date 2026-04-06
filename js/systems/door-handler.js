// ═══════════════════════════════════════════════════════
// door-handler.js — Door scene-level side effects
// Entity sprite updates, fog recalc, state queries.
// Entity data lives in DoorEntity; this file handles
// the scene integration that requires Phaser APIs.
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  getDoorEntity(x, y) {
    return this.doorEntities[this._entityKey(x, y)] || null;
  },

  getDoorState(x, y) {
    const ent = this.getDoorEntity(x, y);
    if (ent) return { open: !!ent.open, locked: !!ent.locked, auto: !!ent.auto };
    return { open: false, locked: false, auto: !!DOOR_RULES.defaultAuto };
  },

  isDoorClosed(x, y) {
    const ent = this.getDoorEntity(x, y);
    return ent ? !ent.open : false;
  },

  isDoorPassable(x, y) {
    const ent = this.getDoorEntity(x, y);
    if (!ent) return true;
    return ent.open || !ent.locked;
  },

  refreshDoorTile(x, y) {
    const ent = this.getDoorEntity(x, y);
    if (ent) this._updateEntitySprite(ent);
  },

  refreshDoorTiles() {
    for (const ent of this.entities) {
      if (ent.kind === 'door') this._updateEntitySprite(ent);
    }
  },

  setDoorOpen(x, y, open, silent) {
    const ent = this.getDoorEntity(x, y);
    if (!ent) return false;

    const result = ent.setOpen(this, !!open, { silent: !!silent, actor: 'player' });
    if (!result.ok) return false;

    this._updateEntitySprite(ent);
    if (!silent && result.changed) {
      const msg = ent.open ? 'Door opened.' : 'Door closed.';
      this.showStatus(msg);
      if (this.log) this.log('DOOR', `${msg} at (${x},${y})`);
    }
    this.updateFogOfWar();
    if (this.mode === MODE.EXPLORE) this.drawSightOverlays();
    return true;
  },

  toggleDoor(x, y) {
    const ent = this.getDoorEntity(x, y);
    if (ent) this.setDoorOpen(x, y, !ent.open, false);
  },

});
