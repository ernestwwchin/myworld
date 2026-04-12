// Sight overlays, enemy detection, and detection markers extracted from GameScene.
const GameSceneSightSystem = {

  _sightRangesByLight(enemy) {
    const scale = Number(COMBAT_RULES.enemySightScale || 1);
    const base = Math.max(1, Math.round(Number(enemy?.sight || 1) * scale));
    const dim = Math.max(1, base - Number(LIGHT_RULES.dimSightPenalty || 1));
    const dark = Math.max(1, base - Number(LIGHT_RULES.darkSightPenalty || 3));
    return { base, dim, dark };
  },

  _updateEnemySightDebugLabels(enabled) {
    for (const e of this.enemies) {
      if (!e || !e.lbl || !e.lbl.active) continue;
      const baseName = (e.displayName || e.type || '').toUpperCase();
      try {
        if (enabled) {
          const base = Number(e.sight || 0);
          const eff = this.effectiveEnemySight(e);
          e.lbl.setText(`${baseName} S:${base} E:${eff}`);
        } else {
          e.lbl.setText(baseName);
        }
      } catch (_) { /* destroyed mid-frame */ }
    }
  },

  // ── Core sight utilities ─────────────────────────────
  // Can enemy see a specific tile?
  // opts.checkFOV (default true) — include facing/FOV cone check
  // opts.useEffectiveSight (default true) — apply light/hidden sight penalties
  canEnemySeeTile(enemy, tx, ty, opts = {}) {
    if (!enemy || !enemy.alive) return false;
    const { checkFOV = true, useEffectiveSight = true } = opts;
    const dist = Math.sqrt((enemy.tx - tx) ** 2 + (enemy.ty - ty) ** 2);
    const sightRange = useEffectiveSight ? this.effectiveEnemySight(enemy) : enemy.sight;
    if (dist > sightRange) return false;
    if (checkFOV && !inFOV(enemy, tx, ty)) return false;
    return hasLOS(enemy.tx, enemy.ty, tx, ty);
  },

  canEnemySeePlayer(enemy) {
    return this.canEnemySeeTile(enemy, this.playerTile.x, this.playerTile.y);
  },

  drawSightOverlays() {
    this.clearSightOverlays();
    const inExplore = this.isExploreMode();
    const inCombat = this.mode === MODE.COMBAT;
    if ((!inExplore && !inCombat) || !this.enemySightEnabled) {
      this.syncEnemySightRings(false);
      this._updateEnemySightDebugLabels(false);
      return;
    }
    this._updateEnemySightDebugLabels(true);
    this.syncEnemySightRings(true, inCombat);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const g = this.add.graphics().setDepth(2);
      const { base, dim, dark } = this._sightRangesByLight(e);

      // Underlay: raw base sight radius by distance only (no FOV/LOS),
      // to make the configured sight value obvious in debug.
      const underlayAlpha = inCombat ? 0.03 : 0.04;
      g.fillStyle(0x6ec1ff, underlayAlpha);
      for (let dy = -base; dy <= base; dy++) {
        for (let dx = -base; dx <= base; dx++) {
          const tx = e.tx + dx, ty = e.ty + dy;
          if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
          if (this.isWallTile(tx, ty)) continue;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > base + 0.5) continue;
          g.fillRect(tx * S, ty * S, S, S);
        }
      }

      for (let dy = -base; dy <= base; dy++) {
        for (let dx = -base; dx <= base; dx++) {
          const tx = e.tx + dx, ty = e.ty + dy;
          if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
          if (this.isWallTile(tx, ty)) continue;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > base + 0.5) continue;
          if (!inFOV(e, tx, ty)) continue;
          if (!hasLOS(e.tx, e.ty, tx, ty)) continue;
          // Color bands by player-light requirement:
          // red   = detected even in DARK
          // amber = detected in DIM/BRIGHT
          // green = detected only in BRIGHT
          const combatScale = inCombat ? 0.85 : 1;
          if (dist <= dark + 0.5) g.fillStyle(0xff5a5a, 0.14 * combatScale);
          else if (dist <= dim + 0.5) g.fillStyle(0xffc857, 0.11 * combatScale);
          else g.fillStyle(0x7fd1a0, 0.09 * combatScale);
          g.fillRect(tx * S, ty * S, S, S);
        }
      }

      // If this enemy currently sees the player, draw a clear line indicator.
      if (this.canEnemySeePlayer(e)) {
        g.lineStyle(2, 0xfff176, 0.85);
        g.lineBetween(e.tx * S + S / 2, e.ty * S + S / 2, this.playerTile.x * S + S / 2, this.playerTile.y * S + S / 2);
      }

      this.sightTiles.push(g);
    }
  },

  clearSightOverlays() {
    for (const t of this.sightTiles) {
      try { if (t && t.active) t.destroy(); } catch (_) { /* already gone */ }
    }
    this.sightTiles = [];
    this.syncEnemySightRings(false);
    this._updateEnemySightDebugLabels(false);
  },

  checkSight() {
    if (!this.isExploreMode()) return;
    const seenBy = this.enemies.filter(e => {
      if (!e.alive || e.inCombat) return false;
      return this.canEnemySeePlayer(e);
    });
    if (!seenBy.length) return;

    // If hidden, run stealth contest instead of auto-combat
    if (this.playerHidden) {
      const { broken, spotters } = this.checkStealthVsEnemies(seenBy);
      if (!broken) return; // stayed hidden
      // Stealth broken → the spotters enter combat
      const combatants = spotters.map(s => s.enemy);
      this.enterCombat(combatants);
      return;
    }

    // Not hidden → normal detection
    this.enterCombat(seenBy);
  },

  toggleEnemySight() {
    this.enemySightEnabled = !this.enemySightEnabled;
    if (this.enemySightEnabled) {
      this.drawSightOverlays();
    } else {
      this.clearSightOverlays();
      this.syncEnemySightRings(false);
    }
    this.showStatus(this.enemySightEnabled
      ? 'Sight ON: blue=base range, red=dark detect, amber=dim detect, green=bright-only, yellow line=currently spotted.'
      : 'Enemy sight OFF.');
    return this.enemySightEnabled;
  },

  syncEnemySightRings(show, includeCombat = false) {
    for (const e of this.enemies) {
      if (!e.sightRing || !e.sightRing.active) continue;
      if (!e.alive || (!includeCombat && e.inCombat)) {
        try { e.sightRing.setAlpha(0); } catch (_) {}
        continue;
      }
      try {
        const r = this.effectiveEnemySight(e);
        if (typeof e.sightRing.setRadius === 'function') e.sightRing.setRadius(r * S);
        e.sightRing.setAlpha(show ? 0.3 : 0);
      } catch (_) { /* destroyed */ }
    }
  },

  effectiveEnemySight(enemy) {
    const scale = Number(COMBAT_RULES.enemySightScale || 1);
    let s = Math.max(1, Math.round(enemy.sight * scale));
    const playerLight = this.tileLightLevel(this.playerTile.x, this.playerTile.y);
    const enemyLight = this.tileLightLevel(enemy.tx, enemy.ty);
    // Use the brighter of observer/target lighting so enemies near torches
    // don't unrealistically lose most of their vision.
    const light = Math.max(playerLight, enemyLight);
    if (light === 0) s -= Number(LIGHT_RULES.darkSightPenalty || 3);
    else if (light === 1) s -= Number(LIGHT_RULES.dimSightPenalty || 1);
    if (this.playerHidden) s -= Number(LIGHT_RULES.hiddenSightPenalty || 2);
    return Math.max(1, s);
  },

  clearDetectMarkers() {
    this.detectMarkers.forEach(m => { if (m && m.destroy) m.destroy(); });
    this.detectMarkers = [];
  },

  showDetectedEnemyMarker(enemy) {
    if (!enemy || !enemy.alive) return;
    const _ew = this.enemyWorldPos(enemy);
    const x = _ew.x, y = _ew.y;

    // Expanding ring ping
    const ring = this.add.circle(x, y, S * 0.3, 0xf1c40f, 0.15).setDepth(18).setStrokeStyle(3, 0xf1c40f, 1);
    // Bold exclamation
    const ping = this.add.text(x, y - S * 0.5, '⚠', {fontSize: '22px', fill: '#f1c40f', stroke: '#000', strokeThickness: 4, fontStyle: 'bold'}).setOrigin(0.5).setDepth(19);
    this.detectMarkers.push(ring, ping);

    // Pulse ring 2 times, then expand and fade
    this.tweens.add({targets: ring, scaleX: 1.3, scaleY: 1.3, duration: 300, yoyo: true, repeat: 2, onComplete: () => {
      this.tweens.add({targets: ring, alpha: 0, scaleX: 2.2, scaleY: 2.2, duration: 800, onComplete: () => { if (ring && ring.destroy) ring.destroy(); }});
    }});
    // Float the exclamation up then fade
    this.tweens.add({targets: ping, y: y - S * 0.7, duration: 400, ease: 'Back.easeOut'});
    this.tweens.add({targets: ping, alpha: 0, delay: 1800, duration: 600, onComplete: () => { if (ping && ping.destroy) ping.destroy(); }});

    // Briefly flash the enemy sprite
    if (enemy.img) {
      const prevDepth = enemy.img.depth;
      const prevAlpha = enemy.img.alpha;
      enemy.img.setDepth(17).setAlpha(0.9);
      this.tweens.add({targets: enemy.img, alpha: 0.5, duration: 300, yoyo: true, repeat: 2, onComplete: () => {
        if (enemy.img && enemy.img.active) { enemy.img.setDepth(prevDepth).setAlpha(prevAlpha); }
      }});
    }
  },
  // ─────────────────────────────────────────
  // STEALTH VISUALS
  // ─────────────────────────────────────────
  showStealthVisuals() {
    this.player.setAlpha(0.4);
    if (this._shadowPlayer) this._shadowPlayer.destroy();
    const shx = this.playerTile.x * S + S / 2;
    const shy = this.playerTile.y * S + S / 2;
    this._shadowPlayer = this.add.sprite(shx, shy, 'player_atlas', 'idle_0');
    this._shadowPlayer.setAlpha(0.2);
    this._shadowPlayer.setTint(0x6666ff);
    this._shadowPlayer.setDepth(100);
  },

  clearStealthVisuals() {
    this.player.setAlpha(1);
    if (this._shadowPlayer) { this._shadowPlayer.destroy(); this._shadowPlayer = null; }
  },
};

Object.assign(GameScene.prototype, GameSceneSightSystem);
