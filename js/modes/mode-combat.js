// ═══════════════════════════════════════════════════════
// mode-combat.js — Combat mode controller for GameScene
// Initiative, engagement, enter/exit, turn management,
// player actions, flee, dice dismiss
// See also: combat-ai.js (enemy AI), combat-ranges.js (range display)
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  // ─────────────────────────────────────────
  // INITIATIVE (D&D 5e: d20 + DEX mod)
  // ─────────────────────────────────────────
  rollInitiativeOrder(combatGroup, surprisedEnemies = new Set()) {
    const playerDexMod = dnd.mod(this.pStats?.dex || 10);
    const playerRoll = dnd.roll(1, 20);
    const entries = [{
      id: 'player',
      roll: playerRoll,
      mod: playerDexMod,
      init: playerRoll + playerDexMod,
      surprised: false,
    }];

    for (const e of combatGroup) {
      const dexMod = dnd.mod(e?.stats?.dex || 10);
      const roll = dnd.roll(1, 20);
      entries.push({
        id: 'enemy',
        enemy: e,
        roll,
        mod: dexMod,
        init: roll + dexMod,
        surprised: surprisedEnemies.has(e),
      });
    }

    entries.sort((a, b) => {
      if (b.init !== a.init) return b.init - a.init;
      if (b.mod !== a.mod) return b.mod - a.mod;
      if (a.id === 'player' && b.id !== 'player') return -1;
      if (b.id === 'player' && a.id !== 'player') return 1;
      return Math.random() - 0.5;
    });

    return entries;
  },

  // ─────────────────────────────────────────
  // ENGAGE FROM EXPLORE
  // ─────────────────────────────────────────
  findApproachPathToEnemy(enemy, maxSteps = Number.POSITIVE_INFINITY) {
    if (!enemy || !enemy.alive) return null;
    const dirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
    ];
    const moveBlk = (x, y) => this.isBlockedTile(x, y);

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
    return this.canEnemySeePlayer(enemy);
  },

  _roomTileCount(roomId) {
    if (roomId === null || roomId === undefined) return 0;
    const topo = _getRoomTopology();
    let count = 0;
    for (const rid of topo.roomByKey.values()) {
      if (rid === roomId) count++;
    }
    return count;
  },

  _isLargeOpenRoom(roomId) {
    const threshold = Math.max(1, Number(COMBAT_RULES.largeRoomTileThreshold || 90));
    return this._roomTileCount(roomId) >= threshold;
  },

  _roomJoinDistanceFor(roomId) {
    if (!this._isLargeOpenRoom(roomId)) return Number.POSITIVE_INFINITY;
    return Math.max(1, Number(COMBAT_RULES.largeRoomJoinDistance || COMBAT_RULES.roomAlertMaxDistance || 8));
  },

  _perceivedCombatant(enemy, combatants, maxDist) {
    if (!enemy || !enemy.alive || !Array.isArray(combatants) || !combatants.length) return null;
    for (const c of combatants) {
      if (!c || !c.alive) continue;
      const d = Math.abs(enemy.tx - c.tx) + Math.abs(enemy.ty - c.ty);
      if (d > maxDist) continue;
      if (!hasLOS(enemy.tx, enemy.ty, c.tx, c.ty)) continue;
      if (!inFOV(enemy, c.tx, c.ty)) continue;
      return c;
    }
    return null;
  },

  _joinReasonLabelForEnemy(enemy, triggerSet, alertedSet, px, py) {
    if (!enemy) return 'unknown';
    if (triggerSet && triggerSet.has(enemy)) return 'trigger';
    if (this.canEnemySeeTile(enemy, px, py)) return 'sight';

    const eRoom = roomIdAt(enemy.tx, enemy.ty);
    if (eRoom !== null) {
      const nearJoinDist = this._roomJoinDistanceFor(eRoom);
      if (!Number.isFinite(nearJoinDist)) return 'same room';

      const combatants = [...(alertedSet || [])].filter((a) => a !== enemy && a.alive && roomIdAt(a.tx, a.ty) === eRoom);
      const src = this._perceivedCombatant(enemy, combatants, nearJoinDist);
      if (src) {
        const srcName = src.displayName || src.type || src.id || 'ally';
        return `called by ${srcName}`;
      }
    }

    return 'propagated';
  },

  _buildAlertedEnemySet(triggers, opts = {}) {
    const seeds = (triggers || []).filter((e) => e && e.alive);
    const alerted = new Set(seeds);

    // 1. Same group as opener target
    if (opts.openerGroup) {
      for (const e of this.enemies) {
        if (e.alive && e.group && e.group === opts.openerGroup) alerted.add(e);
      }
    }

    // 2. All scripted groups
    const scriptedGroups = new Set([...alerted].map((e) => e.group).filter(Boolean));
    if (scriptedGroups.size) {
      for (const e of this.enemies) {
        if (e.alive && e.group && scriptedGroups.has(e.group)) alerted.add(e);
      }
    }

    // 3. Enemies in the same room as the player or any alerted enemy.
    //    Small/normal rooms: whole room joins.
    //    Large open rooms: nearby area joins to avoid pulling the entire map.
    const alertedRooms = new Set();
    alertedRooms.add(roomIdAt(this.playerTile.x, this.playerTile.y));
    for (const a of alerted) {
      alertedRooms.add(roomIdAt(a.tx, a.ty));
    }
    alertedRooms.delete(null);

    for (const e of this.enemies) {
      if (!e.alive || alerted.has(e)) continue;
      // Direct visual contact always joins, regardless of room grouping.
      if (this.canEnemySeeTile(e, this.playerTile.x, this.playerTile.y)) {
        alerted.add(e);
        continue;
      }
      const eRoom = roomIdAt(e.tx, e.ty);
      if (eRoom === null || !alertedRooms.has(eRoom)) continue;

      const nearJoinDist = this._roomJoinDistanceFor(eRoom);
      if (!Number.isFinite(nearJoinDist)) {
        alerted.add(e);
        continue;
      }

      // Large room: enemy must be close enough and perceive active combatants.
      const distToPlayer = Math.abs(e.tx - this.playerTile.x) + Math.abs(e.ty - this.playerTile.y);
      if (distToPlayer <= nearJoinDist && this._perceivedCombatant(e, [...alerted], nearJoinDist)) {
        alerted.add(e);
        continue;
      }

      // In large rooms, only join when the fight is perceptible from this position.
      const localCombatants = [...alerted].filter((a) => roomIdAt(a.tx, a.ty) === eRoom);
      if (this._perceivedCombatant(e, localCombatants, nearJoinDist)) {
        alerted.add(e);
        continue;
      }
    }

    // 4. Enemies in side rooms (through doors) that have LOS to player
    const roomMax = Math.max(1, Number(COMBAT_RULES.roomAlertMaxDistance || 8));
    for (const e of this.enemies) {
      if (!e.alive || alerted.has(e)) continue;
      const eRoom = roomIdAt(e.tx, e.ty);
      if (eRoom === null) continue;
      // Check if this enemy's room is a side room of any alerted room
      const topo = _getRoomTopology();
      const adj = topo.sideByRoom.get(eRoom);
      const inSideRoom = adj && [...alertedRooms].some(r => adj.has(r));
      if (!inSideRoom) continue;
      // Side room enemy: only joins if can see/hear (LOS + FOV + range)
      const dist = Math.sqrt((e.tx - this.playerTile.x) ** 2 + (e.ty - this.playerTile.y) ** 2);
      if (dist <= Math.max(this.effectiveEnemySight(e), roomMax) && hasLOS(e.tx, e.ty, this.playerTile.x, this.playerTile.y) && inFOV(e, this.playerTile.x, this.playerTile.y)) {
        alerted.add(e);
      }
    }

    // 5. Any enemy that can see any other alerted enemy (even if not in same room)
    for (const e of this.enemies) {
      if (!e.alive || alerted.has(e)) continue;
      const hearRange = Math.max(this.effectiveEnemySight(e), 10);
      for (const a of [...alerted]) {
        const dA = Math.abs(e.tx - a.tx) + Math.abs(e.ty - a.ty);
        if (dA <= hearRange && hasLOS(e.tx, e.ty, a.tx, a.ty) && inFOV(e, a.tx, a.ty)) {
          alerted.add(e);
          break;
        }
      }
    }

    return alerted;
  },

  tryEngageEnemyFromExplore(enemy) {
    if (!enemy || !enemy.alive) return;
    if (!this.isExploreMode()) return;
    if (this.isMoving) return;

    if (tileDist(this.playerTile.x, this.playerTile.y, enemy.tx, enemy.ty) <= (this.pStats.atkRange || 1) + 0.01) {
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

    this.setDestination(approach.dest.x, approach.dest.y, () => {
      this._engageInProgress = false;
      this._suppressExploreSightChecks = false;
      this.executeEngageOpenerAttack(enemy);
    });
  },

  executeEngageOpenerAttack(enemy) {
    if (!enemy || !enemy.alive || !this.isExploreMode()) return;

    if (tileDist(this.playerTile.x, this.playerTile.y, enemy.tx, enemy.ty) > (this.pStats.atkRange || 1) + 0.01) {
      this.showStatus('Not in melee range to open with attack.');
      return;
    }

    if (this.playerHidden) this._breakStealth(null);
    const strMod = dnd.mod(this.pStats.str);
    const atkRoll = dnd.roll(1, 20);
    const atkTotal = atkRoll + strMod + this.pStats.profBonus;
    const isCrit = atkRoll === 20;
    const isMiss = atkRoll === 1;
    const hits = isCrit || (!isMiss && atkTotal >= enemy.ac);

    if (hits) {
      const dr = this.resolveAbilityDamage('attack', 'player', isCrit);
      const dmg = Math.max(1, dr.total);
      enemy.hp -= dmg;
      this.applyAbilityOnHitStatuses('attack', 'player', enemy);

      this.tweens.add({ targets: enemy.img, alpha: 0.15, duration: 80, yoyo: true, repeat: 3 });
      const wpn=WEAPON_DEFS[this.pStats.weaponId];
      const fColor=this.dmgColor(wpn&&wpn.damageType);
      const _ew=this.enemyWorldPos(enemy);
      this.spawnFloat(_ew.x, _ew.y - S/2, isCrit ? `💥${dmg}` : `-${dmg}`, isCrit?'#f39c12':fColor);

      const opRollLine=this.formatRollLine(atkRoll,strMod+this.pStats.profBonus,atkTotal,enemy.ac);
      const opDmgText=this.formatDamageBreakdown(dr);
      const opDmgType=wpn?wpn.damageType:'';
      CombatLog.logRoll({actor:'You',target:enemy.displayName,result:isCrit?'crit':'hit',damage:dmg,rollDetail:opRollLine,dmgDetail:`${opDmgText}${opDmgType?' '+opDmgType:''}`,extra:'opener'});

      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      if (enemy.hpFg) {
        enemy.hpFg.setDisplaySize((S - 8) * ratio, 5);
        if (ratio < 0.4) enemy.hpFg.setFillStyle(0xe67e22);
        if (ratio < 0.15) enemy.hpFg.setFillStyle(0xe74c3c);
      }

      if (enemy.hp <= 0) {
        enemy.alive = false;
        enemy.inCombat = true;
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
        { const _ew2=this.enemyWorldPos(enemy); this.spawnFloat(_ew2.x, _ew2.y - S/2 - 10, 'DEFEATED!', '#f0c060', 700); }
        if(typeof this.handleEnemyDefeatLoot==='function') this.handleEnemyDefeatLoot(enemy);
        this.pStats.xp += enemy.xp || 50;
        this.checkLevelUp();

        // BG3: one-shot kill — check if anyone noticed.
        // Silent kill only if player was hidden, or no enemy has LOS to player.
        const wasHiddenKill = this.playerHidden;
        const witnesses = this.enemies.filter(e => {
          if (!e.alive || e === enemy) return false;
          // Can see the player?
          if (this.canEnemySeePlayer(e)) return true;
          // Can see the kill location? (heard the body drop)
          if (this.canEnemySeeTile(e, enemy.tx, enemy.ty, {checkFOV:false})) return true;
          return false;
        });

        if (witnesses.length === 0) {
          this.showStatus(`${isCrit ? 'CRIT! ' : ''}Silent kill — ${enemy.displayName} defeated!`);
          this.flashBanner('SILENT KILL', 'explore');
          return; // No combat — clean kill
        }
        if (wasHiddenKill) {
          // Player was hidden — witnesses investigate but player stays hidden
          this.showStatus(`${isCrit ? 'CRIT! ' : ''}Kill from stealth! ${witnesses.length} enemies alerted.`);
        } else {
          this.showStatus(`${isCrit ? 'CRIT! ' : ''}Opener kill ${enemy.displayName}! ${witnesses.length} alerted!`);
        }
      } else {
        this.showStatus(`${isCrit ? 'CRIT! ' : ''}Opener hit ${enemy.displayName} for ${dmg}. Rolling initiative...`);
      }
    } else {
      this.tweens.add({ targets: enemy.img, x: enemy.img.x + 6, duration: 60, yoyo: true, repeat: 1 });
      this.showStatus(`Opener missed! Rolling initiative...`);
      const opMissLine=this.formatRollLine(atkRoll,strMod+this.pStats.profBonus,atkTotal,enemy.ac);
      CombatLog.logRoll({actor:'You',target:enemy.displayName,result:'miss',rollDetail:opMissLine,extra:'opener'});
    }

    this.enterCombat([enemy], { openerGroup: enemy.group, surpriseFromOpener: true });
  },

  // ─────────────────────────────────────────
  // ENTER / EXIT COMBAT
  // ─────────────────────────────────────────
  enterCombat(triggers, opts = {}) {
    if (this.mode === MODE.COMBAT) return;
    this.mode = MODE.COMBAT;
    this.syncExploreBar();

    this.tweens.killTweensOf(this.player);
    this.movePath = []; this.isMoving = false; this.clearPathDots(); this.onArrival = null;
    this.diceWaiting = false; this._afterPlayerDice = null;
    const snapTile = this.lastCompletedTile || this.playerTile;
    this.playerTile = { x: snapTile.x, y: snapTile.y };
    this.lastCompletedTile = { x: snapTile.x, y: snapTile.y };
    this.player.setPosition(snapTile.x * S + S / 2, snapTile.y * S + S / 2);
    this.cameras.main.startFollow(this.player, true, 1, 1);

    if (this.playerHidden) this._breakStealth(null);

    // TB mode flag: if entered with no enemies, don't auto-exit when no combatants left
    this._combatInitiatedByPlayer = opts.initiatedByPlayer === true;
    this._combatFloorStart = window._MAP_META?.floor;

    // Record player's last seen location for all enemies (for search behavior when hiding)
    for (const e of this.enemies) {
      if (e.alive) {
        e.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
        e.searchTurnsRemaining = 0;
      }
    }

    const triggerSet = new Set((triggers || []).filter((e) => e && e.alive));
    const alerted = this._buildAlertedEnemySet(triggers, opts);
    this.combatGroup = [...alerted];
    this.combatGroup.forEach((e) => (e.inCombat = true));

    // Ensure engaged enemies are visible in combat
    this.combatGroup.forEach((e) => {
      if (e.img) e.img.setAlpha(1);
      if (e.hpBg) e.hpBg.setAlpha(1);
      if (e.hpFg) e.hpFg.setAlpha(1);
      if (e.lbl) e.lbl.setAlpha(0.7);
      if (e.fa) e.fa.setAlpha(1);
    });

    // Show detection pings on all engaged enemies
    this.combatGroup.forEach((e) => this.showDetectedEnemyMarker(e));

    const unseen = this.combatGroup.filter((e) => {
      const invisible = !this.isTileVisibleToPlayer(e.tx, e.ty);
      const dark = this.tileLightLevel(e.tx, e.ty) <= 1;
      return invisible || dark;
    });

    // Surprise is assigned only when combat was initiated by a successful opener
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
    document.getElementById('mode-badge').textContent = '⚔ COMBAT';
    const esp=document.getElementById('enemy-stat-popup'); if(esp) esp.style.display='none';
    const _ap=document.getElementById('atk-predict-popup'); if(_ap) _ap.style.display='none';
    this._statPopupEnemy=null;
    this.cameras.main.shake(400, 0.008);
    this.clearSightOverlays();
    this.syncEnemySightRings(false);
    this.updateFogOfWar();
    if (this.enemySightEnabled && typeof this.drawSightOverlays === 'function') {
      this.drawSightOverlays();
    }
    CombatLog.logSep('COMBAT');
    const enemyNames = this.combatGroup
      .map((e) => e?.displayName || e?.name || e?.type || e?.id || 'Unknown')
      .filter(Boolean);
    const enemyLabel = enemyNames.length
      ? `${enemyNames.length} ${enemyNames.length === 1 ? 'enemy' : 'enemies'} (${enemyNames.join(', ')})`
      : `${alerted?.size ?? this.combatGroup.length} enemies`;
    CombatLog.log(`Combat started — ${enemyLabel}`, 'system', 'combat');
    const reasonDetails = this.combatGroup.map((e) => {
      const name = e.displayName || e.type || e.id || 'Unknown';
      const reason = this._joinReasonLabelForEnemy(e, triggerSet, alerted, this.playerTile.x, this.playerTile.y);
      return `${name} (${reason})`;
    }).join(', ');
    CombatLog.log(`Join reasons: ${reasonDetails}`, 'system', 'combat');
    // Update fog-of-war to keep non-combatant enemies visible based on visibility rules
    this.updateFogOfWar();
    this.time.delayedCall(700, () => { this.buildInitBar(); this.startNextTurn(); });
  },

  exitCombat(reason='victory'){
    this.mode=MODE.EXPLORE;
    this._clearPendingSpotWarnings();
    if (this.playerHidden) this._breakStealth(null);
    this.syncExploreBar();
    // Clear combat state on every enemy so explore sight/detection resumes normally.
    for (const e of this.enemies) {
      if (!e) continue;
      e.inCombat = false;
      if (!e.alive) continue;
      if (!e.lastSeenPlayerTile) e.lastSeenPlayerTile = { x: e.tx, y: e.ty };
      e.searchTurnsRemaining = 0;
    }
    this.combatGroup=[]; this.turnOrder=[]; this.turnIndex=0; this.pendingAction=null;
    this.diceWaiting=false; this._afterPlayerDice=null; this._movingToAttack=false;
    this._combatInitiatedByPlayer = false;
    this._combatFloorStart = undefined;
    const ov=document.getElementById('dice-ov'); if(ov) ov.classList.remove('show');
    this.clearMoveRange(); this.clearAtkRange(); this.clearFleeZone();
    this.clearDetectMarkers(); this.hideHitLabels();
    this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
    document.getElementById('vignette').classList.remove('combat');
    document.getElementById('mode-badge').className='realtime';
    document.getElementById('mode-badge').textContent='EXPLORE';
    document.getElementById('init-bar').classList.remove('show');
    document.getElementById('action-bar').classList.remove('show');
    document.getElementById('res-pips').classList.remove('show');
    if(reason==='flee'){
      this.flashBanner('FLED COMBAT','explore');
      this.showStatus('Escaped combat. Stay hidden to avoid re-engage.');
      CombatLog.log('Fled combat!', 'system', 'combat');
    }else if(reason==='escape'){
      CombatLog.log('Escaped — enemies lost you.', 'system', 'combat');
    }else if(reason==='floor_change'){
      this.flashBanner('LEFT COMBAT','explore');
      this.showStatus('Combat ended — you moved to a different area.');
      CombatLog.log('Left combat area.', 'system', 'combat');
    }else{
      this.flashBanner('COMBAT OVER','explore');
      this.showStatus('Victory! Continue exploring.');
      CombatLog.log('Victory!', 'player', 'combat');
    }
    CombatLog.logSep();
    this.resetActionButtons();
    withHotbar(hotbar => hotbar.resetUsed());
    this.time.delayedCall(300,()=>{ this.drawSightOverlays(); this.updateFogOfWar(); });
  },

  // ─────────────────────────────────────────
  // COMBAT TAP
  // ─────────────────────────────────────────
  onTapCombat(tx,ty,enemy,ptr){
    if(this._movingToAttack) return;
    if(!this.isPlayerTurn()) return;

    // Door interaction — but only if no alive enemy is standing on it
    if(this.isDoorTile(tx,ty)&&!(enemy&&enemy.alive)){
      if(tileDist(this.playerTile.x,this.playerTile.y,tx,ty)>1.5){ this.showStatus('Move next to the door to interact.'); return; }
      this.toggleDoor(tx,ty);
      return;
    }

    // Enemy taps are handled by onTapEnemy via sprite pointerup
    if(enemy&&this.combatGroup.includes(enemy)) return;

    if(enemy&&!this.combatGroup.includes(enemy)){
      this.showStatus('That enemy is not in this fight.');
      return;
    }

    // Tap on empty tile while ability selected → cancel
    if(this.pendingAction==='attack'){
      this.clearPendingAction();
      this.showMoveRange();
      this.showStatus('Attack cancelled.');
      return;
    }

    if(!this.isWallTile(tx,ty)){
      if(this.ui) this.ui.dismissEnemyPopup();
      if(this.enemies.some(e=>e.alive&&e.tx===tx&&e.ty===ty)){ this.showStatus('Cannot move onto an enemy tile.'); return; }
      // BG3: check reachability from turn-start, not current position
      const anchor = this.turnStartTile || this.playerTile;
      const totalBudget = this.turnStartMoves ?? this.playerMoves;
      const wallBlk2=(x,y)=>this.isBlockedTile(x,y,{doorMode:false});
      const isAnchorTile = tx === anchor.x && ty === anchor.y;
      const pathFromStart=bfs(anchor.x,anchor.y,tx,ty,wallBlk2);
      if(!isAnchorTile && !pathFromStart.length){ this.showStatus('Cannot reach that tile.'); return; }
      const costFromStart=isAnchorTile ? 0 : pathTileCost(pathFromStart,anchor);
      if(costFromStart>totalBudget+0.001){
        this.showMoveRange();
        this.showStatus(`Too far (${costFromStart.toFixed(1)}), you have ${totalBudget.toFixed(1)} movement.`);
        return;
      }
      // Also need a path from current position for the actual walk
      const path=bfs(this.playerTile.x,this.playerTile.y,tx,ty,wallBlk2);
      if(!path.length){ this.showStatus('Cannot reach that tile.'); return; }
      // BG3: keep move range visible — don't clear it
      const finalPos=ptr?{wx:ptr.worldX,wy:ptr.worldY}:null;
      // BG3: don't deduct movement yet — just move freely
      this.setDestination(tx,ty,()=>{
        // Update how far we've gone from turn start (for display/validation)
        this.playerMovesUsed=costFromStart;
        this.playerMoves=Math.max(0,totalBudget-costFromStart);
        this.updateResBar();
        this._updatePendingSpotWarnings();
        // Range stays visible — anchored to turn start
        // Detection of new enemies happens at turn end, not during movement
      },finalPos);
    }
  },

  // ─────────────────────────────────────────
  // TURN MANAGEMENT
  // ─────────────────────────────────────────
  startNextTurn(){
    this.turnOrder=this.turnOrder.filter(t=>t.id==='player'||(t.enemy&&t.enemy.alive));
    
    // Check if player moved to a different floor — if so, exit combat
    const currentFloor = window._MAP_META?.floor;
    if (this._combatFloorStart !== undefined && currentFloor !== this._combatFloorStart) {
      this.exitCombat('floor_change');
      return;
    }
    
    // Exit only if no enemies AND not a TB mode (manual) combat entry
    const noEnemies = this.combatGroup.every(e=>!e.alive);
    const shouldExit = noEnemies && !this._combatInitiatedByPlayer;
    if(!this.turnOrder.length || shouldExit){ this.exitCombat(); return; }

    if(this.playerHidden && this.combatGroup.every(e => !e.alive || e.searchTurnsRemaining <= 0)){
      this.showStatus('All enemies have abandoned the search. You escaped!');
      this.time.delayedCall(400, ()=>this.exitCombat('escape'));
      return;
    }

    if(this.turnIndex<0||this.turnIndex>=this.turnOrder.length) this.turnIndex=0;
    const cur=this.turnOrder[this.turnIndex];
    this.buildInitBar();

    if(cur.surprised){
      cur.surprised=false;
      this.showStatus(`${cur.id==='player'?'You are':cur.enemy.displayName+' is'} surprised and loses this turn!`);
      if(cur.id==='player') this.time.delayedCall(220,()=>this.endPlayerTurn(true));
      else this.time.delayedCall(220,()=>this.endEnemyTurn(cur.enemy));
      return;
    }

    if(cur.id==='player'){
      const st=this.processStatusEffectsForActor('player','turn_start');
      if(st.skipTurn){
        this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
        document.getElementById('action-bar').classList.remove('show');
        document.getElementById('res-pips').classList.remove('show');
        this.time.delayedCall(250,()=>this.endPlayerTurn(true));
        return;
      }
      this.playerAP=1; this.playerMoves=Number(COMBAT_RULES.playerMovePerTurn||5); this.playerMovesUsed=0;
      this.turnStartMoves=Number(COMBAT_RULES.playerMovePerTurn||5);
      this.turnStartTile={...this.playerTile};
      this.snapshotMoveResetAnchor();
      this.pendingAction=null;
      this.clearMoveRange(); this.clearAtkRange();
      document.getElementById('action-bar').classList.add('show');
      document.getElementById('res-pips').classList.add('show');
      this.initActionButtons();
      this.resetActionButtons();
      withHotbar(hotbar => {
        hotbar.setExpanded(true);
        hotbar.resetUsed();
      });
      this.turnHL.setPosition(this.player.x,this.player.y).setAlpha(0.6);
      this.tweens.add({targets:this.turnHL,alpha:0.25,duration:600,yoyo:true,repeat:-1});
      this.updateResBar();
      this._updatePendingSpotWarnings();
      this.time.delayedCall(100,()=>this.showMoveRange());
      const engageTarget=this._queuedEngageEnemy;
      this._queuedEngageEnemy=null;
      if(engageTarget&&engageTarget.alive&&this.combatGroup.includes(engageTarget)){
        this.showStatus(`Engaging ${engageTarget.displayName}...`);
        this.time.delayedCall(180,()=>{
          if(this.mode===MODE.COMBAT&&this.isPlayerTurn()&&engageTarget.alive) this.tryMoveAndAttack(engageTarget);
        });
      }
    } else {
      const st=this.processStatusEffectsForActor(cur.enemy,'turn_start');
      if(st.skipTurn){ this.time.delayedCall(220,()=>this.endEnemyTurn(cur.enemy)); return; }
      document.getElementById('action-bar').classList.remove('show');
      document.getElementById('res-pips').classList.remove('show');
      this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
      this.clearMoveRange();
      this.time.delayedCall(400,()=>this.doEnemyTurn(cur.enemy));
    }
  },

  endPlayerTurn(fromStatusSkip=false){
    if(this.mode!==MODE.COMBAT) return;
    this._clearPendingSpotWarnings();
    if(this.ui) this.ui.dismissEnemyPopup();
    if(!fromStatusSkip) this.processStatusEffectsForActor('player','turn_end');
    if(typeof this.tickStatMods==='function') this.tickStatMods();
    this.playerMoves=0; this.playerAP=0;
    this.diceWaiting=false; this._afterPlayerDice=null; this._movingToAttack=false;
    this.clearPendingAction(); this.clearMoveRange(); this.clearAtkRange();
    this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
    document.getElementById('action-bar').classList.remove('show');
    document.getElementById('res-pips').classList.remove('show');
    // Check for newly spotted enemies when turn is finalized
    this._checkForNewEnemiesAfterMove();
    this.turnIndex++;
    this.time.delayedCall(200,()=>this.startNextTurn());
  },

  _clearPendingSpotWarnings(){
    const warned = this._pendingSpotWarningEnemies || [];
    for (const e of warned) {
      if (e?.img && e.img.active) e.img.clearTint();
    }
    this._pendingSpotWarningEnemies = [];
    this._pendingSpotWarningKey = '';
  },

  _updatePendingSpotWarnings(){
    if (this.mode !== MODE.COMBAT || !this.isPlayerTurn()) { this._clearPendingSpotWarnings(); return; }
    const predicted = this._predictNewAlertedAtTileDetailed(this.playerTile.x, this.playerTile.y);
    const spotters = predicted.map((p) => p.enemy);

    // Remove old highlights first.
    const prev = this._pendingSpotWarningEnemies || [];
    for (const e of prev) {
      if (e?.img && e.img.active) e.img.clearTint();
    }

    this._pendingSpotWarningEnemies = spotters;
    for (const e of spotters) {
      if (e?.img && e.img.active) e.img.setTint(0xffb347);
    }

    const key = predicted
      .map((p) => `${p.enemy.displayName || p.enemy.type || p.enemy.id}:${p.reason}`)
      .sort()
      .join('|');
    if (spotters.length && key !== this._pendingSpotWarningKey) {
      const visual = predicted.filter((p) => p.reason === 'sight').length;
      const area = spotters.length - visual;
      if (visual > 0 && area > 0) {
        this.showStatus(`${spotters.length} enemies will join on End Turn (${visual} see you, ${area} nearby hear the fight).`);
      } else if (visual > 0) {
        this.showStatus(`${visual} ${visual === 1 ? 'enemy' : 'enemies'} can see you and will join on End Turn.`);
      } else {
        this.showStatus(`${area} nearby ${area === 1 ? 'enemy' : 'enemies'} will join on End Turn (combat noise).`);
      }
    }
    this._pendingSpotWarningKey = key;
  },

  _predictNewAlertedAtTileDetailed(px, py){
    if (!this.combatGroup || this.combatGroup.length === 0) return [];
    const predicted = [];
    const seenIds = new Set();
    const pushPredicted = (enemy, reason, source = null) => {
      if (!enemy || seenIds.has(enemy.id || enemy)) return;
      seenIds.add(enemy.id || enemy);
      predicted.push({ enemy, reason, source });
    };
    const currentRoom = roomIdAt(px, py);
    const alertedRooms = new Set();
    alertedRooms.add(currentRoom);
    for (const e of this.combatGroup) alertedRooms.add(roomIdAt(e.tx, e.ty));
    alertedRooms.delete(null);

    for (const e of this.enemies) {
      if (!e.alive || this.combatGroup.includes(e)) continue;
      // Direct visual contact always joins, regardless of room grouping.
      if (this.canEnemySeeTile(e, px, py)) { pushPredicted(e, 'sight'); continue; }

      const eRoom = roomIdAt(e.tx, e.ty);
      if (eRoom === null || !alertedRooms.has(eRoom)) continue;

      // Same-room propagation follows the same model as combat start:
      // whole-room for normal rooms; nearby-area only for large rooms.
      const nearJoinDist = this._roomJoinDistanceFor(eRoom);
      if (!Number.isFinite(nearJoinDist)) {
        pushPredicted(e, 'same_room');
        continue;
      }

      const distToPlayer = Math.abs(e.tx - px) + Math.abs(e.ty - py);
      const roomCombatants = this.enemies.filter((other) =>
        other.alive && other.inCombat && roomIdAt(other.tx, other.ty) === eRoom
      );
      const perceived = this._perceivedCombatant(e, roomCombatants, nearJoinDist);
      if (distToPlayer <= nearJoinDist && perceived) {
        pushPredicted(e, 'area', perceived);
        continue;
      }

      // Large-room nearby join requires perceiving any active combatant.
      if (perceived) {
        pushPredicted(e, 'area', perceived);
        continue;
      }
    }
    return predicted;
  },

  _predictNewAlertedAtTile(px, py){
    return this._predictNewAlertedAtTileDetailed(px, py).map((p) => p.enemy);
  },

  _checkForNewEnemiesAfterMove(){
    if (!this.combatGroup || this.combatGroup.length === 0) return; // TB mode with no enemies yet
    const newAlertedDetailed = this._predictNewAlertedAtTileDetailed(this.playerTile.x, this.playerTile.y);
    const newAlerted = newAlertedDetailed.map((p) => p.enemy);
    
    if (newAlerted.length > 0) {
      this.showStatus(`${newAlerted.length} new ${newAlerted.length === 1 ? 'enemy' : 'enemies'} joined the battle!`);
      const joinedNames = newAlertedDetailed
        .map(({ enemy, reason, source }) => {
          const name = enemy.displayName || enemy.type || enemy.id || 'Unknown';
          if (reason === 'sight') return `${name} (sight)`;
          if (reason === 'same_room') return `${name} (same room)`;
          if (source) {
            const src = source.displayName || source.type || source.id || 'ally';
            return `${name} (called by ${src})`;
          }
          return `${name} (nearby)`;
        })
        .join(', ');
      newAlerted.forEach(e => {
        this.combatGroup.push(e);
        e.inCombat = true;
        this.showDetectedEnemyMarker(e);
        if (e.img) e.img.setAlpha(1);
        if (e.hpBg) e.hpBg.setAlpha(1);
        if (e.hpFg) e.hpFg.setAlpha(1);
        if (e.lbl) e.lbl.setAlpha(0.7);
        if (e.fa) e.fa.setAlpha(1);
      });
      // Re-roll initiative for new enemies
      this.turnOrder = this.rollInitiativeOrder(this.combatGroup);
      CombatLog.log(`${newAlerted.length} new ${newAlerted.length === 1 ? 'enemy' : 'enemies'} entered combat: ${joinedNames}.`, 'system', 'combat');
      // Update fog-of-war to keep non-combatant enemies visible
      this.updateFogOfWar();
    }
  },

  isPlayerTurn(){
    if(this.mode!==MODE.COMBAT) return false;
    const c=this.turnOrder[this.turnIndex];
    return c&&c.id==='player';
  },

  snapshotMoveResetAnchor(){
    this.moveResetAnchorTile={...this.playerTile};
    this.moveResetAnchorMoves=Math.max(0, Number(this.playerMoves||0));
    this.moveResetAnchorMovesUsed=Math.max(0, Number(this.playerMovesUsed||0));
  },

  // ─────────────────────────────────────────
  // RESET MOVE
  // ─────────────────────────────────────────
  resetMove(){
    if(!this.isPlayerTurn()) return;
    const anchorTile=this.moveResetAnchorTile||this.turnStartTile;
    const anchorMoves=Math.max(0, Number(this.moveResetAnchorMoves ?? this.turnStartMoves ?? (COMBAT_RULES.playerMovePerTurn||5)));
    const anchorMovesUsed=Math.max(0, Number(this.moveResetAnchorMovesUsed ?? 0));
    const sameTile=!!anchorTile&&this.playerTile.x===anchorTile.x&&this.playerTile.y===anchorTile.y;
    if(sameTile&&this.playerMoves===anchorMoves&&this.playerMovesUsed===anchorMovesUsed){ this.showStatus('No movement to reset.'); return; }
    this.tweens.killTweensOf(this.player);
    this.movePath=[]; this.isMoving=false; this.clearPathDots(); this.onArrival=null;
    this.playerTile={...anchorTile};
    this.player.setPosition(anchorTile.x*S+S/2,anchorTile.y*S+S/2);
    this.cameras.main.startFollow(this.player,true,1,1);
    this.playerMoves=anchorMoves;
    this.playerMovesUsed=anchorMovesUsed;
    this.updateFogOfWar();
    this.clearMoveRange();
    this.showMoveRange();
    this.updateResBar();
    this._updatePendingSpotWarnings();
    this.showStatus('Move reset.');
  },

  // ─────────────────────────────────────────
  // PLAYER ACTIONS
  // ─────────────────────────────────────────
  selectAction(action){
    // Dismiss enemy popup on any action selection
    if(this.ui) this.ui.dismissEnemyPopup();
    // Allow attack targeting in explore (to initiate combat)
    if(this.isExploreMode() && action==='attack'){
      if(this.pendingAction==='attack'){
        this.clearPendingAction();
        this.showStatus('Attack cancelled.');
        return;
      }
      // Auto-switch to attack targeting in explore
      if(this.mode===MODE.EXPLORE){
        this._targetingAutoTB=false;
      }
      this.pendingAction='attack';
      withHotbar(hotbar => hotbar.setSelected('attack'));
      this.showStatus('Select an enemy to attack. Click empty tile to cancel.');
      return;
    }
    if(this.mode!==MODE.COMBAT){ this.showStatus('Enter combat first.'); return; }
    if(!this.isPlayerTurn()) return;
    if(action==='attack'||this._isAttackAbility(action)){
      if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }
      // Toggle: clicking same action again deselects it
      if(this.pendingAction==='attack'&&(this._pendingAtkAbilityId||'attack')===action){
        this.clearPendingAction();
        this.showMoveRange();
        this.showStatus('Attack cancelled.');
        return;
      }
      this.pendingAction='attack';
      this._pendingAtkAbilityId=action;
      this.setSelectedActionButton('attack');
      withHotbar(hotbar => hotbar.setSelected(action));
      this.clearMoveRange(); this.showAtkRange();
      this.updateHitLabels();
      const aDef = this.getAbilityDef(action);
      this.showStatus(`Select an enemy to ${aDef?.name||'attack'}.`);
    } else if(action==='sleep_cloud'){
      this.showStatus('Sleep Cloud action setup is not wired to a targeting flow yet.');
      this.pendingAction=null;
      this.setSelectedActionButton('');
      withHotbar(hotbar => hotbar.clearSelection());
    } else if(action==='dash'){
      if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }
      this.playerAP=0; this.playerMoves+=Number(COMBAT_RULES.dashMoveBonus||4);
      this.processStatusEffectsForActor('player','on_action',{actionId:'dash'});
      // Dash commits current movement + extends from current position
      this.turnStartTile={...this.playerTile};
      this.turnStartMoves=Math.max(0,this.playerMoves);
      this.snapshotMoveResetAnchor();
      this.pendingAction=null;
      this.setActionButtonsUsed(true);
      withHotbar(hotbar => hotbar.markAllUsed(true));
      this.updateResBar(); this.clearMoveRange(); this.showMoveRange();
      this.showStatus(`Dashed! ${Math.floor(this.playerMoves)} movement remaining.`);
    } else if(action==='hide'){
      this.tryHideAction();
    } else if(action==='flee'){
      // Toggle: clicking flee again deselects it
      if(this.pendingAction==='flee'){
        this.clearPendingAction();
        this.clearFleeZone();
        this.showMoveRange();
        return;
      }
      const chk=this.canFleeCombat();
      if(chk.ok){
        this.tryFleeCombat();
      } else {
        // Show flee zone as guide — green tiles where flee would succeed
        this.pendingAction='flee';
        withHotbar(hotbar => hotbar.setSelected('flee'));
        this.clearMoveRange(); this.clearAtkRange();
        this.showFleeZone();
        this.showMoveRange();
        CombatLog.log(`Can't flee yet: ${chk.reason} Move to a green tile first.`, 'system', 'combat');
      }
    }
  },

  clearPendingAction(){
    this.pendingAction=null;
    this._pendingAtkAbilityId=null;
    this._atkConfirmEnemy=null;
    this._hideHitTooltip();
    this.setSelectedActionButton('');
    withHotbar(hotbar => hotbar.clearSelection());
    this.clearAtkRange(); this.clearFleeZone();
    this.updateHitLabels();
    // If we auto-switched to TB for targeting, no longer applicable
    this._targetingAutoTB=false;
  },

  /** Check if an ability id is an attack-type ability (has attackRoll in template) */
  _isAttackAbility(id){
    if(id==='attack') return true;
    const def=this.getAbilityDef(id);
    return !!(def?.template?.hit?.attackRoll);
  },

  /** Calculate hit chance vs enemy (5%-95%, accounting for nat 1/20) */
  calcHitChance(enemy, abilityId){
    abilityId = abilityId || this._pendingAtkAbilityId || 'attack';
    const aDef = this.getAbilityDef(abilityId);
    const atkStat = aDef?.template?.hit?.attackRoll?.ability || 'str';
    const addProf = aDef?.template?.hit?.attackRoll?.addProf !== false;
    const statMod = dnd.mod(this.pStats[atkStat] || 10);
    const bonus = statMod + (addProf ? this.pStats.profBonus : 0);
    const needed = enemy.ac - bonus; // need to roll this or higher on d20
    // Nat 1 always misses (5%), Nat 20 always hits (5%)
    const raw = (21 - needed) / 20;
    return Math.round(Math.max(0.05, Math.min(0.95, raw)) * 100);
  },

  /** Show/hide hit chance tooltip near enemy */
  _showHitTooltip(enemy){
    if (!enemy || !enemy.alive) { this._hideHitTooltip(); return; }
    const pct = this.calcHitChance(enemy);
    const adv = this.playerHidden ? ' (Adv)' : '';
    let el = document.getElementById('hit-chance-tip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hit-chance-tip';
      el.style.cssText = 'position:absolute;z-index:35;pointer-events:none;font-family:"Courier New",monospace;font-size:13px;font-weight:bold;padding:4px 10px;border-radius:6px;background:rgba(10,10,20,0.92);border:1px solid rgba(231,76,60,0.5);white-space:nowrap;transition:opacity 0.12s;';
      document.body.appendChild(el);
    }
    el.textContent = `${pct}%${adv}`;
    el.style.color = pct >= 70 ? '#2ecc71' : pct >= 40 ? '#f0c060' : '#e74c3c';
    // Position above enemy sprite
    const cam = this.cameras.main;
    const canvas = document.querySelector('#gc canvas');
    const cr = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: 960, height: 1008 };
    const scaleX = cr.width / cam.width, scaleY = cr.height / cam.height;
    const sx = (enemy.tx * S + S / 2 - cam.scrollX) * scaleX + cr.left;
    const sy = (enemy.ty * S - 8 - cam.scrollY) * scaleY + cr.top;
    el.style.left = (sx - el.offsetWidth / 2) + 'px';
    el.style.top = (sy - 28) + 'px';
    el.style.display = 'block';
    el.style.opacity = '1';
  },

  _hideHitTooltip(){
    const el = document.getElementById('hit-chance-tip');
    if (el) { el.style.opacity = '0'; el.style.display = 'none'; }
    this._atkHoverEnemy = null;
  },

  /** Update always-visible hit% labels over all combat enemies */
  updateHitLabels(){
    if(!this.enemies) return;
    const inCombat = this.mode===MODE.COMBAT;
    const hasAP = this.playerAP > 0;
    // Determine which ability to calc hit for
    let abilityId = this._pendingAtkAbilityId || 'attack';
    if(!this._pendingAtkAbilityId && typeof Hotbar!=='undefined'){
      abilityId = Hotbar.getEffectiveDefaultAttack();
    }
    for(const e of this.enemies){
      if(!e.hitLbl) continue;
      if(!inCombat || !e.alive || !e.inCombat || !hasAP){
        e.hitLbl.setAlpha(0);
        continue;
      }
      const pct = this.calcHitChance(e, abilityId);
      e.hitLbl.setText(`${pct}%`);
      e.hitLbl.setColor(pct>=70?'#2ecc71':pct>=40?'#f0c060':'#e74c3c');
      e.hitLbl.setPosition(e.img.x, e.img.y - S*0.7);
      e.hitLbl.setAlpha(1);
    }
  },

  /** Hide all hit% labels (e.g. when leaving combat) */
  hideHitLabels(){
    if(!this.enemies) return;
    for(const e of this.enemies){
      if(e.hitLbl) e.hitLbl.setAlpha(0);
    }
  },

  playerAttackEnemy(enemy, abilityId){
    abilityId = abilityId || 'attack';
    if(!this.isPlayerTurn()||this.playerAP<=0) return;
    if(this.ui) this.ui.dismissEnemyPopup();

    const wasHidden = this.playerHidden;
    if (wasHidden) this._breakStealth(null); // silent — attack message shown separately
    if(tileDist(this.playerTile.x,this.playerTile.y,enemy.tx,enemy.ty)>(this.pStats.atkRange||1)+0.5){ this.showStatus('Too far — move closer first.'); return; }
    this.clearPendingAction();
    this.playerAP=0;
    this.processStatusEffectsForActor('player','on_action',{actionId:abilityId});
    // BG3: action commits movement — recalculate range from current position
    this.turnStartTile={...this.playerTile};
    this.turnStartMoves=Math.max(0,this.playerMoves);
    this.snapshotMoveResetAnchor();

    // Resolve attack stat from ability definition
    const abilityDef = this.getAbilityDef(abilityId);
    const atkStat = abilityDef?.template?.hit?.attackRoll?.ability || 'str';
    const addProf = abilityDef?.template?.hit?.attackRoll?.addProf !== false;
    const statMod = dnd.mod(this.pStats[atkStat] || 10);
    const profBonus = addProf ? this.pStats.profBonus : 0;

    let atkRoll, atkRoll2 = null;
    if(wasHidden){
      atkRoll = dnd.roll(1,20);
      atkRoll2 = dnd.roll(1,20);
      atkRoll = Math.max(atkRoll, atkRoll2);
    } else {
      atkRoll = dnd.roll(1,20);
    }

    const atkTotal=atkRoll+statMod+profBonus;
    const isCrit=atkRoll===20, isMiss=atkRoll===1;
    const hits=isCrit||(!isMiss&&atkTotal>=enemy.ac);

    const abilityName = abilityDef?.name || 'Attack';

    this.setActionButtonsUsed(true);
    withHotbar(hotbar => hotbar.markAllUsed(true));
    this.updateResBar();

    if(!hits){
      this.tweens.add({targets:enemy.img,x:enemy.img.x+6,duration:60,yoyo:true,repeat:1});
      { const _ew=this.enemyWorldPos(enemy); this.spawnFloat(_ew.x,_ew.y-S/2,isMiss?'NAT 1!':'MISS','#7fc8f8'); }
      const totalMod=statMod+profBonus;
      const rollDisplay = wasHidden
        ? `d20(${atkRoll2}|${atkRoll}↑) ${totalMod>=0?'+ '+totalMod:'- '+Math.abs(totalMod)} = ${atkTotal} | AC ${enemy.ac}`
        : this.formatRollLine(atkRoll,totalMod,atkTotal,enemy.ac);
      this.showStatus(`${abilityName} missed ${enemy.displayName}! ${rollDisplay}`);
      CombatLog.logRoll({actor:'You',target:enemy.displayName,result:isMiss?'crit':'miss',rollDetail:rollDisplay,extra:wasHidden?'advantage':'',});
      
      this._afterPlayerDice=()=>{
        this.showMoveRange();
      };
      
      // Nat 1 → dramatic dice overlay; normal miss → just log + continue
      if(isMiss){
        this.diceWaiting='player';
        this.showDicePopup(rollDisplay,'Rolled a 1 — the worst possible roll. Your attack fumbles automatically, no matter how weak the enemy is.','miss',[{sides:20,value:atkRoll,kind:'d20'}, ...(atkRoll2!==null?[{sides:20,value:atkRoll2,kind:'d20'}]:[])]);
      } else {
        this._finishPlayerAction();
      }
      return;
    }

    const dr=this.resolveAbilityDamage(abilityId,'player',isCrit);
    const dmg=Math.max(1,dr.total);
    enemy.hp-=dmg;
    this.applyAbilityOnHitStatuses(abilityId,'player',enemy);

    // Damage type color from weapon
    const wpn=WEAPON_DEFS[this.pStats.weaponId];
    const floatColor=this.dmgColor(wpn&&wpn.damageType);

    this.tweens.add({targets:enemy.img,alpha:0.15,duration:80,yoyo:true,repeat:3});
    { const _ew=this.enemyWorldPos(enemy); this.spawnFloat(_ew.x,_ew.y-S/2,isCrit?`💥${dmg}`:`-${dmg}`,isCrit?'#f39c12':floatColor); }
    const ratio=Math.max(0,enemy.hp/enemy.maxHp);
    enemy.hpFg.setDisplaySize((S-8)*ratio,5);
    if(ratio<0.4) enemy.hpFg.setFillStyle(0xe67e22);
    if(ratio<0.15) enemy.hpFg.setFillStyle(0xe74c3c);

    const dmgText=this.formatDamageBreakdown(dr);
    const totalMod2=statMod+profBonus;
    const rollDisplay = wasHidden
      ? `d20(${atkRoll2}|${atkRoll}↑) ${totalMod2>=0?'+ '+totalMod2:'- '+Math.abs(totalMod2)} = ${atkTotal} | AC ${enemy.ac}`
      : this.formatRollLine(atkRoll,totalMod2,atkTotal,enemy.ac);
    this.showStatus(`${isCrit?'CRIT! ':''}${wasHidden?'SNEAK ':''}${abilityName} hit ${enemy.displayName} for ${dmg}! ${rollDisplay} | ${dmgText}`);
    const pWpn=WEAPON_DEFS[this.pStats.weaponId];
    const pDmgType=pWpn?pWpn.damageType:'';
    CombatLog.logRoll({actor:'You',target:enemy.displayName,result:isCrit?'crit':'hit',damage:dmg,rollDetail:rollDisplay,dmgDetail:`${dmgText}${pDmgType?' '+pDmgType:''}`,extra:wasHidden?'sneak attack':''});

    this._afterPlayerDice=()=>{
      if(enemy.hp<=0){
        enemy.alive=false; enemy.inCombat=false;
        this.tweens.add({targets:[enemy.img,enemy.hpBg,enemy.hpFg,enemy.lbl,enemy.sightRing],alpha:0,duration:500,onComplete:()=>{[enemy.img,enemy.hpBg,enemy.hpFg,enemy.lbl,enemy.sightRing,enemy.fa].forEach(o=>{if(o&&o.destroy)o.destroy();});}});
        if(enemy.fa) this.tweens.add({targets:enemy.fa,alpha:0,duration:300});
        { const _ew2=this.enemyWorldPos(enemy); this.spawnFloat(_ew2.x,_ew2.y-S/2-10,'DEFEATED!','#f0c060',700); }
        if(typeof this.handleEnemyDefeatLoot==='function') this.handleEnemyDefeatLoot(enemy);
        CombatLog.log(`${enemy.displayName} defeated! +${enemy.xp||50} XP`,'player','combat');
        this.pStats.xp+=enemy.xp||50; this.checkLevelUp();
        if(this.combatGroup.every(e=>!e.alive)){ this.time.delayedCall(600,()=>this.exitCombat()); return; }
      }
      this.showMoveRange();
    };

    // Crit → dramatic dice overlay; normal hit → just float + log
    if(isCrit){
      this.diceWaiting='player';
      const playerDetail=`Rolled a 20 — the best possible roll. You land a perfect strike and deal double damage! ${dmgText}`;
      const diceArray = wasHidden
        ? [{sides:20,value:atkRoll2,kind:'d20'},{sides:20,value:atkRoll,kind:'d20'},...dr.diceValues]
        : [{sides:20,value:atkRoll,kind:'d20'},...dr.diceValues];
      this.showDicePopup(rollDisplay,playerDetail,'crit',diceArray);
    } else {
      this._finishPlayerAction();
    }
  },

  tryMoveAndAttack(enemy){
    if(!enemy||!enemy.alive||!this.combatGroup.includes(enemy)) return;
    if(!this.isPlayerTurn()) return;
    if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }

    // BG3: use turnStart budget, not playerMoves (movement is free until action)
    const anchor = this.turnStartTile || this.playerTile;
    const totalBudget = this.turnStartMoves ?? this.playerMoves;
    const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1},{x:1,y:1}];
    const moveBlk=(x,y)=>this.isBlockedTile(x,y,{doorMode:false});
    let bestReachPath=null, bestReachAdj=null, bestWalkCost=Infinity, bestAnchorCost=Infinity;
    let reachable=false;
    for(const d of dirs){
      const ax=enemy.tx+d.x, ay=enemy.ty+d.y;
      if(ax<0||ay<0||ax>=COLS||ay>=ROWS||this.isWallTile(ax,ay)) continue;
      if(this.enemies.some(e=>e.alive&&e.tx===ax&&e.ty===ay)) continue;
      // Check budget from anchor (turn start)
      const pFromStart=bfs(anchor.x,anchor.y,ax,ay,moveBlk);
      if(!pFromStart.length) continue;
      const costFromStart=pathTileCost(pFromStart,anchor);
      if(costFromStart>totalBudget+0.001) continue; // over budget
      reachable=true;
      // Path from current position for the actual walk — pick shortest
      const p=bfs(this.playerTile.x,this.playerTile.y,ax,ay,moveBlk);
      if(!p.length) continue;
      const walkCost=pathTileCost(p,this.playerTile);
      if(walkCost<bestWalkCost){
        bestReachPath=p; bestReachAdj={x:ax,y:ay}; bestWalkCost=walkCost; bestAnchorCost=costFromStart;
      }
    }

    if(bestReachPath){
      const targetEnemy=enemy;
      this.clearMoveRange();
      this._movingToAttack=true;
      this.setDestination(bestReachAdj.x,bestReachAdj.y,()=>{
        this._movingToAttack=false;
        // BG3: update position tracking — attack will commit
        this.playerMovesUsed=bestAnchorCost;
        this.playerMoves=Math.max(0,totalBudget-bestAnchorCost);
        this.updateResBar();
        if(this.playerAP>0&&targetEnemy.alive){
          const moveAtkId = this._defaultAtkIdForMove || 'attack';
          this._defaultAtkIdForMove = null;
          this.time.delayedCall(100,()=>this.playerAttackEnemy(targetEnemy, moveAtkId));
        } else {
          this.showMoveRange();
        }
      });
      return;
    }

    // Not reachable within budget or no path exists
    if(reachable){
      this.showStatus(`Can't reach ${enemy.displayName} — no clear path.`);
    } else {
      this.showStatus(`Can't reach ${enemy.displayName} — not enough movement.`);
    }
  },

  canFleeCombat(){
    if(this.mode!==MODE.COMBAT) return { ok:false, reason:'Not in combat.' };
    const alive=this.combatGroup.filter(e=>e.alive);
    if(!alive.length) return { ok:true, reason:'' };

    const minDist=Math.max(1,Number(COMBAT_RULES.fleeMinDistance||6));
    const nearest=alive.reduce((m,e)=>Math.min(m,tileDist(e.tx,e.ty,this.playerTile.x,this.playerTile.y)),Infinity);
    if(nearest<minDist){
      return { ok:false, reason:`Too close to enemies (need ${minDist}+ tiles).` };
    }

    if(COMBAT_RULES.fleeRequiresNoLOS!==false){
      const seen=alive.some(e=>{
        return this.canEnemySeeTile(e,this.playerTile.x,this.playerTile.y,{checkFOV:false,useEffectiveSight:false});
      });
      if(seen) return { ok:false, reason:'Cannot flee while enemies still have line of sight.' };
    }

    return { ok:true, reason:'' };
  },

  tryFleeCombat(){
    if(!this.isPlayerTurn()) return;
    if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }

    const chk=this.canFleeCombat();
    if(!chk.ok){
      this.showStatus(`Flee failed: ${chk.reason}`);
      return;
    }

    this.playerAP=0;
    this.processStatusEffectsForActor('player','on_action',{actionId:'flee'});
    this.snapshotMoveResetAnchor();
    this.pendingAction=null;
    this.clearPendingAction();
    this.updateResBar();
    this.setActionButtonsUsed(true);
    withHotbar(hotbar => hotbar.markAllUsed(true));
    this.showStatus('Flee successful. Breaking away...');
    this.time.delayedCall(140,()=>this.exitCombat('flee'));
  },

  // ─────────────────────────────────────────
  // DICE
  // ─────────────────────────────────────────

  /** Finish player action without dice overlay (normal hit/miss) */
  _finishPlayerAction(){
    if(this._afterPlayerDice){ const cb=this._afterPlayerDice; this._afterPlayerDice=null; cb(); }
  },

  _handleDiceDismiss(){
    clearTimeout(this._diceAutoTimer);
    const ov=document.getElementById('dice-ov');
    if(ov) ov.classList.remove('show');
    if(this.diceWaiting==='enemy'){
      this.diceWaiting=false;
      if(this._pendingEnemyTurnActor){
        this.processStatusEffectsForActor(this._pendingEnemyTurnActor,'turn_end');
        this._pendingEnemyTurnActor=null;
      }
      this.advanceEnemyTurn();
    } else if(this.diceWaiting==='player'){
      this.diceWaiting=false;
      if(this._afterPlayerDice){ const cb=this._afterPlayerDice; this._afterPlayerDice=null; cb(); }
    } else {
      this.diceWaiting=false;
    }
  },

});
