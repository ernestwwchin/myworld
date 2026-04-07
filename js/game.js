// ═══════════════════════════════════════════════════════
// game.js — GameScene (Phaser scene with all game logic)
// ═══════════════════════════════════════════════════════

class GameScene extends Phaser.Scene {
  constructor(){ super('GameScene'); }

  log(category, message, data=null){
    const style=`color: #c9a84c; font-weight: bold;`;
    console.log(`%c[${category}]%c ${message}`, style, '', data||'');
  }

  logCombat(action, details){
    console.group(`%c⚔ COMBAT: ${action}`, 'color: #e74c3c; font-weight: bold;');
    console.table(details);
    console.groupEnd();
  }

  isExploreMode(){
    return this.mode===MODE.EXPLORE||this.mode===MODE.EXPLORE_TB;
  }

  fmtSigned(n){
    const v=Number(n)||0;
    return v>=0?`+${v}`:`${v}`;
  }

  formatRollLine(roll,mod,total,ac,modSource=''){
    const label=modSource||this.fmtSigned(mod);
    return `d20[${roll}] + ${label} = ${total} vs AC${ac}`;
  }

  formatDamageBreakdown(str,modSource=''){
    const s=String(str||'');
    const m=s.match(/^(.*?)([+-]\d+)?\[([^\]]*)\]=(-?\d+)$/);
    if(!m) return s;
    const dice=m[1]||'';
    const bonus=m[2]||'';
    const rolls=m[3]||'';
    const total=m[4]||'';
    const bonusText=bonus&&modSource?`${modSource}(${bonus})`:bonus;
    return `${dice}[${rolls}] + ${bonusText} = ${total}`;
  }

  isWallTile(x,y){
    const v=MAP?.[y]?.[x];
    return v===TILE.WALL||v==='#';
  }

  isDoorTile(x,y){
    if (!this._entityTileIndex) return false;
    return this.hasEntityType(x, y, 'door');
  }

  isChestTile(x,y){
    if (!this._entityTileIndex) return false;
    return this.hasEntityType(x, y, 'chest');
  }

  // cancelCurrentMove — implemented in movement-system.js

  preload(){ generateSprites(this); }

  create(){
    generateAnims(this);
    this.cameras.main.setBackgroundColor('#0a0a0f');
    // state
    this.mode=MODE.EXPLORE;
    this.pStats=Object.assign({},PLAYER_STATS);
    this.pStats.features=[...PLAYER_STATS.features];
    this.pStats.savingThrows=new Set(PLAYER_STATS.savingThrows);
    this.playerHP=this.pStats.maxHP; this.playerMaxHP=this.pStats.maxHP;
    this.playerTile={x:PLAYER_STATS.startTile.x, y:PLAYER_STATS.startTile.y};
    this.isMoving=false; this.movePath=[]; this.onArrival=null; this.pathDots=[]; this._movingToAttack=false; this.lastCompletedTile={...PLAYER_STATS.startTile};
    this.rangeTiles=[]; this.atkRangeTiles=[]; this.sightTiles=[];
    this.fogVisited=[]; this.fogVisible=[];
    this.detectMarkers=[];
    this.combatGroup=[]; this.turnOrder=[]; this.turnIndex=0;
    this.playerAP=1; this.playerMoves=Number(COMBAT_RULES.playerMovePerTurn||5); this.playerMovesUsed=0;
    this.pendingAction=null; this.wanderTimer=0;
    this.diceWaiting=false; this._afterPlayerDice=null;
    this.turnStartTile={...PLAYER_STATS.startTile};
    this.enemySightEnabled=true;
    this.playerHidden=false; this.playerStealthRoll=0;
    this.playerEffects=[];
    this._pendingEnemyTurnActor=null;
    this._queuedEngageEnemy=null;
    this._engageInProgress=false;
    this._suppressExploreSightChecks=false;
    this._manualExploreTurnBased=false;
    this._returnToExploreTB=false;
    this._exploreTBMovesRemaining=0;
    this._exploreTBEnemyPhase=false;
    this._exploreTBInputLatch=false;
    this.mapLights=[];
    this.globalLight='dark';
    this.doorStates={};
    this.tileSprites=[];
    this.stageSprites=[];

    // map tiles
    for(let r=0;r<ROWS;r++){
      this.tileSprites[r]=[];
      for(let c=0;c<COLS;c++){
      const t=MAP[r][c];
      let k='t_floor';
      if(this.isWallTile(c,r))k='t_wall'; else if(t===TILE.STAIRS)k='t_stairs';
      else if(t===TILE.WATER)k='t_water'; else if(t===TILE.GRASS)k='t_grass';
      this.tileSprites[r][c]=this.add.image(c*S+S/2,r*S+S/2,k).setDisplaySize(S,S);
      }
    }
    this.startTileAnimations();
    this.spawnStageSprites();

    // enemies
    this.enemies=ENEMY_DEFS.map(def=>{
      const img=this.add.sprite(def.tx*S+S/2,def.ty*S+S/2,`spr_${def.type}_idle`).setDisplaySize(S,S).setDepth(9).setInteractive();
      const hpBg=this.add.rectangle(def.tx*S+S/2,def.ty*S-4,S-8,5,0x1a1a2e).setDepth(11);
      const hpFg=this.add.rectangle(def.tx*S+S/2,def.ty*S-4,S-8,5,0xe74c3c).setDepth(12);
      const lbl=this.add.text(def.tx*S+S/2,def.ty*S+S/2+S*0.52,def.type.toUpperCase(),{fontSize:'7px',fill:'#aaaacc',letterSpacing:1}).setOrigin(0.5).setDepth(12).setAlpha(0.7);
      const sightRing=this.add.circle(def.tx*S+S/2,def.ty*S+S/2,def.sight*S,0xe74c3c,0).setDepth(2).setStrokeStyle(1,0xe74c3c,0.08).setAlpha(0);
      const fa=this.add.triangle(def.tx*S+S/2,def.ty*S+S/2,0,-8,12,0,0,8,0xf0c060,0.7).setDepth(13);
      fa.setRotation(def.facing*Math.PI/180);
      const enemy={...def,img,hpBg,hpFg,lbl,sightRing,fa,alive:true,inCombat:false,lastSeenPlayerTile:{x:def.tx,y:def.ty},searchTurnsRemaining:0};
      enemy.effects=this.normalizeEffects(def.effects||def.statuses||[]);
      this.playActorIdle(img, def.type);
      img.on('pointerdown',()=>this.onTapEnemy(enemy));
      return enemy;
    });

    // player
    this.player=this.add.sprite(this.playerTile.x*S+S/2,this.playerTile.y*S+S/2,'spr_player_idle').setDisplaySize(S,S).setDepth(10);
    this.playActorIdle(this.player,'player');
    this.turnHL=this.add.image(-100,-100,'t_turn').setDisplaySize(S,S).setDepth(9).setAlpha(0);
    this.tapInd=this.add.image(-100,-100,'t_tap').setDisplaySize(S,S).setDepth(8).setAlpha(0);
    this.fogLayer=this.add.graphics().setDepth(15);

    this.fogVisited=Array.from({length:ROWS},()=>Array(COLS).fill(false));
    this.fogVisible=Array.from({length:ROWS},()=>Array(COLS).fill(false));

    // camera
    // Keep player pinned at screen center (no follow lag/drift)
    // Remove bounds so camera can center player even near map edges.
    this.cameras.main.removeBounds();
    this.cameras.main.startFollow(this.player,true,1,1);
    this.cameras.main.setDeadzone(0,0);
    this.cameras.main.setFollowOffset(0,0);
    this.cameras.main.setZoom(1.2);

    // input
    const hz=this.add.zone(0,0,COLS*S,ROWS*S).setOrigin(0,0).setDepth(0).setInteractive();
    hz.on('pointerdown',ptr=>this.onTap(ptr));
    this.initInputHandlers();

    this.cursors=this.input.keyboard.createCursorKeys();
    this.wasd=this.input.keyboard.addKeys({up:Phaser.Input.Keyboard.KeyCodes.W,down:Phaser.Input.Keyboard.KeyCodes.S,left:Phaser.Input.Keyboard.KeyCodes.A,right:Phaser.Input.Keyboard.KeyCodes.D});
    this.keyDelay=0;

    // Debug shortcuts (Ctrl+Shift+*)
    this.input.keyboard.on('key-ctrl-shift-l', ()=>{ this.logEvent('DEBUG', 'MANUAL_SEND'); this.sendDebugLogs(); });
    this.input.keyboard.on('key-ctrl-shift-c', ()=>{ this.clearDebugLogs(); this.showStatus('Debug logs cleared'); });

    // Explore mode shortcuts
    this.input.keyboard.on('key-h', ()=>{ if(this.isExploreMode()) this.tryHideInExplore(); });

    // Explore hotbar (touch/tablet — BG3-style persistent bottom bar)
    const eHide = document.getElementById('btn-explore-hide');
    const eSight = document.getElementById('btn-explore-sight');
    const eTB = document.getElementById('btn-explore-tb');
    const eStats = document.getElementById('btn-explore-stats');
    if (eHide) eHide.onclick = () => { if(this.isExploreMode()) this.tryHideInExplore(); this.syncExploreBar(); };
    if (eSight) eSight.onclick = () => { this.toggleEnemySight(); this.syncExploreBar(); };
    if (eTB) eTB.onclick = () => { this.toggleExploreTurnBased(); this.syncExploreBar(); };
    if (eStats) eStats.onclick = () => { toggleStats(); };
    this.syncExploreBar();

    this.initActionButtons();
    document.getElementById('btn-rmove').onclick=()=>this.resetMove();
    document.getElementById('btn-end').onclick=()=>this.endPlayerTurn();

    this.mapLights=(window._MAP_META&&Array.isArray(window._MAP_META.lights))?window._MAP_META.lights:[];
    this.globalLight=(window._MAP_META&&window._MAP_META.globalLight)?String(window._MAP_META.globalLight).toLowerCase():'dark';
    this.initEntities();
    // Global callbacks for standalone functions (hasLOS, wallBlk in helpers.js)
    window._isDoorClosed=(x,y)=>this.isDoorClosed(x,y);
    window._isDoorPassable=(x,y)=>this.isDoorPassable(x,y);
    window._tileBlocksSight=(x,y)=>{
      const ents=this.getEntitiesAt(x,y);
      return ents.some(e=>e.blocksSight());
    };
    window._tileBlocksMovement=(x,y)=>{
      const ents=this.getEntitiesAt(x,y);
      return ents.some(e=>e.blocksMovement(this));
    };

    this.ui = new GameUIController(this);

    // Initialize debug logger for AI analysis
    this.initDebugLogger();
    this.initDebugBridge();
    this.sessionStartTime = Date.now();
    this.logEvent('GAME', 'SESSION_START', { mode: this.mode });

    this.updateHUD();
    this.updateStatsPanel();
    this.playerEffects=this.normalizeEffects(this.pStats.effects||[]);
    this.drawSightOverlays();
    this.updateFogOfWar();
    this.time.addEvent({delay:1200,loop:true,callback:()=>{ if(this.mode===MODE.EXPLORE) this.wanderEnemies(); }});
    this.startExploreStatusTicker();
    this.showStatus('Explore — enemies will spot you from their facing direction!');

    // Init event system (YAML-driven events + dialogs)
    if (typeof EventRunner !== 'undefined') {
      EventRunner.init(this, ModLoader._modData?._stageEvents || []);
    }
    if (typeof DialogRunner !== 'undefined') {
      DialogRunner.init(this, ModLoader._modData?._stageDialogs || {});
    }
  }

  playActorIdle(sprite,type){
    if(!sprite||!sprite.anims) return;
    const key=`anim_${type}_idle`;
    if(this.anims.exists(key)) sprite.anims.play(key,true);
  }

  playActorMove(sprite,type,isRun=false){
    if(!sprite||!sprite.anims) return;
    const key=isRun?`anim_${type}_run`:`anim_${type}_walk`;
    if(this.anims.exists(key)) sprite.anims.play(key,true);
  }

  startTileAnimations(){
    const cfg=(window._MAP_META&&window._MAP_META.tileAnimations)||{};
    const enabled=cfg.enabled!==false;
    if(!enabled) return;
    const speed=Math.max(180, Number(cfg.speedMs||420));
    this.tileAnimPhase=0;
    this.time.addEvent({delay:speed,loop:true,callback:()=>{
      this.tileAnimPhase=(this.tileAnimPhase+1)%2;
      for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
        const t=MAP[y][x];
        if(t===TILE.WATER){
          this.tileSprites[y][x].setTexture(this.tileAnimPhase===0?'t_water_1':'t_water_2');
        } else if(t===TILE.GRASS){
          this.tileSprites[y][x].setTexture(this.tileAnimPhase===0?'t_grass_1':'t_grass_2');
        }
      }
    }});
  }

  spawnStageSprites(){
    const defs=(window._MAP_META&&Array.isArray(window._MAP_META.stageSprites))?window._MAP_META.stageSprites:[];
    this.stageSprites=[];
    for(const s of defs){
      const tx=Number(s.x), ty=Number(s.y);
      if(Number.isNaN(tx)||Number.isNaN(ty)||tx<0||ty<0||tx>=COLS||ty>=ROWS) continue;
      const type=String(s.type||s.key||'').toLowerCase();
      const key=s.texture||s.key||(type==='torch'?'deco_torch':type==='banner'?'deco_banner':type==='crystal'?'deco_crystal':'deco_torch');
      if(!this.textures.exists(key)) continue;
      const depth=Number(s.depth||6);
      const alpha=Math.max(0,Math.min(1,Number(s.alpha??1)));
      const scale=Math.max(0.3,Number(s.scale||1));
      const img=this.add.image(tx*S+S/2,ty*S+S/2,key).setDepth(depth).setAlpha(alpha).setScale(scale);
      if(s.pulse){
        const amp=Math.max(0.02,Number(s.pulseAmount||0.07));
        this.tweens.add({targets:img,alpha:{from:Math.max(0,alpha-amp),to:Math.min(1,alpha+amp)},duration:700,yoyo:true,repeat:-1});
      }
      this.stageSprites.push(img);
    }
  }

  normalizeEffects(list){
    if(!Array.isArray(list)) return [];
    return list.map(raw=>{
      const e={...(raw||{})};
      const id=String(e.id||e.type||'effect').toLowerCase();
      return {
        ...e,
        id,
        type:String(e.type||id).toLowerCase(),
        trigger:String(e.trigger||'turn_start').toLowerCase(),
        duration:Number(e.duration??e.turns??3),
        elapsedMs:0,
      };
    });
  }

  actorLabel(actor){
    if(actor==='player') return this.pStats?.name||'Player';
    return actor?.type||'Enemy';
  }

  getAbilityDef(id){
    if(!id) return null;
    return ABILITY_DEFS?.[id] || null;
  }

  _parseAbilityModifierToken(tok, actor){
    const t=String(tok||'').toLowerCase();
    if(!t) return 0;
    if(t==='prof') return Number(actor?.profBonus || this.pStats?.profBonus || 0);
    if(t.startsWith('ability:')){
      const st=t.split(':')[1];
      if(actor==='player') return dnd.mod(this.pStats?.[st] || 10);
      return dnd.mod(actor?.stats?.[st] || 10);
    }
    const n=Number(tok);
    return Number.isFinite(n)?n:0;
  }

  _resolveAbilityDamageSpec(actor, ability){
    const tpl=ability?.template||{};
    const dmg=tpl.damage||{};
    const base=dmg.base;
    let spec=(actor?.damageFormula||this.pStats?.damageFormula||'1d4');
    if(Array.isArray(base)&&base.length>=3){
      spec=[Number(base[0]),Number(base[1]),Number(base[2])];
    } else if(typeof base==='string'&&/^\d*d\d+/i.test(base)){
      spec=base;
    } else if(base==='actorAttack'||base==='weapon'){
      spec=(actor?.damageFormula||this.pStats?.damageFormula||'1d4');
    }
    const addMods=Array.isArray(dmg.addMods)?dmg.addMods:[];
    const bonus=addMods.reduce((sum,m)=>sum+this._parseAbilityModifierToken(m,actor),0);
    const norm=dnd.normalizeDamageSpec(spec);
    norm.bonus=Number(norm.bonus||0)+bonus;
    return norm;
  }

  resolveAbilityDamage(abilityId, actor='player', isCrit=false){
    const ability=this.getAbilityDef(abilityId);
    const spec=ability?this._resolveAbilityDamageSpec(actor,ability):(actor?.damageFormula||this.pStats?.damageFormula||'1d4');
    return dnd.rollDamageSpec(spec,isCrit);
  }

  evaluateSaveChecks(receiver, saveCfg){
    if(!saveCfg) return { resisted:false, details:'' };
    const checks=Array.isArray(saveCfg.checks)
      ? saveCfg.checks
      : [{ stat: saveCfg.stat, dc: saveCfg.dc }];
    const mode=String(saveCfg.mode||'all').toLowerCase();
    if(!checks.length) return { resisted:false, details:'' };

    const results=checks.map(ch=>{
      const stat=String(ch?.stat||'con').toLowerCase();
      const dc=Number(ch?.dc||10);
      const mod=(receiver==='player')
        ? dnd.mod(this.pStats?.[stat]||10)
        : dnd.mod(receiver?.stats?.[stat]||10);
      const roll=dnd.roll(1,20)+mod;
      return { stat, dc, roll, pass: roll>=dc };
    });

    const resisted=mode==='any'
      ? results.some(r=>r.pass)
      : results.every(r=>r.pass);
    const details=results.map(r=>`${r.stat.toUpperCase()} ${r.roll}/${r.dc}`).join(', ');
    return { resisted, details };
  }

  applyAbilityOnHitStatuses(abilityId, actor, target){
    const ability=this.getAbilityDef(abilityId);
    if(!ability) return;
    const statuses=ability?.template?.onHit?.statuses;
    if(!Array.isArray(statuses)||!statuses.length) return;
    const caster=actor==='player'?'player':actor;
    for(const s of statuses){
      const statusId=String(s.id||s.type||'effect').toLowerCase();
      const base=(STATUS_DEFS&&STATUS_DEFS[statusId])?STATUS_DEFS[statusId]:{};
      const scope=String(s.applyTo||s.target||'target').toLowerCase();
      let receiver=target;
      if(scope==='caster'||scope==='self') receiver=caster;
      if(scope==='target'&&!receiver) continue;

      const saveCfg=s.save||base.save||null;
      if(saveCfg){
        const saveRes=this.evaluateSaveChecks(receiver, saveCfg);
        if(saveRes.resisted){
          this.showStatus(`${this.actorLabel(receiver)} resisted ${statusId}${saveRes.details?` (${saveRes.details})`:''}.`);
          continue;
        }
      } else {
        const chance=Math.max(0,Math.min(1,Number(s.chance??base.chance??1)));
        if(Math.random()>chance) continue;
      }

      const fx=this.actorEffects(receiver);
      fx.push({
        ...base,
        ...s,
        id: statusId,
        type: String(s.type||base.type||statusId).toLowerCase(),
        trigger: String(s.trigger||base.trigger||'turn_end').toLowerCase(),
        duration: Number(s.duration??base.duration??2),
        onTrigger: { ...(base.onTrigger||{}), ...(s.onTrigger||{}) },
        elapsedMs: 0,
      });
      this.showStatus(`${this.actorLabel(receiver)} is affected by ${statusId}.`);
    }
  }

  // actorEffects, removeEffect, applyDamageToActor, processStatusEffectsForActor,
  // endEnemyTurn, startExploreStatusTicker — implemented in status-effect-system.js

  // toggleEnemySight — implemented in sight-system.js

  // toggleExploreTurnBased, beginExploreTurnBasedPlayerTurn, endExploreTurnBasedPlayerTurn,
  // runExploreTurnBasedEnemyPhase — implemented in explore-tb-system.js

  // clearDetectMarkers, showDetectedEnemyMarker, drawSightOverlays, clearSightOverlays,
  // checkSight, toggleEnemySight — implemented in sight-system.js
  // computeVisibleTiles, updateFogOfWar, updateEnemyVisibilityByFog, syncEnemySightRings,
  // isTileVisibleToPlayer, tileLightLevel, effectiveEnemySight — implemented in fog-system.js

  getEnemyPassivePerception(enemy){
    // Passive Perception = 10 + Wisdom modifier + proficiency (if trained)
    const wiseMod = Math.floor((enemy.stats.wis - 10) / 2);
    const profBonus = enemy.skillProficiencies?.has('perception') 
      ? dnd.profBonus(enemy.level || 1)
      : 0;
    return 10 + wiseMod + profBonus;
  }

  syncExploreBar(){
    const bar = document.getElementById('explore-bar');
    if (!bar) return;
    const show = this.isExploreMode();
    bar.classList.toggle('hidden', !show);
    // Hide button glow when hidden
    const hideBtn = document.getElementById('btn-explore-hide');
    if (hideBtn) hideBtn.classList.toggle('active', !!this.playerHidden);
    // Sight toggle state
    const sightBtn = document.getElementById('btn-explore-sight');
    if (sightBtn) sightBtn.classList.toggle('off', !this.enemySightEnabled);
    // TB toggle state
    const tbBtn = document.getElementById('btn-explore-tb');
    if (tbBtn) tbBtn.classList.toggle('off', this.mode !== MODE.EXPLORE_TB);
  }

  // tryHideAction — implemented in ability-system.js
  // tryHideInExplore — implemented in ability-system.js
  // hideContextMenu, showContextMenu, onTap, toggleExploreDoor, toggleExploreTBDoor — implemented in input-system.js

  onTapEnemy(enemy){
    if(!enemy.alive) return;
    if(this.isExploreMode()){
      const pop=document.getElementById('enemy-stat-popup');
      if(this._statPopupEnemy===enemy&&pop&&pop.style.display!=='none'){
        pop.style.display='none';
        this._statPopupEnemy=null;
        if(window._engageEnemy){ window._engageEnemy(); window._engageEnemy=null; }
        return;
      }
      this.showEnemyStatPopup(enemy);
      return;
    }
    this.onTapCombat(enemy.tx,enemy.ty,enemy);
  }

  showCombatEnemyPopup(enemy){
    if(this.ui) return this.ui.showCombatEnemyPopup(enemy);
  }

  showEnemyStatPopup(enemy){
    if(this.ui) return this.ui.showEnemyStatPopup(enemy);
  }

  // onTapCombat, enterCombat, exitCombat, startNextTurn, endPlayerTurn, isPlayerTurn,
  // resetMove, advanceEnemyTurn, doEnemyTurn, doEnemyAttack, canFleeCombat, tryFleeCombat,
  // animEnemyMove, selectAction, clearPendingAction, playerAttackEnemy, tryMoveAndAttack,
  // _handleDiceDismiss, showMoveRange, clearMoveRange, inMoveRange, showAtkRange,
  // clearAtkRange — implemented in combat-system.js

  showDicePopup(rollLine,detailLine,type,diceValues){
    if(this.ui) return this.ui.showDicePopup(rollLine,detailLine,type,diceValues);
  }

  // drawSightOverlays, clearSightOverlays, checkSight — implemented in sight-system.js

  // setDestination, clearPathDots, advancePath, wanderEnemies — implemented in movement-system.js

  // ─────────────────────────────────────────
  // LEVEL UP
  // ─────────────────────────────────────────
  checkLevelUp(){
    const p=this.pStats;
    let leveled=false;
    while(p.level<20&&p.xp>=DND_XP[p.level]){
      p.level++; leveled=true;
      p.profBonus=dnd.profBonus(p.level);
      const hr=Math.floor(Math.random()*p.hitDie)+1;
      const hg=Math.max(1,hr+dnd.mod(p.con));
      p.maxHP+=hg; this.playerMaxHP=p.maxHP; this.playerHP=this.playerMaxHP;
      if(FIGHTER_FEATURES[p.level]) for(const f of FIGHTER_FEATURES[p.level]) p.features.push(f);
      if(ASI_LEVELS.has(p.level)){ p.asiPending++; this.showASIPanel(); }
      if(p.level===5||p.level===11) this.spawnFloat(this.player.x,this.player.y-50,'EXTRA ATTACK!','#f39c12');
      this.spawnFloat(this.player.x,this.player.y-30,`LEVEL ${p.level}!`,'#9b59b6');
      this.showStatus(`Level Up! Now level ${p.level}! HP+${hg}`);
    }
    if(leveled) this.updateHUD();
    this.updateStatsPanel();
  }

  showASIPanel(){
    if(this.ui) return this.ui.showASIPanel();
  }

  applyASI(s1,s2){
    const p=this.pStats; if(p.asiPending<=0) return;
    p[s1]=Math.min(20,p[s1]+1); p[s2]=Math.min(20,p[s2]+1); p.asiPending--;
    const norm=dnd.normalizeDamageSpec(p.damageFormula||'1d4');
    norm.bonus=dnd.mod(p.str);
    p.damageFormula=dnd.damageSpecToString(norm);
    const panel=document.getElementById('asi-panel'); if(panel) panel.style.display='none';
    this.spawnFloat(this.player.x,this.player.y-40,`${s1.toUpperCase()}+1 ${s2.toUpperCase()}+1`,'#2ecc71');
    this.updateStatsPanel();
  }

  // ─────────────────────────────────────────
  // HUD / UI
  // ─────────────────────────────────────────
  updateResBar(){
    if(this.ui) return this.ui.updateResBar();
  }

  buildInitBar(){
    if(this.ui) return this.ui.buildInitBar();
  }

  flashBanner(text,type){
    if(this.ui) return this.ui.flashBanner(text,type);
  }

  spawnFloat(x,y,text,color){
    const t=this.add.text(x,y,text,{fontSize:'15px',fill:color,stroke:'#000',strokeThickness:3,fontStyle:'bold'}).setOrigin(0.5).setDepth(30);
    this.tweens.add({targets:t,y:y-44,alpha:0,duration:900,ease:'Power2',onComplete:()=>t.destroy()});
  }

  showStatus(msg){ if(this.ui) return this.ui.showStatus(msg); }

  updateHUD(){
    if(this.ui) return this.ui.updateHUD();
  }

  updateStatsPanel(){
    if(this.ui) return this.ui.updateStatsPanel();
  }

  // ─────────────────────────────────────────
  // UPDATE LOOP — delegates to active mode
  // ─────────────────────────────────────────
  update(time,delta){
    if(this.diceWaiting){ this.keyDelay=0; return; }
    if(!this.isExploreMode()||this.isMoving) return;
    if(this.mode===MODE.EXPLORE_TB) this.updateExploreTB(delta);
    else this.updateExplore(delta);
  }
}
