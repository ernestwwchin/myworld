// Fog of war, visibility, and lighting system extracted from GameScene.
const GameSceneFogSystem = {
  computeVisibleTiles() {
    const vis = Array.from({length: ROWS}, () => Array(COLS).fill(false));
    const r = Math.max(1, Number(FOG_RULES.radius || 7));
    const px = this.playerTile.x, py = this.playerTile.y;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const tx = px + dx, ty = py + dy;
        if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
        if (Math.sqrt(dx * dx + dy * dy) > r + 0.35) continue;
        if (hasLOS(px, py, tx, ty)) vis[ty][tx] = true;
      }
    }
    return vis;
  },

  updateFogOfWar() {
    if (!this.fogLayer) return;
    this.fogLayer.clear();
    if (FOG_RULES.enabled === false) return;

    this.fogVisible = this.computeVisibleTiles();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.fogVisible[y][x]) this.fogVisited[y][x] = true;
      }
    }

    const darkAlpha = Math.max(0, Math.min(1, Number(FOG_RULES.unvisitedAlpha ?? 0.78)));
    const memAlpha = Math.max(0, Math.min(1, Number(FOG_RULES.exploredAlpha ?? 0.48)));
    const memColor = Number(FOG_RULES.exploredColor ?? 0x3a3f46);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.fogVisible[y][x]) continue;
        if (this.fogVisited[y][x]) this.fogLayer.fillStyle(memColor, memAlpha);
        else this.fogLayer.fillStyle(0x000000, darkAlpha);
        this.fogLayer.fillRect(x * S, y * S, S, S);
      }
    }

    this.updateEnemyVisibilityByFog();
  },

  updateEnemyVisibilityByFog() {
    if (!this.isExploreMode()) return;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const visible = this.isTileVisibleToPlayer(e.tx, e.ty);
      const a = visible ? 1 : 0;
      if (e.img) e.img.setAlpha(a);
      if (e.hpBg) e.hpBg.setAlpha(a);
      if (e.hpFg) e.hpFg.setAlpha(a);
      if (e.lbl) e.lbl.setAlpha(visible ? 0.7 : 0);
      if (e.fa) e.fa.setAlpha(a);
    }
  },

  isTileVisibleToPlayer(tx, ty) {
    if (this.fogVisible && this.fogVisible[ty] && typeof this.fogVisible[ty][tx] === 'boolean') {
      return this.fogVisible[ty][tx];
    }
    return hasLOS(this.playerTile.x, this.playerTile.y, tx, ty);
  },

  tileLightLevel(tx, ty) {
    let level = this.globalLight === 'bright' ? 2 : this.globalLight === 'dim' ? 1 : 0;
    for (const l of this.mapLights) {
      const dx = tx - Number(l.x), dy = ty - Number(l.y);
      const d = Math.sqrt(dx * dx + dy * dy);
      const r = Math.max(1, Number(l.radius || 3));
      if (d > r + 0.25) continue;
      const lv = (String(l.level || 'dim').toLowerCase() === 'bright') ? 2 : 1;
      if (lv > level) level = lv;
      if (level === 2) break;
    }
    return level;
  },

  syncEnemySightRings(show) {
    for (const e of this.enemies) {
      if (!e.sightRing || !e.alive || e.inCombat) {
        if (e.sightRing) e.sightRing.setAlpha(0);
        continue;
      }
      const r = this.effectiveEnemySight(e);
      if (typeof e.sightRing.setRadius === 'function') e.sightRing.setRadius(r * S);
      e.sightRing.setAlpha(show ? 0.3 : 0);
    }
  },

  effectiveEnemySight(enemy) {
    const scale = Number(COMBAT_RULES.enemySightScale || 1);
    let s = Math.max(1, Math.round(enemy.sight * scale));
    const light = this.tileLightLevel(this.playerTile.x, this.playerTile.y);
    if (light === 0) s -= Number(LIGHT_RULES.darkSightPenalty || 3);
    else if (light === 1) s -= Number(LIGHT_RULES.dimSightPenalty || 1);
    if (this.playerHidden) s -= Number(LIGHT_RULES.hiddenSightPenalty || 2);
    return Math.max(1, s);
  },
};

Object.assign(GameScene.prototype, GameSceneFogSystem);
