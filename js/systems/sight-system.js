// Sight overlays, enemy detection, and detection markers extracted from GameScene.
const GameSceneSightSystem = {
  drawSightOverlays() {
    this.clearSightOverlays();
    if (!this.isExploreMode() || !this.enemySightEnabled) {
      this.syncEnemySightRings(false);
      return;
    }
    this.syncEnemySightRings(true);
    for (const e of this.enemies) {
      if (!e.alive || e.inCombat) continue;
      const g = this.add.graphics().setDepth(2);
      const r = this.effectiveEnemySight(e);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = e.tx + dx, ty = e.ty + dy;
          if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
          if (this.isWallTile(tx, ty)) continue;
          if (Math.sqrt(dx * dx + dy * dy) > r + 0.5) continue;
          if (!inFOV(e, tx, ty)) continue;
          if (!hasLOS(e.tx, e.ty, tx, ty)) continue;
          const fade = 1 - (Math.sqrt(dx * dx + dy * dy) / r) * 0.75;
          g.fillStyle(0xffe8a0, fade * 0.06);
          g.fillRect(tx * S, ty * S, S, S);
        }
      }
      this.sightTiles.push(g);
    }
  },

  clearSightOverlays() {
    this.sightTiles.forEach(t => t.destroy());
    this.sightTiles = [];
    this.syncEnemySightRings(false);
  },

  checkSight() {
    if (!this.isExploreMode()) return;
    const seenBy = this.enemies.filter(e => {
      if (!e.alive || e.inCombat) return false;
      const dist = Math.sqrt((e.tx - this.playerTile.x) ** 2 + (e.ty - this.playerTile.y) ** 2);
      if (dist > this.effectiveEnemySight(e)) return false;
      if (!inFOV(e, this.playerTile.x, this.playerTile.y)) return false;
      return hasLOS(e.tx, e.ty, this.playerTile.x, this.playerTile.y);
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
    if (this.enemySightEnabled && this.isExploreMode()) this.drawSightOverlays();
    else {
      this.clearSightOverlays();
      this.syncEnemySightRings(false);
    }
    this.showStatus(this.enemySightEnabled ? 'Enemy sight overlays ON.' : 'Enemy sight overlays OFF.');
    return this.enemySightEnabled;
  },

  clearDetectMarkers() {
    this.detectMarkers.forEach(m => { if (m && m.destroy) m.destroy(); });
    this.detectMarkers = [];
  },

  showDetectedEnemyMarker(enemy) {
    if (!enemy || !enemy.alive) return;
    const x = enemy.tx * S + S / 2, y = enemy.ty * S + S / 2;

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
