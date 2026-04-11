// ═══════════════════════════════════════════════════════
// world-position-system.js — World position utilities
// Bridges tile-based grid and continuous pixel positions.
// Phase 1 of the continuous-movement redesign.
// ═══════════════════════════════════════════════════════

/** Convert tile coords to pixel center: {x: tx*S+S/2, y: ty*S+S/2} */
function tileToWorld(tx, ty) {
  return { x: tx * S + S / 2, y: ty * S + S / 2 };
}

/** Convert pixel coords to tile coords: floor(wx/S), floor(wy/S) */
function worldToTile(wx, wy) {
  return { x: Math.floor(wx / S), y: Math.floor(wy / S) };
}

Object.assign(GameScene.prototype, {

  /** Light level at a world position (delegates to tile-based lookup) */
  worldLightLevel(wx, wy) {
    const t = worldToTile(wx, wy);
    return this.tileLightLevel(t.x, t.y);
  },

  /** Return {x,y} world-pixel center for the player */
  playerWorldPos() {
    return { x: this.player.x, y: this.player.y };
  },

  /** Return {x,y} world-pixel center for an enemy */
  enemyWorldPos(enemy) {
    return { x: enemy.img.x, y: enemy.img.y };
  },

});
