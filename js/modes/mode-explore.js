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
    this.setDestination(tx, ty, null, ptr ? {wx: ptr.worldX, wy: ptr.worldY} : null);
  },

  updateExplore(delta) {
    // Continuous WASD movement — pixel-based, not tile-snapping
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
    // Re-follow player if camera was panned away
    if (this._ensureCamFollow) this._ensureCamFollow();

    // Cancel any active path movement — keyboard takes over
    if (this.isMoving) {
      this.tweens.killTweensOf(this.player);
      this.movePath = []; this.isMoving = false; this.clearPathDots();
    }

    // Normalize diagonal so speed is equal in all directions
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;

    const speed = this.playerHidden ? MOVE_SPEED_SNK : MOVE_SPEED;
    const px = dx * speed * (delta / 1000);
    const py = dy * speed * (delta / 1000);

    const newX = this.player.x + px;
    const newY = this.player.y + py;

    // Collision: check target tile + slide along walls
    const margin = 6; // px from tile edge for collision
    const checkBlock = (wx, wy) => {
      const t = worldToTile(wx, wy);
      if (t.x < 0 || t.y < 0 || t.x >= COLS || t.y >= ROWS) return true;
      return this.isBlockedTile(t.x, t.y, { doorMode: 'closed' });
    };

    let finalX = this.player.x, finalY = this.player.y;

    // Try full move
    if (!checkBlock(newX, newY)) {
      finalX = newX; finalY = newY;
    } else {
      // Slide: try X only
      if (px !== 0 && !checkBlock(this.player.x + px, this.player.y)) {
        finalX = this.player.x + px;
      }
      // Slide: try Y only
      if (py !== 0 && !checkBlock(this.player.x, this.player.y + py)) {
        finalY = this.player.y + py;
      }
    }

    // Additional corner collision checks (check player bounding box corners)
    const hw = S / 2 - margin, hh = S / 2 - margin;
    const corners = [
      { x: finalX - hw, y: finalY - hh },
      { x: finalX + hw, y: finalY - hh },
      { x: finalX - hw, y: finalY + hh },
      { x: finalX + hw, y: finalY + hh },
    ];
    const blocked = corners.some(c => checkBlock(c.x, c.y));
    if (blocked) {
      // Try X-only slide with corner check
      const cX = [
        { x: this.player.x + px - hw, y: this.player.y - hh },
        { x: this.player.x + px + hw, y: this.player.y - hh },
        { x: this.player.x + px - hw, y: this.player.y + hh },
        { x: this.player.x + px + hw, y: this.player.y + hh },
      ];
      if (px !== 0 && !cX.some(c => checkBlock(c.x, c.y))) {
        finalX = this.player.x + px; finalY = this.player.y;
      } else {
        // Try Y-only slide with corner check
        const cY = [
          { x: this.player.x - hw, y: this.player.y + py - hh },
          { x: this.player.x + hw, y: this.player.y + py - hh },
          { x: this.player.x - hw, y: this.player.y + py + hh },
          { x: this.player.x + hw, y: this.player.y + py + hh },
        ];
        if (py !== 0 && !cY.some(c => checkBlock(c.x, c.y))) {
          finalX = this.player.x; finalY = this.player.y + py;
        } else {
          finalX = this.player.x; finalY = this.player.y;
        }
      }
    }

    if (finalX === this.player.x && finalY === this.player.y) return;

    this.player.x = finalX;
    this.player.y = finalY;

    // Update tile position for game logic
    const newTile = worldToTile(finalX, finalY);
    if (newTile.x !== this.playerTile.x || newTile.y !== this.playerTile.y) {
      this.playerTile = { x: newTile.x, y: newTile.y };
      this.lastCompletedTile = { x: newTile.x, y: newTile.y };
      this.updateFogOfWar();
      try { if (typeof EventRunner !== 'undefined') EventRunner.onPlayerTile(newTile.x, newTile.y); } catch (_e) {}
      if (typeof this.checkFloorItemPickup === 'function') this.checkFloorItemPickup();

      // Auto-open doors
      if (this.isDoorTile(newTile.x, newTile.y) && DOOR_RULES.autoOpenOnPass) {
        this.setDoorOpen(newTile.x, newTile.y, true, true);
      }

      // Stairs
      const tileVal = MAP[newTile.y]?.[newTile.x];
      if (tileVal === TILE.STAIRS) {
        const nextStage = window._MAP_META?.nextStage;
        if (nextStage) {
          this.showStatus('Descending to the next floor...');
          this.time.delayedCall(300, () => ModLoader.transitionToStage(nextStage, this));
          return;
        }
      }

      // Sight checks (combat trigger)
      if (this.isExploreMode()) this.checkSight();
      if (this.mode === MODE.COMBAT) return; // combat was triggered, stop keyboard move
    }

    this.playActorMove(this.player, 'player', true);
    this._wasdMoving = true;
    this.updateHUD();
  },

  // Called from update loop — detect when WASD keys released to play idle
  _checkWasdIdle() {
    if (!this._wasdMoving) return;
    const anyKey = this.cursors.left.isDown || this.wasd.left.isDown
      || this.cursors.right.isDown || this.wasd.right.isDown
      || this.cursors.up.isDown || this.wasd.up.isDown
      || this.cursors.down.isDown || this.wasd.down.isDown;
    if (!anyKey) {
      this._wasdMoving = false;
      this.playActorIdle(this.player, 'player');
    }
  },

  // Hold-to-move: take one BFS step toward the held pointer position
  _holdMoveStep(){
    const tx=Math.floor(this._holdWorldX/S), ty=Math.floor(this._holdWorldY/S);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return;
    if(tx===this.playerTile.x&&ty===this.playerTile.y) return;
    const blk=(x,y)=>this.isBlockedTile(x,y);
    const path=bfs(this.playerTile.x,this.playerTile.y,tx,ty,blk);
    if(!path.length) return;
    this.movePath=[path[0]];
    this.isMoving=true;
    this.advancePath();
  },

});
