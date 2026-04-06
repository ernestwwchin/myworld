const GameSceneCombatInitSystem = {
  findApproachPathToEnemy(enemy, maxSteps = Number.POSITIVE_INFINITY) {
    if (!enemy || !enemy.alive) return null;
    const dirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
    ];
    const moveBlk = (x, y) =>
      this.isWallTile(x, y) ||
      (this.isDoorTile(x, y) && !this.isDoorPassable(x, y)) ||
      this.enemies.some((e) => e.alive && e.tx === x && e.ty === y);

    let best = null;
    for (const d of dirs) {
      const ax = enemy.tx + d.x;
      const ay = enemy.ty + d.y;
      if (ax < 0 || ay < 0 || ax >= COLS || ay >= ROWS) continue;
      if (this.isWallTile(ax, ay)) continue;
      if (this.isDoorTile(ax, ay) && !this.isDoorPassable(ax, ay)) continue;
      if (this.enemies.some((e) => e.alive && e.tx === ax && e.ty === ay)) continue;

      const p = bfs(this.playerTile.x, this.playerTile.y, ax, ay, moveBlk);
      if (!p.length) continue;
      if (!best || p.length < best.path.length) best = { path: p, dest: { x: ax, y: ay } };
    }

    if (!best) return null;
    const allowed = Math.max(0, Number(maxSteps));
    if (Number.isFinite(allowed) && best.path.length > allowed) {
      if (allowed === 0) return null;
      const partial = best.path.slice(0, allowed);
      return { path: partial, dest: partial[partial.length - 1], partial: true };
    }
    return { ...best, partial: false };
  },

  _isEnemyAwareOfPlayer(enemy) {
    if (!enemy || !enemy.alive) return false;
    const dist = Math.sqrt((enemy.tx - this.playerTile.x) ** 2 + (enemy.ty - this.playerTile.y) ** 2);
    if (dist > this.effectiveEnemySight(enemy)) return false;
    if (!inFOV(enemy, this.playerTile.x, this.playerTile.y)) return false;
    return hasLOS(enemy.tx, enemy.ty, this.playerTile.x, this.playerTile.y);
  },

  _buildAlertedEnemySet(triggers, opts = {}) {
    const seeds = (triggers || []).filter((e) => e && e.alive);
    const alerted = new Set(seeds);

    if (opts.openerGroup) {
      for (const e of this.enemies) {
        if (e.alive && e.group && e.group === opts.openerGroup) alerted.add(e);
      }
    }

    const scriptedGroups = new Set([...alerted].map((e) => e.group).filter(Boolean));
    if (scriptedGroups.size) {
      for (const e of this.enemies) {
        if (e.alive && e.group && scriptedGroups.has(e.group)) alerted.add(e);
      }
    }

    const localSeeds = [...alerted];
    const roomMax = Math.max(1, Number(COMBAT_RULES.roomAlertMaxDistance || 8));
    const nearAnySeed = (e) => localSeeds.some((s) => Math.abs(e.tx - s.tx) + Math.abs(e.ty - s.ty) <= roomMax);

    for (const e of this.enemies) {
      if (!e.alive || alerted.has(e)) continue;
      if (!nearAnySeed(e)) continue;
      const dist = Math.sqrt((e.tx - this.playerTile.x) ** 2 + (e.ty - this.playerTile.y) ** 2);
      if (dist <= this.effectiveEnemySight(e) && inFOV(e, this.playerTile.x, this.playerTile.y) && hasLOS(e.tx, e.ty, this.playerTile.x, this.playerTile.y)) {
        alerted.add(e);
      }
    }

    const isSideNeighbor = (a, b) => Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty) === 1;
    for (const e of this.enemies) {
      if (!e.alive || alerted.has(e)) continue;
      if (!nearAnySeed(e)) continue;
      const shouldAlert = localSeeds.some((a) =>
        (sameRoom(e.tx, e.ty, a.tx, a.ty) && sameOpenArea(e.tx, e.ty, a.tx, a.ty, roomMax)) ||
        sideRoom(e.tx, e.ty, a.tx, a.ty) ||
        isSideNeighbor(e, a)
      );
      if (shouldAlert) {
        alerted.add(e);
      }
    }

    return alerted;
  },

  tryEngageEnemyFromExplore(enemy) {
    if (!enemy || !enemy.alive) return;
    if (!this.isExploreMode()) return;
    if (this.mode === MODE.EXPLORE_TB && this._exploreTBEnemyPhase) return;
    if (this.isMoving) return;

    // If already in melee adjacency, do not re-path to a different tile.
    const dx = Math.abs(this.playerTile.x - enemy.tx);
    const dy = Math.abs(this.playerTile.y - enemy.ty);
    if (dx <= 1 && dy <= 1) {
      this.executeEngageOpenerAttack(enemy);
      return;
    }

    const approach = this.findApproachPathToEnemy(enemy);
    if (!approach || !approach.path.length) {
      this.showStatus('Cannot path to this enemy.');
      return;
    }

    this._engageInProgress = true;
    this._suppressExploreSightChecks = true;
    this.clearPathDots();

    // Engage flow: move first, resolve opener hit next, then enter combat.
    this.setDestination(approach.dest.x, approach.dest.y, () => {
      this._engageInProgress = false;
      this._suppressExploreSightChecks = false;
      this.executeEngageOpenerAttack(enemy);
    });
  },

  executeEngageOpenerAttack(enemy) {
    if (!enemy || !enemy.alive || !this.isExploreMode()) return;

    const dx = Math.abs(this.playerTile.x - enemy.tx);
    const dy = Math.abs(this.playerTile.y - enemy.ty);
    if (dx > 1 || dy > 1) {
      this.showStatus('Not in melee range to open with attack.');
      return;
    }

    this.playerHidden = false;
    const strMod = dnd.mod(this.pStats.str);
    const atkRoll = dnd.roll(1, 20);
    const atkTotal = atkRoll + strMod + this.pStats.profBonus;
    const isCrit = atkRoll === 20;
    const isMiss = atkRoll === 1;
    const hits = isCrit || (!isMiss && atkTotal >= enemy.ac);

    if(this.logEvent) this.logEvent('COMBAT', 'OPENER_ATTACK', {
      enemy: enemy.type,
      roll: atkRoll,
      total: atkTotal,
      ac: enemy.ac,
      hit: hits,
      crit: isCrit
    });

    if (hits) {
      // Hit the enemy
      const dr = this.resolveAbilityDamage('attack', 'player', isCrit);
      const dmg = Math.max(1, dr.total);
      enemy.hp -= dmg;
      this.applyAbilityOnHitStatuses('attack', 'player', enemy);

      this.tweens.add({ targets: enemy.img, alpha: 0.15, duration: 80, yoyo: true, repeat: 3 });
      this.spawnFloat(enemy.tx * S + S / 2, enemy.ty * S, isCrit ? `CRIT ${dmg}` : `-${dmg}`, '#ffdd57');

      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      if (enemy.hpFg) {
        enemy.hpFg.setDisplaySize((S - 8) * ratio, 5);
        if (ratio < 0.4) enemy.hpFg.setFillStyle(0xe67e22);
        if (ratio < 0.15) enemy.hpFg.setFillStyle(0xe74c3c);
      }

      // If killed in opener, mark dead and still enter combat (combat will end immediately)
      if (enemy.hp <= 0) {
        enemy.alive = false;
        enemy.inCombat = true;  // Still mark as in-combat for combat system to process
        this.tweens.add({
          targets: [enemy.img, enemy.hpBg, enemy.hpFg, enemy.lbl, enemy.sightRing],
          alpha: 0,
          duration: 500,
          onComplete: () => {
            [enemy.img, enemy.hpBg, enemy.hpFg, enemy.lbl, enemy.sightRing, enemy.fa].forEach((o) => {
              if (o && o.destroy) o.destroy();
            });
          },
        });
        if (enemy.fa) this.tweens.add({ targets: enemy.fa, alpha: 0, duration: 300 });
        this.spawnFloat(enemy.tx * S + S / 2, enemy.ty * S - 10, 'DEFEATED!', '#f0c060');
        this.pStats.xp += enemy.xp || 50;
        this.checkLevelUp();
        this.showStatus(`${isCrit ? 'CRIT! ' : ''}Opener kill ${enemy.type}! Entering combat...`);
      } else {
        this.showStatus(`${isCrit ? 'CRIT! ' : ''}Opener hit ${enemy.type} for ${dmg}. Rolling initiative...`);
      }
    } else {
      // Miss the opener — still enter combat (BG3 behavior)
      this.tweens.add({ targets: enemy.img, x: enemy.img.x + 6, duration: 60, yoyo: true, repeat: 1 });
      this.showStatus(`Opener missed! Rolling initiative...`);
    }

    // In BG3, opener roll (hit or miss) rolls initiative and enters combat
    this.enterCombat([enemy], { openerGroup: enemy.group, surpriseFromOpener: true });
  },

  enterCombat(triggers, opts = {}) {
    if (this.mode === MODE.COMBAT) return;
    this._returnToExploreTB = this.mode === MODE.EXPLORE_TB;
    this.mode = MODE.COMBAT;
    
    if(this.logEvent) this.logEvent('COMBAT', 'COMBAT_START', {
      triggerCount: triggers?.length || 0,
      surprise: opts.surpriseFromOpener
    });
    
    this.tweens.killTweensOf(this.player);
    this.movePath = [];
    this.isMoving = false;
    this.clearPathDots();
    this.onArrival = null;
    this.diceWaiting = false;
    this._afterPlayerDice = null;
    const snapTile = this.lastCompletedTile || this.playerTile;
    this.playerTile = { x: snapTile.x, y: snapTile.y };
    this.lastCompletedTile = { x: snapTile.x, y: snapTile.y };
    this.player.setPosition(snapTile.x * S + S / 2, snapTile.y * S + S / 2);
    this.cameras.main.startFollow(this.player, true, 1, 1);

    this.playerHidden = false;
    for (const e of this.enemies) {
      if (e.alive) {
        e.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
        e.searchTurnsRemaining = 0;
      }
    }

    const alerted = this._buildAlertedEnemySet(triggers, opts);
    this.combatGroup = [...alerted];
    this.combatGroup.forEach((e) => (e.inCombat = true));

    this.combatGroup.forEach((e) => {
      if (e.img) e.img.setAlpha(1);
      if (e.hpBg) e.hpBg.setAlpha(1);
      if (e.hpFg) e.hpFg.setAlpha(1);
      if (e.lbl) e.lbl.setAlpha(0.7);
      if (e.fa) e.fa.setAlpha(1);
    });

    const unseen = this.combatGroup.filter((e) => {
      const invisible = !this.isTileVisibleToPlayer(e.tx, e.ty);
      const dark = this.tileLightLevel(e.tx, e.ty) <= 1;
      return invisible || dark;
    });
    unseen.forEach((e) => this.showDetectedEnemyMarker(e));

    // Surprise is assigned only when combat was initiated by a successful opener.
    const surprisedEnemies = new Set();
    if (opts.surpriseFromOpener) {
      for (const e of this.combatGroup) {
        if (!this._isEnemyAwareOfPlayer(e)) surprisedEnemies.add(e);
      }
    }

    this.turnOrder = this.rollInitiativeOrder(this.combatGroup, surprisedEnemies);
    this.turnIndex = 0;
    this.playerAP = 1;
    this.playerMoves = Number(COMBAT_RULES.playerMovePerTurn || 5);
    this.playerMovesUsed = 0;

    if (surprisedEnemies.size > 0) {
      this.showStatus(`Ambush! ${surprisedEnemies.size} ${surprisedEnemies.size === 1 ? 'enemy is' : 'enemies are'} surprised.`);
    } else if (unseen.length) {
      this.showStatus(`Detected movement nearby: ${unseen.length} unseen ${unseen.length === 1 ? 'enemy' : 'enemies'}.`);
    }

    this.flashBanner('COMBAT!', 'combat');
    document.getElementById('vignette').classList.add('combat');
    document.getElementById('mode-badge').className = 'turnbased';
    document.getElementById('mode-badge').textContent = 'COMBAT';
    this.cameras.main.shake(400, 0.008);
    this.clearSightOverlays();
    this.syncEnemySightRings(false);
    this.updateFogOfWar();
    this.time.delayedCall(700, () => {
      this.buildInitBar();
      this.startNextTurn();
    });
  },
};

Object.assign(GameScene.prototype, GameSceneCombatInitSystem);
