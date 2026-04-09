// ═══════════════════════════════════════════════════════
// chest-handler.js — Chest scene-level side effects
// Tile refresh, glow VFX, BG3-style opening sequence,
// loot resolution display. Entity data lives in
// ChestEntity; this file handles Phaser integration.
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  getChestEntity(x, y) {
    return this.chestEntities[this._entityKey(x, y)] || null;
  },

  refreshChestTile(x, y) {
    const ent = this.getChestEntity(x, y);
    if (ent) this._updateEntitySprite(ent);
  },

  refreshChestTiles() {
    for (const ent of this.entities) {
      if (ent.kind === 'chest') this._updateEntitySprite(ent);
    }
  },

  // BG3-style golden pulsing glow on unopened chests
  initChestGlows() {
    if (!this._chestGlows) this._chestGlows = {};
    for (const ent of this.entities) {
      if (!(ent instanceof ChestEntity) || ent.open) continue;
      const cx = ent.x * S + S / 2, cy = ent.y * S + S / 2;
      const glow = this.add.graphics().setDepth(2).setAlpha(0.35);
      glow.fillStyle(0xd4a857, 0.25);
      glow.fillCircle(cx, cy, S * 0.55);
      glow.lineStyle(1, 0xf0c060, 0.4);
      glow.strokeCircle(cx, cy, S * 0.5);
      this.tweens.add({
        targets: glow, alpha: 0.12,
        duration: 1200 + Math.random() * 400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this._chestGlows[this._entityKey(ent.x, ent.y)] = glow;
    }
  },

  _removeChestGlow(x, y) {
    const key = this._entityKey(x, y);
    const glow = this._chestGlows?.[key];
    if (glow) {
      this.tweens.add({
        targets: glow, alpha: 0, duration: 300,
        onComplete: () => glow.destroy(),
      });
      delete this._chestGlows[key];
    }
  },

  tryOpenChest(x, y) {
    const ent = this.getChestEntity(x, y);
    if (!ent) return false;
    if (ent.open) { this.showStatus('Chest already opened.'); return false; }

    const result = ent.tryOpen(this, { actor: 'player' });
    if (!result.ok) return false;

    // BG3-style opening sequence
    this._removeChestGlow(x, y);
    const cx = x * S + S / 2, cy = y * S + S / 2;

    // 1. Brief camera focus on chest
    this.cameras.main.stopFollow();
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: cx - this.cameras.main.width / 2,
      scrollY: cy - this.cameras.main.height / 2,
      duration: 300, ease: 'Sine.easeOut',
      onComplete: () => this.cameras.main.startFollow(this.player, true, 0.15, 0.15),
    });

    // 2. Golden flash ring expanding outward
    const ring = this.add.graphics().setDepth(25);
    ring.lineStyle(3, 0xd4a857, 0.9);
    ring.strokeCircle(cx, cy, 4);
    this.tweens.add({
      targets: { r: 4 }, r: S * 1.2,
      duration: 500, ease: 'Cubic.easeOut',
      onUpdate: (tw, t) => {
        ring.clear();
        const a = 0.9 * (1 - tw.progress);
        ring.lineStyle(3 - tw.progress * 2, 0xd4a857, a);
        ring.strokeCircle(cx, cy, t.r);
      },
      onComplete: () => ring.destroy(),
    });

    // 3. Golden sparkle particles bursting up
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.4;
      const dist = 8 + Math.random() * 18;
      const px = cx + Math.cos(angle) * 4;
      const py = cy + Math.sin(angle) * 4;
      const spark = this.add.text(px, py, '✦', {
        fontSize: `${8 + Math.floor(Math.random() * 7)}px`,
        fill: Math.random() > 0.4 ? '#f0c060' : '#ffe8a0',
      }).setOrigin(0.5).setDepth(26).setAlpha(0);

      this.tweens.add({
        targets: spark,
        x: px + Math.cos(angle) * dist,
        y: py + Math.sin(angle) * dist - 16 - Math.random() * 20,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.2, to: 0.3 },
        duration: 500 + Math.random() * 400,
        delay: 80 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    // 4. Chest sprite swap with brief scale pop
    this.time.delayedCall(150, () => {
      this._updateEntitySprite(ent);
      if (ent.sprite) {
        ent.sprite.setScale(1.15);
        this.tweens.add({ targets: ent.sprite, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
      }
    });

    // 5. Resolve loot (fixed + random from loot table) and show staggered float text
    const tables = (window._MAP_META && window._MAP_META.lootTables) || {};
    const resolved = ent.resolveLoot(tables);
    const rewards = [];
    if (resolved.gold > 0) {
      this.pStats.gold = (this.pStats.gold || 0) + resolved.gold;
      rewards.push({ text: `+${resolved.gold} gold`, color: '#f0c060' });
    }
    for (const item of resolved.items) {
      const icon = item.icon ? `${item.icon} ` : '';
      rewards.push({ text: `${icon}${item.name || item.id || 'item'}`, color: '#a8e6cf' });
      // Gems/valuables with a value field go straight to gold; all other items go to inventory
      if (item.type === 'gem' && item.value) {
        this.pStats.gold = (this.pStats.gold || 0) + item.value;
      } else {
        if (!Array.isArray(this.pStats.inventory)) this.pStats.inventory = [];
        this.pStats.inventory.push({ ...item });
      }
    }
    if (typeof SidePanel !== 'undefined' && SidePanel._activeTab === 'inventory') SidePanel.refresh();
    if (typeof Hotbar !== 'undefined') Hotbar.refreshItems();

    if (rewards.length) {
      rewards.forEach((r, i) => {
        this.time.delayedCall(400 + i * 280, () => {
          const ft = this.add.text(cx, cy - 8, r.text, {
            fontSize: '14px', fill: r.color,
            stroke: '#000', strokeThickness: 3, fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(30).setAlpha(0).setScale(0.5);
          this.tweens.add({
            targets: ft,
            y: cy - 30 - i * 18,
            alpha: { from: 0, to: 1 },
            scale: { from: 0.5, to: 1 },
            duration: 350, ease: 'Back.easeOut',
          });
          this.tweens.add({
            targets: ft,
            alpha: 0, y: ft.y - 20,
            delay: 1200, duration: 500, ease: 'Power2',
            onComplete: () => ft.destroy(),
          });
        });
      });
    } else {
      this.time.delayedCall(400, () => this.spawnFloat(cx, cy, 'Empty', '#888'));
    }

    // 6. Warm golden screen tint flash
    const vignette = this.add.rectangle(
      this.cameras.main.scrollX + this.cameras.main.width / 2,
      this.cameras.main.scrollY + this.cameras.main.height / 2,
      this.cameras.main.width, this.cameras.main.height,
      0xd4a857, 0
    ).setDepth(50).setScrollFactor(0);
    this.tweens.add({
      targets: vignette, alpha: 0.08, duration: 200, yoyo: true,
      onComplete: () => vignette.destroy(),
    });

    const names = rewards.map(r => r.text).join(', ');
    const msg = rewards.length ? `Chest opened! Found: ${names}.` : 'Chest opened! Empty.';
    this.showStatus(msg);
    if (this.log) this.log('CHEST', `${msg} at (${x},${y})`);
    this.updateHUD();
    return true;
  },

});
