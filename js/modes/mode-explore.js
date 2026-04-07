// ═══════════════════════════════════════════════════════
// mode-explore.js — Real-time explore mode controller
// Tap handling, keyboard movement for explore mode
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  onTapExplore(tx, ty, enemy, ptr) {
    // Attack targeting mode: click enemy → initiate combat
    if (this.pendingAction === 'attack' && enemy && enemy.alive) {
      this.clearPendingAction();
      if (typeof this.tryEngageEnemyFromExplore === 'function') {
        this.tryEngageEnemyFromExplore(enemy);
      } else {
        this.enterCombat([enemy]);
      }
      return;
    }
    // Clicking empty tile while in attack targeting → cancel
    if (this.pendingAction === 'attack' && !enemy) {
      this.clearPendingAction();
      this.showStatus('Attack cancelled.');
      return;
    }

    const ents = this.getEntitiesAt(tx, ty);
    const hasEntity = ents.length > 0;

    // Enemy + entities on same tile → combined context menu
    if (enemy && hasEntity) {
      this.buildTileMenu(tx, ty, enemy, ptr);
      return;
    }
    if (enemy) { this.onTapEnemy(enemy); return; }
    // Entities only → auto-execute or entity context menu
    if (hasEntity) {
      const result = this.interactAtTile(tx, ty, { ptr });
      if (result) return;
    }
    if (this.isWallTile(tx, ty)) return;
    const pop = document.getElementById('enemy-stat-popup'); if (pop) pop.style.display = 'none';
    this._statPopupEnemy = null;
    this.setDestination(tx, ty);
  },

  updateExplore(delta) {
    if (this.isMoving) return;
    this.keyDelay -= delta;
    if (this.keyDelay > 0) return;

    let dx = 0, dy = 0;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    if (left) dx = -1;
    if (right) dx = 1;
    if (up) dy = -1;
    if (down) dy = 1;
    if (!dx && !dy) return;

    const nx = this.playerTile.x + dx, ny = this.playerTile.y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
    if (this.isWallTile(nx, ny)) return;
    if (this.isDoorTile(nx, ny) && this.isDoorClosed(nx, ny)) return;
    if (this.enemies.some(e => e.alive && e.tx === nx && e.ty === ny)) return;
    this.movePath = [{ x: nx, y: ny }]; this.isMoving = true; this.advancePath(); this.keyDelay = 140;
  },

});
