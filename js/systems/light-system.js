// Shared light-level calculations used by fog, sight, and ability systems.
const GameSceneLightSystem = {
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
};

Object.assign(GameScene.prototype, GameSceneLightSystem);
