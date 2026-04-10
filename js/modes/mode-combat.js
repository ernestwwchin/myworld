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

    // 3. Enemies in the same room as the player or any alerted enemy
    //    Must have LOS to the player OR to any alerted enemy (can see the fight)
    const alertedRooms = new Set();
    alertedRooms.add(roomIdAt(this.playerTile.x, this.playerTile.y));
    for (const a of alerted) {
      alertedRooms.add(roomIdAt(a.tx, a.ty));
    }
    alertedRooms.delete(null);

    for (const e of this.enemies) {
      if (!e.alive || alerted.has(e)) continue;
      const eRoom = roomIdAt(e.tx, e.ty);
      if (eRoom === null || !alertedRooms.has(eRoom)) continue;
      // Same room but must be able to perceive the combat:
      // LOS to player, or LOS to any alerted enemy, within hearing range
      const hearRange = Math.max(this.effectiveEnemySight(e), 10);
      const distToPlayer = Math.abs(e.tx - this.playerTile.x) + Math.abs(e.ty - this.playerTile.y);
      if (distToPlayer <= hearRange && hasLOS(e.tx, e.ty, this.playerTile.x, this.playerTile.y)) {
        alerted.add(e); continue;
      }
      // Can see any alerted enemy (heard combat sounds)
      for (const a of [...alerted]) {
        const dA = Math.abs(e.tx - a.tx) + Math.abs(e.ty - a.ty);
        if (dA <= hearRange && hasLOS(e.tx, e.ty, a.tx, a.ty)) {
          alerted.add(e); break;
        }
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
      // Side room enemy: only joins if can see/hear (LOS + range)
      const dist = Math.sqrt((e.tx - this.playerTile.x) ** 2 + (e.ty - this.playerTile.y) ** 2);
      if (dist <= Math.max(this.effectiveEnemySight(e), roomMax) && hasLOS(e.tx, e.ty, this.playerTile.x, this.playerTile.y)) {
        alerted.add(e);
      }
    }

    return alerted;
  },

  tryEngageEnemyFromExplore(enemy) {
    if (!enemy || !enemy.alive) return;
    if (!this.isExploreMode()) return;
    if (this.isMoving) return;

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
      this.spawnFloat(enemy.tx * S + S / 2, enemy.ty * S, isCrit ? `💥${dmg}` : `-${dmg}`, isCrit?'#f39c12':fColor);

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
        this.spawnFloat(enemy.tx * S + S / 2, enemy.ty * S - 10, 'DEFEATED!', '#f0c060', 700);
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

    // Record player's last seen location for all enemies (for search behavior when hiding)
    for (const e of this.enemies) {
      if (e.alive) {
        e.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
        e.searchTurnsRemaining = 0;
      }
    }

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
    this._statPopupEnemy=null;
    this.cameras.main.shake(400, 0.008);
    this.clearSightOverlays();
    this.syncEnemySightRings(false);
    this.updateFogOfWar();
    CombatLog.logSep('COMBAT');
    const enemyNames = this.combatGroup
      .map((e) => e?.displayName || e?.name || e?.type || e?.id || 'Unknown')
      .filter(Boolean);
    const enemyLabel = enemyNames.length
      ? `${enemyNames.length} ${enemyNames.length === 1 ? 'enemy' : 'enemies'} (${enemyNames.join(', ')})`
      : `${alerted?.size ?? this.combatGroup.length} enemies`;
    CombatLog.log(`Combat started — ${enemyLabel}`, 'system', 'combat');
    this.time.delayedCall(700, () => { this.buildInitBar(); this.startNextTurn(); });
  },

  exitCombat(reason='victory'){
    this.mode=MODE.EXPLORE;
    if (this.playerHidden) this._breakStealth(null);
    this.syncExploreBar();
    this.combatGroup=[]; this.turnOrder=[]; this.turnIndex=0; this.pendingAction=null;
    this.diceWaiting=false; this._afterPlayerDice=null; this._movingToAttack=false;
    const ov=document.getElementById('dice-ov'); if(ov) ov.classList.remove('show');
    this.clearMoveRange(); this.clearAtkRange(); this.clearFleeZone();
    this.clearDetectMarkers();
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
  onTapCombat(tx,ty,enemy){
    if(this._movingToAttack) return;
    if(!this.isPlayerTurn()) return;

    // Door interaction — but only if no alive enemy is standing on it
    if(this.isDoorTile(tx,ty)&&!(enemy&&enemy.alive)){
      const adj=Math.abs(this.playerTile.x-tx)+Math.abs(this.playerTile.y-ty)===1;
      if(!adj){ this.showStatus('Move next to the door to interact.'); return; }
      this.toggleDoor(tx,ty);
      return;
    }

    // BG3 flow: Attack selected → click enemy → auto-move into range + attack
    // Clicking a floor tile in attack mode is ignored (must cancel to move freely)
    if(this.pendingAction==='attack'){
      if(enemy&&this.combatGroup.includes(enemy)){
        const dx=Math.abs(this.playerTile.x-enemy.tx), dy=Math.abs(this.playerTile.y-enemy.ty);
        if(dx<=1&&dy<=1){
          this.playerAttackEnemy(enemy);
        } else if(this.playerMoves>0){
          this.tryMoveAndAttack(enemy);
        } else {
          this.showStatus('No movement left to reach this enemy.');
        }
      } else {
        this.showStatus('Attack mode: select an enemy, or cancel to move freely.');
      }
      return;
    }

    // No action selected: click enemy → BG3-style direct attack (no pre-selection needed)
    // Long-press on the enemy sprite shows inspect popup (handled in game.js pointer events)
    if(enemy&&this.combatGroup.includes(enemy)){
      if(this.playerAP<=0){ this.showStatus('Action already used this turn.'); return; }
      const dx=Math.abs(this.playerTile.x-enemy.tx), dy=Math.abs(this.playerTile.y-enemy.ty);
      if(dx<=1&&dy<=1){
        this.playerAttackEnemy(enemy);
      } else if(this.playerMoves>0){
        this.tryMoveAndAttack(enemy);
      } else {
        this.showStatus('No movement left to reach this enemy.');
      }
      return;
    }

    if(enemy&&!this.combatGroup.includes(enemy)){
      this.showStatus('That enemy is not in this fight.');
      return;
    }

    if(!this.isWallTile(tx,ty)){
      if(this.ui) this.ui.dismissEnemyPopup();
      if(this.playerMoves<=0){ this.showStatus('No movement left.'); return; }
      if(this.enemies.some(e=>e.alive&&e.tx===tx&&e.ty===ty)){ this.showStatus('Cannot move onto an enemy tile.'); return; }
      const path=bfs(this.playerTile.x,this.playerTile.y,tx,ty,wallBlk);
      if(!path.length){ this.showStatus('Cannot reach that tile.'); return; }
      if(path.length>this.playerMoves){
        this.showMoveRange();
        this.showStatus(`Too far (${path.length} tiles), you have ${this.playerMoves}.`);
        return;
      }
      const moveCost=path.length;
      this.clearMoveRange();
      this.setDestination(tx,ty,()=>{
        this.playerMovesUsed+=moveCost;
        this.playerMoves=Math.max(0,this.playerMoves-moveCost);
        this.updateResBar();
        if(this.playerMoves>0) this.showMoveRange();
        if(this.playerMoves<=0&&this.playerAP<=0) this.endPlayerTurn();
      });
    }
  },

  // ─────────────────────────────────────────
  // TURN MANAGEMENT
  // ─────────────────────────────────────────
  startNextTurn(){
    this.turnOrder=this.turnOrder.filter(t=>t.id==='player'||(t.enemy&&t.enemy.alive));
    if(!this.turnOrder.length||this.combatGroup.every(e=>!e.alive)){ this.exitCombat(); return; }

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
      this.turnHL.setPosition(this.player.x,this.player.y).setAlpha(1);
      this.tweens.add({targets:this.turnHL,alpha:0.35,duration:600,yoyo:true,repeat:-1});
      this.updateResBar();
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
    if(this.ui) this.ui.dismissEnemyPopup();
    if(!fromStatusSkip) this.processStatusEffectsForActor('player','turn_end');
    if(typeof this.tickStatMods==='function') this.tickStatMods();
    this.playerMoves=0; this.playerAP=0;
    this.diceWaiting=false; this._afterPlayerDice=null; this._movingToAttack=false;
    this.clearPendingAction(); this.clearMoveRange(); this.clearAtkRange();
    this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
    document.getElementById('action-bar').classList.remove('show');
    document.getElementById('res-pips').classList.remove('show');
    this.turnIndex++;
    this.time.delayedCall(200,()=>this.startNextTurn());
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
    if(action==='attack'){
      if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }
      // Toggle: clicking attack again deselects it
      if(this.pendingAction==='attack'){
        this.clearPendingAction();
        this.showMoveRange();
        this.showStatus('Attack cancelled.');
        return;
      }
      this.pendingAction='attack';
      this.setSelectedActionButton('attack');
      withHotbar(hotbar => hotbar.setSelected('attack'));
      this.clearMoveRange(); this.showAtkRange();
      this.showStatus('Select an enemy to attack.');
    } else if(action==='sleep_cloud'){
      this.showStatus('Sleep Cloud action setup is not wired to a targeting flow yet.');
      this.pendingAction=null;
      this.setSelectedActionButton('');
      withHotbar(hotbar => hotbar.clearSelection());
    } else if(action==='dash'){
      if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }
      this.playerAP=0; this.playerMoves+=Number(COMBAT_RULES.dashMoveBonus||4);
      this.processStatusEffectsForActor('player','on_action',{actionId:'dash'});
      this.snapshotMoveResetAnchor();
      this.pendingAction=null;
      this.setActionButtonsUsed(true);
      withHotbar(hotbar => hotbar.markAllUsed(true));
      this.updateResBar(); this.clearMoveRange(); this.showMoveRange();
      this.showStatus(`Dashed! ${this.playerMoves} tiles of movement remaining.`);
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
    this.setSelectedActionButton('');
    withHotbar(hotbar => hotbar.clearSelection());
    this.clearAtkRange(); this.clearFleeZone();
    // If we auto-switched to TB for targeting, no longer applicable
    this._targetingAutoTB=false;
  },

  playerAttackEnemy(enemy){
    if(!this.isPlayerTurn()||this.playerAP<=0) return;
    if(this.ui) this.ui.dismissEnemyPopup();

    const wasHidden = this.playerHidden;
    if (wasHidden) this._breakStealth(null); // silent — attack message shown separately
    const dx=Math.abs(this.playerTile.x-enemy.tx), dy=Math.abs(this.playerTile.y-enemy.ty);
    if(dx>1||dy>1){ this.showStatus('Too far — move closer first.'); return; }
    this.clearPendingAction();
    this.playerAP=0;
    this.processStatusEffectsForActor('player','on_action',{actionId:'attack'});
    this.snapshotMoveResetAnchor();

    const strMod=dnd.mod(this.pStats.str);

    let atkRoll, atkRoll2 = null;
    if(wasHidden){
      atkRoll = dnd.roll(1,20);
      atkRoll2 = dnd.roll(1,20);
      atkRoll = Math.max(atkRoll, atkRoll2);
    } else {
      atkRoll = dnd.roll(1,20);
    }

    const atkTotal=atkRoll+strMod+this.pStats.profBonus;
    const isCrit=atkRoll===20, isMiss=atkRoll===1;
    const hits=isCrit||(!isMiss&&atkTotal>=enemy.ac);

    this.setActionButtonsUsed(true);
    withHotbar(hotbar => hotbar.markAllUsed(true));
    this.updateResBar();

    if(!hits){
      this.tweens.add({targets:enemy.img,x:enemy.img.x+6,duration:60,yoyo:true,repeat:1});
      this.spawnFloat(enemy.tx*S+S/2,enemy.ty*S,isMiss?'NAT 1!':'MISS','#7fc8f8');
      const totalMod=strMod+this.pStats.profBonus;
      const rollDisplay = wasHidden
        ? `d20(${atkRoll2}|${atkRoll}↑) ${totalMod>=0?'+ '+totalMod:'- '+Math.abs(totalMod)} = ${atkTotal} | AC ${enemy.ac}`
        : this.formatRollLine(atkRoll,totalMod,atkTotal,enemy.ac);
      this.showStatus(`Missed ${enemy.displayName}! ${rollDisplay}`);
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

    const dr=this.resolveAbilityDamage('attack','player',isCrit);
    const dmg=Math.max(1,dr.total);
    enemy.hp-=dmg;
    this.applyAbilityOnHitStatuses('attack','player',enemy);

    // Damage type color from weapon
    const wpn=WEAPON_DEFS[this.pStats.weaponId];
    const floatColor=this.dmgColor(wpn&&wpn.damageType);

    this.tweens.add({targets:enemy.img,alpha:0.15,duration:80,yoyo:true,repeat:3});
    this.spawnFloat(enemy.tx*S+S/2,enemy.ty*S,isCrit?`💥${dmg}`:`-${dmg}`,isCrit?'#f39c12':floatColor);
    const ratio=Math.max(0,enemy.hp/enemy.maxHp);
    enemy.hpFg.setDisplaySize((S-8)*ratio,5);
    if(ratio<0.4) enemy.hpFg.setFillStyle(0xe67e22);
    if(ratio<0.15) enemy.hpFg.setFillStyle(0xe74c3c);

    const dmgText=this.formatDamageBreakdown(dr);
    const totalMod2=strMod+this.pStats.profBonus;
    const rollDisplay = wasHidden
      ? `d20(${atkRoll2}|${atkRoll}↑) ${totalMod2>=0?'+ '+totalMod2:'- '+Math.abs(totalMod2)} = ${atkTotal} | AC ${enemy.ac}`
      : this.formatRollLine(atkRoll,totalMod2,atkTotal,enemy.ac);
    this.showStatus(`${isCrit?'CRIT! ':''}${wasHidden?'SNEAK ':''}Hit ${enemy.displayName} for ${dmg}! ${rollDisplay} | ${dmgText}`);
    const pWpn=WEAPON_DEFS[this.pStats.weaponId];
    const pDmgType=pWpn?pWpn.damageType:'';
    CombatLog.logRoll({actor:'You',target:enemy.displayName,result:isCrit?'crit':'hit',damage:dmg,rollDetail:rollDisplay,dmgDetail:`${dmgText}${pDmgType?' '+pDmgType:''}`,extra:wasHidden?'sneak attack':''});

    this._afterPlayerDice=()=>{
      if(enemy.hp<=0){
        enemy.alive=false; enemy.inCombat=false;
        this.tweens.add({targets:[enemy.img,enemy.hpBg,enemy.hpFg,enemy.lbl,enemy.sightRing],alpha:0,duration:500,onComplete:()=>{[enemy.img,enemy.hpBg,enemy.hpFg,enemy.lbl,enemy.sightRing,enemy.fa].forEach(o=>{if(o&&o.destroy)o.destroy();});}});
        if(enemy.fa) this.tweens.add({targets:enemy.fa,alpha:0,duration:300});
        this.spawnFloat(enemy.tx*S+S/2,enemy.ty*S-10,'DEFEATED!','#f0c060',700);
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
    if(this.playerMoves<=0){ this.showStatus('No movement left.'); return; }

    const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
    const moveBlk=(x,y)=>this.isBlockedTile(x,y,{doorMode:false});
    let bestReachPath=null, bestReachAdj=null;
    let bestAnyPath=null;
    for(const d of dirs){
      const ax=enemy.tx+d.x, ay=enemy.ty+d.y;
      if(ax<0||ay<0||ax>=COLS||ay>=ROWS||this.isWallTile(ax,ay)) continue;
      if(this.enemies.some(e=>e.alive&&e.tx===ax&&e.ty===ay)) continue;
      const p=bfs(this.playerTile.x,this.playerTile.y,ax,ay,moveBlk);
      if(!p.length) continue;
      if(!bestAnyPath||p.length<bestAnyPath.length) bestAnyPath=p;
      if(p.length<=this.playerMoves&&(!bestReachPath||p.length<bestReachPath.length)){
        bestReachPath=p;
        bestReachAdj={x:ax,y:ay};
      }
    }

    if(bestReachPath){
      const cost=bestReachPath.length;
      const targetEnemy=enemy;
      this.clearMoveRange();
      this._movingToAttack=true;
      this.setDestination(bestReachAdj.x,bestReachAdj.y,()=>{
        this._movingToAttack=false;
        this.playerMovesUsed+=cost;
        this.playerMoves=Math.max(0,this.playerMoves-cost);
        this.updateResBar();
        if(this.playerAP>0&&targetEnemy.alive){
          this.time.delayedCall(100,()=>this.playerAttackEnemy(targetEnemy));
        } else {
          if(this.playerMoves>0) this.showMoveRange();
        }
      });
      return;
    }

    if(!bestAnyPath){
      this.showStatus('Cannot path to this enemy.');
      return;
    }

    const partial=bestAnyPath.slice(0,this.playerMoves);
    if(!partial.length){
      this.showStatus('Not enough movement to reach.');
      return;
    }

    const stop=partial[partial.length-1];
    const cost=partial.length;
    const targetEnemy=enemy;
    this.clearMoveRange();
    this._movingToAttack=true;
    this.setDestination(stop.x,stop.y,()=>{
      this._movingToAttack=false;
      this.playerMovesUsed+=cost;
      this.playerMoves=Math.max(0,this.playerMoves-cost);
      this.updateResBar();
      const dx=Math.abs(this.playerTile.x-targetEnemy.tx), dy=Math.abs(this.playerTile.y-targetEnemy.ty);
      const inRange=dx<=targetEnemy.atkRange&&dy<=targetEnemy.atkRange;
      if(inRange&&this.playerAP>0&&targetEnemy.alive){
        this.time.delayedCall(100,()=>this.playerAttackEnemy(targetEnemy));
      } else if(!inRange&&this.playerMoves<=0){
        // Ran out of movement before reaching attack range — ask player what to do
        this.showStatus(`Can't reach ${targetEnemy.displayName} — out of movement.`);
        this.showContextMenu(window.innerWidth/2, window.innerHeight*0.65, [
          { label: '⚔ End Turn', action: ()=>this.endPlayerTurn() },
          { label: '✕ Keep Acting', action: ()=>this.showMoveRange() },
        ]);
      } else {
        this.showMoveRange();
      }
    });
  },

  canFleeCombat(){
    if(this.mode!==MODE.COMBAT) return { ok:false, reason:'Not in combat.' };
    const alive=this.combatGroup.filter(e=>e.alive);
    if(!alive.length) return { ok:true, reason:'' };

    const minDist=Math.max(1,Number(COMBAT_RULES.fleeMinDistance||6));
    const nearest=alive.reduce((m,e)=>Math.min(m,Math.abs(e.tx-this.playerTile.x)+Math.abs(e.ty-this.playerTile.y)),Infinity);
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
