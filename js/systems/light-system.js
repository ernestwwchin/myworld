// Shared light-level calculations used by fog, sight, and ability systems.
const GameSceneLightSystem = {
  hasPlayerLightSource() {
    const p = this.pStats || {};
    const inv = Array.isArray(p.inventory) ? p.inventory : [];
    const eq = [p.equippedWeapon, p.equippedArmor].filter(Boolean);
    const pool = [...inv, ...eq];
    const keys = ['torch', 'lantern', 'light'];
    return pool.some((it) => {
      const id = String(it?.id || '').toLowerCase();
      const name = String(it?.name || '').toLowerCase();
      return keys.some(k => id.includes(k) || name.includes(k));
    });
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
    // Fallback: stage torch sprites can contribute light even when mapLights are absent.
    if (Array.isArray(this.stageSprites)) {
      for (const sp of this.stageSprites) {
        if (!sp || !sp.active || !sp._stageLit) continue;
        if (sp._stageType !== 'torch') continue;
        const r = Math.max(0, Number(sp._stageLightRadius || 0));
        if (r <= 0) continue;
        const sx = Math.round((sp.x - S / 2) / S);
        const sy = Math.round((sp.y - S / 2) / S);
        const dx = tx - sx, dy = ty - sy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > r + 0.25) continue;
        const lv = String(sp._stageLightLevel || 'bright') === 'bright' ? 2 : 1;
        if (lv > level) level = lv;
        if (level === 2) break;
      }
    }
    return level;
  },
};

Object.assign(GameScene.prototype, GameSceneLightSystem);
