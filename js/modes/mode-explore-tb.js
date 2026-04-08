// ═══════════════════════════════════════════════════════
// mode-explore-tb.js — Turn-based explore mode controller
// Toggle, player/enemy phases, tap handling, keyboard
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  toggleExploreTurnBased() {
    if (this.mode === MODE.COMBAT) {
      this.showStatus('Already in combat turn-based mode.');
      return this.mode;
    }
    // If user manually toggles TB, take over from auto-TB targeting
    if(this._targetingAutoTB) this._targetingAutoTB=false;
    this._manualExploreTurnBased = !this._manualExploreTurnBased;
    this.mode = this._manualExploreTurnBased ? MODE.EXPLORE_TB : MODE.EXPLORE;
    const badge = document.getElementById('mode-badge');
    if (badge) {
      if (this.mode === MODE.EXPLORE_TB) {
        badge.className = 'turnbased';
        badge.textContent = 'TURN-BASED';
      } else {
        badge.className = 'realtime';
        badge.textContent = 'EXPLORE';
      }
    }
    if (this.mode === MODE.EXPLORE_TB) this.beginExploreTurnBasedPlayerTurn();
    else {
      this._exploreTBEnemyPhase = false;
      this._exploreTBMovesRemaining = 0;
      this._exploreTBInputLatch = false;
    }
    this.drawSightOverlays();
    this.updateFogOfWar();
    this.showStatus(this.mode === MODE.EXPLORE_TB ? 'Turn-based exploration enabled.' : 'Turn-based exploration disabled.');
    return this.mode;
  },

  beginExploreTurnBasedPlayerTurn() {
    if (this.mode !== MODE.EXPLORE_TB) return;
    this._exploreTBEnemyPhase = false;
    this._exploreTBMovesRemaining = 1;
    this._exploreTBInputLatch = false;
    this.showStatus('Turn-based explore: your move.');
  },

  endExploreTurnBasedPlayerTurn() {
    if (this.mode !== MODE.EXPLORE_TB) return;
    if (this._exploreTBEnemyPhase) return;
    this._exploreTBMovesRemaining = 0;
    this.runExploreTurnBasedEnemyPhase();
  },

  runExploreTurnBasedEnemyPhase() {
    if (this.mode !== MODE.EXPLORE_TB) return;
    if (this._exploreTBEnemyPhase) return;
    this._exploreTBEnemyPhase = true;
    this.showStatus('Turn-based explore: enemy movement...');
    this.wanderEnemies(true);
    this.time.delayedCall(520, () => {
      if (this.mode !== MODE.EXPLORE_TB) return;
      this._exploreTBEnemyPhase = false;
      this._exploreTBMovesRemaining = 1;
      this.checkSight();
      if (this.mode === MODE.EXPLORE_TB) this.showStatus('Turn-based explore: your move.');
    });
  },

  onTapExploreTB(tx, ty, enemy, ptr) {
    if (this._exploreTBEnemyPhase) { this.showStatus('Enemy phase in progress...'); return; }
    const ents = this.getEntitiesAt(tx, ty);
    const hasEntity = ents.length > 0;

    // Enemy + entities on same tile → combined context menu (end turn after entity action)
    if (enemy && hasEntity) {
      this.buildTileMenu(tx, ty, enemy, ptr, () => this.endExploreTurnBasedPlayerTurn());
      return;
    }
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
    if (this.pendingAction === 'attack' && !enemy) {
      this.clearPendingAction();
      this.showStatus('Attack cancelled.');
      return;
    }
    if (enemy) { this.onTapEnemy(enemy); return; }
    // Entities only → auto-execute or entity context menu
    if (hasEntity) {
      const result = this.interactAtTile(tx, ty, { ptr });
      if (result && result !== 'blocked') { this.endExploreTurnBasedPlayerTurn(); return; }
      if (result === 'blocked' || result === 'menu') return;
    }
    if (this.isWallTile(tx, ty)) return;
    if (this._exploreTBMovesRemaining <= 0) { this.showStatus('No movement left this turn.'); return; }
    if (this.enemies.some(e => e.alive && e.tx === tx && e.ty === ty)) { this.showStatus('Cannot move onto an enemy tile.'); return; }
    const blk = (x, y) => this.isWallTile(x, y) || (this.isDoorTile(x, y) && !this.isDoorPassable(x, y)) || this.enemies.some(e => e.alive && e.tx === x && e.ty === y);
    const path = bfs(this.playerTile.x, this.playerTile.y, tx, ty, blk);
    if (!path.length) { this.showStatus('Cannot reach that tile.'); return; }
    const step = path[0];
    this.setDestination(step.x, step.y, () => this.endExploreTurnBasedPlayerTurn());
  },

  updateExploreTB(delta) {
    if (this.isMoving) return;
    this.keyDelay -= delta;
    if (this.keyDelay > 0) return;

    let dx = 0, dy = 0;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    const anyDir = left || right || up || down;
    if (!anyDir) { this._exploreTBInputLatch = false; return; }
    if (this._exploreTBInputLatch) { this.keyDelay = 80; return; }
    this._exploreTBInputLatch = true;

    if (left) dx = -1;
    if (right) dx = 1;
    if (up) dy = -1;
    if (down) dy = 1;
    if (!dx && !dy) return;

    if (this._exploreTBEnemyPhase || this._exploreTBMovesRemaining <= 0) { this.keyDelay = 140; return; }
    const nx = this.playerTile.x + dx, ny = this.playerTile.y + dy;
    // Diagonal: block if both cardinal neighbours are walls (corner cut)
    if (dx !== 0 && dy !== 0) {
      const hBlocked = this.isWallTile(nx, this.playerTile.y) || (this.isDoorTile(nx, this.playerTile.y) && this.isDoorClosed(nx, this.playerTile.y));
      const vBlocked = this.isWallTile(this.playerTile.x, ny) || (this.isDoorTile(this.playerTile.x, ny) && this.isDoorClosed(this.playerTile.x, ny));
      if (hBlocked && vBlocked) { this.keyDelay = 140; return; }
    }
    const blocked = nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || this.isWallTile(nx, ny) ||
      (this.isDoorTile(nx, ny) && this.isDoorClosed(nx, ny)) ||
      this.enemies.some(e => e.alive && e.tx === nx && e.ty === ny);
    if (!blocked) {
      this.setDestination(nx, ny, () => this.endExploreTurnBasedPlayerTurn());
      this.keyDelay = 180;
    }
  },

});
