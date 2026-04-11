// ═══════════════════════════════════════════════════════
// world-position-system.js — World position utilities
// Bridges tile-based grid and continuous pixel positions.
// Phase 1+3 of the continuous-movement redesign.
// ═══════════════════════════════════════════════════════

/** Convert tile coords to pixel center: {x: tx*S+S/2, y: ty*S+S/2} */
function tileToWorld(tx, ty) {
  return { x: tx * S + S / 2, y: ty * S + S / 2 };
}

/** Convert pixel coords to tile coords: floor(wx/S), floor(wy/S) */
function worldToTile(wx, wy) {
  return { x: Math.floor(wx / S), y: Math.floor(wy / S) };
}

/** Euclidean tile distance between two tile coords */
function tileDist(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute total Euclidean tile-distance cost of a BFS path.
 * Path is an array of {x,y} tile coords (does NOT include startTile).
 */
function pathTileCost(path, startTile) {
  let cost = 0;
  let prev = startTile;
  for (const step of path) {
    cost += tileDist(prev.x, prev.y, step.x, step.y);
    prev = step;
  }
  return cost;
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
