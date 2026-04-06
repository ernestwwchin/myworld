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

  oldFormatDamageBreakdown(str){
    const s=String(str||'');
    const m=s.match(/^(.*?)([+-]\d+)?\[([^\]]*)\]=(-?\d+)$/);
    if(!m) return s;
    const dice=m[1]||'';
    const bonus=m[2]||'';
    const rolls=m[3]||'';
    const total=m[4]||'';
    return `${dice}[${rolls}]${bonus}=${total}`;
  }

  isWallTile(x,y){
    const v=MAP?.[y]?.[x];
    return v===TILE.WALL||v==='#';
  }

  isDoorTile(x,y){
    const v=MAP?.[y]?.[x];
    return v===TILE.DOOR||v==='D';
  }

  cancelCurrentMove(){
    if(!this.isMoving) return false;
    this.tweens.killTweensOf(this.player);
    const snap=snapToTile(this.player.x,this.player.y);
    this.playerTile={x:snap.x,y:snap.y};
    this.lastCompletedTile={x:snap.x,y:snap.y};
    this.player.setPosition(snap.x*S+S/2,snap.y*S+S/2);
    this.movePath=[];
    this.isMoving=false;
    this.clearPathDots();
    this.onArrival=null;
    this.playActorIdle(this.player,'player');
    this.updateHUD();
    if(this.mode===MODE.COMBAT&&this.isPlayerTurn()&&this.playerMoves>0) this.showMoveRange();
    this.showStatus('Movement canceled.');
    return true;
  }

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
    this.playerHidden=false;
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
      if(this.isWallTile(c,r))k='t_wall'; else if(this.isDoorTile(c,r))k='t_door';
      else if(t===TILE.CHEST)k='t_chest'; else if(t===TILE.STAIRS)k='t_stairs';
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

    this.initActionButtons();
    document.getElementById('btn-rmove').onclick=()=>this.resetMove();
    document.getElementById('btn-end').onclick=()=>this.endPlayerTurn();

    this.mapLights=(window._MAP_META&&Array.isArray(window._MAP_META.lights))?window._MAP_META.lights:[];
    this.globalLight=(window._MAP_META&&window._MAP_META.globalLight)?String(window._MAP_META.globalLight).toLowerCase():'dark';
    this.initInteractables();
    this.initDoorStates();
    window._isDoorClosed=(x,y)=>this.isDoorClosed(x,y);
    window._isDoorPassable=(x,y)=>this.isDoorPassable(x,y);

    this.ui = new GameUIController(this);

    // Initialize debug logger for AI analysis
    this.initDebugLogger();
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

  actorEffects(actor){
    if(actor==='player') return this.playerEffects;
    if(!actor.effects) actor.effects=[];
    return actor.effects;
  }

  removeEffect(actor,index){
    const fx=this.actorEffects(actor);
    if(index<0||index>=fx.length) return null;
    return fx.splice(index,1)[0]||null;
  }

  applyDamageToActor(actor,dmg,color='#e74c3c',label=''){
    const n=Math.max(1,Math.floor(Number(dmg)||0));
    if(actor==='player'){
      this.playerHP=Math.max(0,this.playerHP-n);
      this.spawnFloat(this.player.x,this.player.y-12,`-${n}`,color);
      this.updateHUD();
      if(this.playerHP<=0) this.showStatus(label||'You have been defeated...');
      return;
    }
    if(!actor||!actor.alive) return;
    actor.hp=Math.max(0,actor.hp-n);
    this.spawnFloat(actor.tx*S+S/2,actor.ty*S-10,`-${n}`,color);
    const ratio=Math.max(0,actor.hp/Math.max(1,actor.maxHp||actor.hp||1));
    if(actor.hpFg){
      actor.hpFg.setDisplaySize((S-8)*ratio,5);
      if(ratio<0.4) actor.hpFg.setFillStyle(0xe67e22);
      if(ratio<0.15) actor.hpFg.setFillStyle(0xe74c3c);
    }
    if(actor.hp<=0){
      actor.alive=false;
      actor.inCombat=false;
      this.tweens.add({targets:[actor.img,actor.hpBg,actor.hpFg,actor.lbl,actor.sightRing],alpha:0,duration:420,onComplete:()=>{
        [actor.img,actor.hpBg,actor.hpFg,actor.lbl,actor.sightRing,actor.fa].forEach(o=>{ if(o&&o.destroy) o.destroy(); });
      }});
      if(actor.fa) this.tweens.add({targets:actor.fa,alpha:0,duration:240});
      this.showStatus(label||`${actor.type} collapses.`);
    }
  }

  processStatusEffectsForActor(actor,trigger,ctx={}){
    const fx=this.actorEffects(actor);
    if(!fx||!fx.length) return {skipTurn:false,acted:false};
    const t=String(trigger||'').toLowerCase();
    const out={skipTurn:false,acted:false};
    const tickMs=Math.max(200,Number(STATUS_RULES?.exploreTickMs||1000));

    for(let i=fx.length-1;i>=0;i--){
      const e=fx[i];
      const trg=String(e.trigger||'turn_start').toLowerCase();
      if(trg!==t&&trg!=='any') continue;

      if(t==='time_tick'){
        const gate=Math.max(200,Number(e.tickMs||tickMs));
        e.elapsedMs=(Number(e.elapsedMs)||0)+Number(ctx.deltaMs||tickMs);
        if(e.elapsedMs<gate) continue;
        e.elapsedMs=0;
      }

      const id=String(e.id||e.type||'effect').toLowerCase();
      const base=(STATUS_DEFS&&STATUS_DEFS[id])?STATUS_DEFS[id]:{};
      const onTrigger={...(base.onTrigger||{}),...(e.onTrigger||{})};

      if(onTrigger.damageDice||e.damageDice){
        const spec=e.damageDice||onTrigger.damageDice||STATUS_RULES?.defaultPoisonDamageDice||[1,4,0];
        const dr=dnd.rollDamageSpec(spec,false);
        const col=onTrigger.damageColor?'#'+Number(onTrigger.damageColor).toString(16).padStart(6,'0'):'#8bc34a';
        this.applyDamageToActor(actor,dr.total,col,`${this.actorLabel(actor)} takes ${id} damage.`);
        this.showStatus(`${this.actorLabel(actor)} suffers ${id} (${dr.str}).`);
        out.acted=true;
      }

      const saveCfg=onTrigger.removeOnSave||e.removeOnSave;
      if(saveCfg&&t==='turn_start'){
        const stat=String(saveCfg.stat||e.wakeStat||'wis').toLowerCase();
        const mod=actor==='player'?dnd.mod(this.pStats[stat]||10):dnd.mod(actor?.stats?.[stat]||10);
        const dc=Number(saveCfg.dc||e.wakeDc||STATUS_RULES?.sleepWakeDc||12);
        const roll=dnd.roll(1,20)+mod;
        if(roll>=dc){
          this.removeEffect(actor,i);
          this.showStatus(`${this.actorLabel(actor)} is no longer ${id}.`);
          continue;
        }
      }

      if(onTrigger.skipTurn===true&&t==='turn_start'){
        out.skipTurn=true;
        out.acted=true;
        this.showStatus(`${this.actorLabel(actor)} is affected by ${id} and skips the turn.`);
      }

      if(Number.isFinite(e.duration)){
        e.duration=Math.max(0,Number(e.duration)-1);
        if(e.duration<=0){
          this.removeEffect(actor,i);
          this.showStatus(`${this.actorLabel(actor)} is no longer ${id}.`);
        }
      }
    }
    return out;
  }

  endEnemyTurn(enemy){
    if(enemy&&enemy.alive) this.processStatusEffectsForActor(enemy,'turn_end');
    this.advanceEnemyTurn();
  }

  startExploreStatusTicker(){
    const tickMs=Math.max(250,Number(STATUS_RULES?.exploreTickMs||1000));
    this.time.addEvent({delay:tickMs,loop:true,callback:()=>{
      if(!this.isExploreMode()) return;
      this.processStatusEffectsForActor('player','time_tick',{deltaMs:tickMs});
      for(const e of this.enemies){
        if(!e.alive||e.inCombat) continue;
        this.processStatusEffectsForActor(e,'time_tick',{deltaMs:tickMs});
      }
    }});
  }

  toggleEnemySight(){
    this.enemySightEnabled=!this.enemySightEnabled;
    if(this.enemySightEnabled&&this.isExploreMode()) this.drawSightOverlays();
    else { this.clearSightOverlays(); this.syncEnemySightRings(false); }
    this.showStatus(this.enemySightEnabled?'Enemy sight overlays ON.':'Enemy sight overlays OFF.');
    return this.enemySightEnabled;
  }

  toggleExploreTurnBased(){
    if(this.mode===MODE.COMBAT){
      this.showStatus('Already in combat turn-based mode.');
      return this.mode;
    }
    this._manualExploreTurnBased=!this._manualExploreTurnBased;
    this.mode=this._manualExploreTurnBased?MODE.EXPLORE_TB:MODE.EXPLORE;
    const badge=document.getElementById('mode-badge');
    if(badge){
      if(this.mode===MODE.EXPLORE_TB){
        badge.className='turnbased';
        badge.textContent='TURN-BASED';
      } else {
        badge.className='realtime';
        badge.textContent='EXPLORE';
      }
    }
    if(this.mode===MODE.EXPLORE_TB) this.beginExploreTurnBasedPlayerTurn();
    else {
      this._exploreTBEnemyPhase=false;
      this._exploreTBMovesRemaining=0;
      this._exploreTBInputLatch=false;
    }
    this.drawSightOverlays();
    this.updateFogOfWar();
    this.showStatus(this.mode===MODE.EXPLORE_TB?'Turn-based exploration enabled.':'Turn-based exploration disabled.');
    return this.mode;
  }

  beginExploreTurnBasedPlayerTurn(){
    if(this.mode!==MODE.EXPLORE_TB) return;
    this._exploreTBEnemyPhase=false;
    this._exploreTBMovesRemaining=1;
    this._exploreTBInputLatch=false;
    this.showStatus('Turn-based explore: your move.');
  }

  endExploreTurnBasedPlayerTurn(){
    if(this.mode!==MODE.EXPLORE_TB) return;
    if(this._exploreTBEnemyPhase) return;
    this._exploreTBMovesRemaining=0;
    this.runExploreTurnBasedEnemyPhase();
  }

  runExploreTurnBasedEnemyPhase(){
    if(this.mode!==MODE.EXPLORE_TB) return;
    if(this._exploreTBEnemyPhase) return;
    this._exploreTBEnemyPhase=true;
    this.showStatus('Turn-based explore: enemy movement...');
    this.wanderEnemies(true);
    this.time.delayedCall(520,()=>{
      if(this.mode!==MODE.EXPLORE_TB) return;
      this._exploreTBEnemyPhase=false;
      this._exploreTBMovesRemaining=1;
      this.checkSight();
      if(this.mode===MODE.EXPLORE_TB) this.showStatus('Turn-based explore: your move.');
    });
  }

  clearDetectMarkers(){
    this.detectMarkers.forEach(m=>{ if(m&&m.destroy) m.destroy(); });
    this.detectMarkers=[];
  }

  isTileVisibleToPlayer(tx,ty){
    if(this.fogVisible&&this.fogVisible[ty]&&typeof this.fogVisible[ty][tx]==='boolean') return this.fogVisible[ty][tx];
    // Fallback when fog is not enabled: LOS from player means visible enough.
    return hasLOS(this.playerTile.x,this.playerTile.y,tx,ty);
  }

  showDetectedEnemyMarker(enemy){
    if(!enemy||!enemy.alive) return;
    const x=enemy.tx*S+S/2, y=enemy.ty*S+S/2;
    const ring=this.add.circle(x,y,S*0.35,0xf1c40f,0).setDepth(18).setStrokeStyle(2,0xf1c40f,0.9);
    const ping=this.add.text(x,y-2,'!?',{fontSize:'12px',fill:'#f1c40f',stroke:'#000',strokeThickness:3,fontStyle:'bold'}).setOrigin(0.5).setDepth(19);
    this.detectMarkers.push(ring,ping);
    this.tweens.add({targets:ring,alpha:0,duration:1200,scaleX:1.9,scaleY:1.9,onComplete:()=>{if(ring&&ring.destroy) ring.destroy();}});
    this.tweens.add({targets:ping,y:y-18,alpha:0,duration:1200,onComplete:()=>{if(ping&&ping.destroy) ping.destroy();}});

    // Briefly reveal enemy silhouette above fog when detected in dark/unseen area.
    const prevDepth=enemy.img.depth;
    const prevAlpha=enemy.img.alpha;
    enemy.img.setDepth(17).setAlpha(0.82);
    this.tweens.add({targets:enemy.img,alpha:0.55,duration:1200,onComplete:()=>{ if(enemy.img&&enemy.img.active){ enemy.img.setDepth(prevDepth).setAlpha(prevAlpha); } }});
  }

  computeVisibleTiles(){
    const vis=Array.from({length:ROWS},()=>Array(COLS).fill(false));
    const r=Math.max(1,Number(FOG_RULES.radius||7));
    const px=this.playerTile.x, py=this.playerTile.y;

    for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
      const tx=px+dx, ty=py+dy;
      if(tx<0||ty<0||tx>=COLS||ty>=ROWS) continue;
      if(Math.sqrt(dx*dx+dy*dy)>r+0.35) continue;
      if(hasLOS(px,py,tx,ty)) vis[ty][tx]=true;
    }
    return vis;
  }

  updateFogOfWar(){
    if(!this.fogLayer) return;
    this.fogLayer.clear();
    if(FOG_RULES.enabled===false) return;

    this.fogVisible=this.computeVisibleTiles();
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) if(this.fogVisible[y][x]) this.fogVisited[y][x]=true;

    const darkAlpha=Math.max(0,Math.min(1,Number(FOG_RULES.unvisitedAlpha??0.78)));
    const memAlpha=Math.max(0,Math.min(1,Number(FOG_RULES.exploredAlpha??0.48)));
    const memColor=Number(FOG_RULES.exploredColor??0x3a3f46);

    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
      if(this.fogVisible[y][x]) continue;
      if(this.fogVisited[y][x]) this.fogLayer.fillStyle(memColor,memAlpha);
      else this.fogLayer.fillStyle(0x000000,darkAlpha);
      this.fogLayer.fillRect(x*S,y*S,S,S);
    }

    this.updateEnemyVisibilityByFog();
  }

  updateEnemyVisibilityByFog(){
    // In explore mode, enemies outside current visibility should not be directly visible.
    if(!this.isExploreMode()) return;
    for(const e of this.enemies){
      if(!e.alive) continue;
      const visible=this.isTileVisibleToPlayer(e.tx,e.ty);
      const a=visible?1:0;
      if(e.img) e.img.setAlpha(a);
      if(e.hpBg) e.hpBg.setAlpha(a);
      if(e.hpFg) e.hpFg.setAlpha(a);
      if(e.lbl) e.lbl.setAlpha(visible?0.7:0);
      if(e.fa) e.fa.setAlpha(a);
    }
  }

  syncEnemySightRings(show){
    for(const e of this.enemies){
      if(!e.sightRing||!e.alive||e.inCombat) { if(e.sightRing) e.sightRing.setAlpha(0); continue; }
      const r=this.effectiveEnemySight(e);
      if(typeof e.sightRing.setRadius==='function') e.sightRing.setRadius(r*S);
      e.sightRing.setAlpha(show?0.3:0);
    }
  }

  tileLightLevel(tx,ty){
    // 0=dark, 1=dim, 2=bright
    let level=this.globalLight==='bright'?2:this.globalLight==='dim'?1:0;
    for(const l of this.mapLights){
      const dx=tx-Number(l.x), dy=ty-Number(l.y);
      const d=Math.sqrt(dx*dx+dy*dy);
      const r=Math.max(1,Number(l.radius||3));
      if(d>r+0.25) continue;
      const lv=(String(l.level||'dim').toLowerCase()==='bright')?2:1;
      if(lv>level) level=lv;
      if(level===2) break;
    }
    return level;
  }

  effectiveEnemySight(enemy){
    const scale=Number(COMBAT_RULES.enemySightScale||1);
    let s=Math.max(1,Math.round(enemy.sight*scale));
    const light=this.tileLightLevel(this.playerTile.x,this.playerTile.y);
    if(light===0) s-=Number(LIGHT_RULES.darkSightPenalty||3);
    else if(light===1) s-=Number(LIGHT_RULES.dimSightPenalty||1);
    if(this.playerHidden) s-=Number(LIGHT_RULES.hiddenSightPenalty||2);
    return Math.max(1,s);
  }

  getEnemyPassivePerception(enemy){
    // Passive Perception = 10 + Wisdom modifier + proficiency (if trained)
    const wiseMod = Math.floor((enemy.stats.wis - 10) / 2);
    const profBonus = enemy.skillProficiencies?.has('perception') 
      ? dnd.profBonus(enemy.level || 1)
      : 0;
    return 10 + wiseMod + profBonus;
  }

  tryHideAction(){
    if(!this.isPlayerTurn()){ this.showStatus('Not your turn yet.'); return; }
    if(this.playerHidden){ this.showStatus('Already hidden! Move to break stealth.'); return; }
    if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }

    // Roll Stealth check (no DC target, vs enemies' Perception)
    const stealthRoll = dnd.skillCheck('stealth', this.pStats, 100); // 100 is dummy DC (will compare manually)
    
    // Compare against each enemy's Passive Perception
    let spotted = false;
    let spottersList = [];
    for (let enemy of this.combatGroup) {
      if (!enemy.alive) continue;
      const perception = this.getEnemyPassivePerception(enemy);
      if (stealthRoll.total < perception) {
        spotted = true;
        spottersList.push(`${enemy.type} (Perception ${perception})`);
      }
    }

    this.playerAP = 0;
    this.processStatusEffectsForActor('player','on_action',{actionId:'hide'});
    this.pendingAction = null;
    this.clearPendingAction();
    this.updateResBar();
    this.setActionButtonsUsed(true);

    this.playerHidden = !spotted;
    
    if (spotted) {
      this.playerHidden=false;
      this.player.setAlpha(1);
      this.showStatus(`Failed to hide (Stealth ${stealthRoll.total}). Spotted by: ${spottersList.join(', ')}`);
    } else {
      // Successfully hidden! Lower alpha & trigger search behavior
      this.player.setAlpha(0.4);  // Semi-transparent to show hiding
      
      // Create shadow at current position (shows where enemies will search)
      const shx = this.playerTile.x * S + S / 2;
      const shy = this.playerTile.y * S + S / 2;
      this._shadowPlayer = this.add.sprite(shx, shy, 'player_atlas', 'idle_0');
      this._shadowPlayer.setAlpha(0.2);
      this._shadowPlayer.setTint(0x6666ff);
      this._shadowPlayer.setDepth(100);
      
      // Enemies search for configurable turns from AI profile
      for (let enemy of this.combatGroup) {
        if (enemy.alive) {
          const searchTurns = Math.max(1, Number(enemy?.ai?.searchTurns || enemy?.searchTurns || 4));
          enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
          enemy.searchTurnsRemaining = searchTurns;
        }
      }
      
      this.showStatus(`Hidden! (Stealth ${stealthRoll.total}). Enemies searching last known location...`);
    }
  }

  tryHideInExplore(){
    if(!this.isExploreMode()) return;
    if(this.playerHidden){ this.showStatus('Already hidden! Move to break stealth.'); return; }
    if(this.isMoving){ this.showStatus('Cannot hide while moving.'); return; }

    // BG3-style: Check light at player position (bright = harder to hide)
    const lightAtPlayer = (this.mapLights || []).reduce((maxLight, light) => {
      const dist = Math.sqrt((this.playerTile.x - light.x)**2 + (this.playerTile.y - light.y)**2);
      const lightVal = Math.max(0, (light.range - dist) / light.range);
      return Math.max(maxLight, lightVal);
    }, 0);
    const lightPenalty = Math.floor(lightAtPlayer * 5); // 0-5 penalty based on light level
    
    // Roll Stealth (with light-based penalty)
    const stealthRoll = dnd.rollAbility('dex', this.pStats);
    const stealthAdjusted = stealthRoll.total - lightPenalty;
    
    // Check if any nearby enemies spot the hide attempt
    let spotted = false;
    let spottersList = [];
    for(let enemy of this.enemies){
      if(!enemy.alive) continue;
      const dist = Math.sqrt((enemy.tx - this.playerTile.x)**2 + (enemy.ty - this.playerTile.y)**2);
      const perception = this.getEnemyPassivePerception(enemy);
      // Enemy only notices hide attempt if they can see the player
      if(dist <= enemy.sight && inFOV(enemy, this.playerTile.x, this.playerTile.y) && hasLOS(enemy.tx, enemy.ty, this.playerTile.x, this.playerTile.y)){
        if(stealthAdjusted < perception){
          spotted = true;
          spottersList.push(`${enemy.type} (Perception ${perception})`);
        }
      }
    }

    if(spotted){
      const lightMsg = lightPenalty > 0 ? ` (Light penalty: -${lightPenalty})` : '';
      this.showStatus(`Failed to hide (Stealth ${stealthAdjusted})${lightMsg}. Spotted by: ${spottersList.join(', ')}`);
      if(this.logEvent) this.logEvent('EXPLORE', 'HIDE_FAILED', {
        roll: stealthRoll.total,
        adjusted: stealthAdjusted,
        lightPenalty: lightPenalty,
        spottedBy: spottersList
      });
      return;
    }

    // Successfully hidden in explore mode!
    this.playerHidden = true;
    this.player.setAlpha(0.4);

    if(this.logEvent) this.logEvent('EXPLORE', 'HIDE_SUCCESS', {
      roll: stealthRoll.total,
      adjusted: stealthAdjusted,
      lightPenalty: lightPenalty
    });

    // Create shadow at current position
    const shx = this.playerTile.x * S + S / 2;
    const shy = this.playerTile.y * S + S / 2;
    this._shadowPlayer = this.add.sprite(shx, shy, 'player_atlas', 'idle_0');
    this._shadowPlayer.setAlpha(0.2);
    this._shadowPlayer.setTint(0x6666ff);
    this._shadowPlayer.setDepth(100);

    // Set all nearby enemies to search
    for(let enemy of this.enemies){
      if(enemy.alive){
        const dist = Math.sqrt((enemy.tx - this.playerTile.x)**2 + (enemy.ty - this.playerTile.y)**2);
        // Only nearby enemies react to hide (saw you or heard something)
        if(dist <= 15){
          const searchTurns = Math.max(2, Number(enemy?.ai?.searchTurns || enemy?.searchTurns || 4));
          enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
          enemy.searchTurnsRemaining = searchTurns;
        }
      }
    }

    this.showStatus(`Hidden! (Stealth ${stealthRoll.total}). Stay still to remain hidden...`);
  }

  // ─────────────────────────────────────────
  // INPUT
  // ─────────────────────────────────────────
  hideContextMenu(){
    // Moved to input-system.js
  }

  showContextMenu(x, y, options){
    // Moved to input-system.js
  }

  onTap(ptr){
    // Moved to input-system.js
  }

  toggleExploreDoor(x,y){
    // Moved to input-system.js
  }

  toggleExploreTBDoor(x,y){
    // Moved to input-system.js
  }

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

  onTapCombat(tx,ty,enemy){
    if(this._movingToAttack) return;
    if(!this.isPlayerTurn()){ this.showStatus('Not your turn yet.'); return; }

    if(this.isDoorTile(tx,ty)){
      const adj=Math.abs(this.playerTile.x-tx)+Math.abs(this.playerTile.y-ty)===1;
      if(!adj){ this.showStatus('Move next to the door to interact.'); return; }
      this.toggleDoor(tx,ty);
      return;
    }

    if(this.pendingAction==='attack'){
      if(enemy&&this.combatGroup.includes(enemy)) this.playerAttackEnemy(enemy);
      else this.showStatus('Tap a highlighted enemy to attack.');
      return;
    }

    if(enemy&&this.combatGroup.includes(enemy)){
      const dx=Math.abs(this.playerTile.x-enemy.tx), dy=Math.abs(this.playerTile.y-enemy.ty);
      const isAdj=dx<=1&&dy<=1;
      if(!isAdj && this.playerAP>0 && this.playerMoves>0){
        this.tryMoveAndAttack(enemy);
        return;
      }
      this.showCombatEnemyPopup(enemy);
      return;
    }

    if(enemy&&!this.combatGroup.includes(enemy)){
      this.showStatus('That enemy is not in this fight.');
      return;
    }

    if(!this.isWallTile(tx,ty)){
      if(this.playerMoves<=0){ this.showStatus('No movement left — Attack or End Turn.'); return; }
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
        else this.showStatus(`${this.playerMoves} moves · ${this.playerAP>0?'Action ready':'No action'} · End Turn when done.`);
      });
    }
  }

  // ─────────────────────────────────────────
  // COMBAT ENTER / EXIT
  // ─────────────────────────────────────────
  enterCombat(triggers){
    if(this.mode===MODE.COMBAT) return;
    this.mode=MODE.COMBAT;
    this.tweens.killTweensOf(this.player);
    this.movePath=[]; this.isMoving=false; this.clearPathDots(); this.onArrival=null;
    this.diceWaiting=false; this._afterPlayerDice=null;
    const snapTile=this.lastCompletedTile||this.playerTile;
    this.playerTile={x:snapTile.x,y:snapTile.y};
    this.lastCompletedTile={x:snapTile.x,y:snapTile.y};
    this.player.setPosition(snapTile.x*S+S/2,snapTile.y*S+S/2);
    this.cameras.main.startFollow(this.player,true,1,1);

    const alerted=new Set(triggers);
    this.playerHidden=false;

    // Record player's last seen location for all enemies (for search behavior when hiding)
    for (const e of this.enemies) {
      if (e.alive) {
        e.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
        e.searchTurnsRemaining = 0;  // Not searching yet
      }
    }

    // Scripted group alert: if any trigger belongs to a group,
    // all alive enemies in that group join the fight immediately.
    const scriptedGroups=new Set([...alerted].map(e=>e.group).filter(Boolean));
    if(scriptedGroups.size){
      for(const e of this.enemies){
        if(e.alive&&e.group&&scriptedGroups.has(e.group)) alerted.add(e);
      }
    }

    for(const e of this.enemies){
      if(!e.alive||alerted.has(e)) continue;
      const dist=Math.sqrt((e.tx-this.playerTile.x)**2+(e.ty-this.playerTile.y)**2);
      if(dist<=this.effectiveEnemySight(e)&&inFOV(e,this.playerTile.x,this.playerTile.y)&&hasLOS(e.tx,e.ty,this.playerTile.x,this.playerTile.y)) alerted.add(e);
    }

    const isSideNeighbor=(a,b)=>Math.abs(a.tx-b.tx)+Math.abs(a.ty-b.ty)===1;
    const roomMax=Math.max(1,Number(COMBAT_RULES.roomAlertMaxDistance||8));
    let changed=true;
    while(changed){
      changed=false;
      for(const e of this.enemies){
        if(!e.alive||alerted.has(e)) continue;
        const shouldAlert=[...alerted].some(a=>
          (sameRoom(e.tx,e.ty,a.tx,a.ty)&&sameOpenArea(e.tx,e.ty,a.tx,a.ty,roomMax)) ||
          sideRoom(e.tx,e.ty,a.tx,a.ty) ||
          isSideNeighbor(e,a)
        );
        if(shouldAlert){
          alerted.add(e);
          changed=true;
        }
      }
    }
    this.combatGroup=[...alerted];
    this.combatGroup.forEach(e=>e.inCombat=true);

    // Ensure engaged enemies are visible in combat.
    this.combatGroup.forEach(e=>{
      if(e.img) e.img.setAlpha(1);
      if(e.hpBg) e.hpBg.setAlpha(1);
      if(e.hpFg) e.hpFg.setAlpha(1);
      if(e.lbl) e.lbl.setAlpha(0.7);
      if(e.fa) e.fa.setAlpha(1);
    });

    // If combat starts with enemies outside current visibility, show detection pings.
    const unseen=this.combatGroup.filter(e=>{
      const invisible=!this.isTileVisibleToPlayer(e.tx,e.ty);
      const dark=this.tileLightLevel(e.tx,e.ty)<=1;
      return invisible||dark;
    });
    unseen.forEach(e=>this.showDetectedEnemyMarker(e));
    if(unseen.length){
      this.showStatus(`Detected movement nearby: ${unseen.length} unseen ${unseen.length===1?'enemy':'enemies'}.`);
    }

    const order=[{id:'player',init:999},...this.combatGroup.map(e=>({id:'enemy',enemy:e,init:Math.random()*10+e.spd}))].sort((a,b)=>b.init-a.init);
    this.turnOrder=order; this.turnIndex=0; this.playerAP=1; this.playerMoves=Number(COMBAT_RULES.playerMovePerTurn||5); this.playerMovesUsed=0;

    this.flashBanner('COMBAT!','combat');
    document.getElementById('vignette').classList.add('combat');
    document.getElementById('mode-badge').className='turnbased';
    document.getElementById('mode-badge').textContent='⚔ COMBAT';
    this.cameras.main.shake(400,0.008);
    this.clearSightOverlays();
    this.syncEnemySightRings(false);
    this.updateFogOfWar();
    this.time.delayedCall(700,()=>{ this.buildInitBar(); this.startNextTurn(); });
  }

  exitCombat(reason='victory'){
    const returnToExploreTB=this._returnToExploreTB===true;
    this._returnToExploreTB=false;
    this.mode=returnToExploreTB?MODE.EXPLORE_TB:MODE.EXPLORE;
    // [BUG-3 fix] Always restore player visibility on exit
    this.playerHidden=false; this.player.setAlpha(1);
    // Clean up shadow player
    if(this._shadowPlayer){ this._shadowPlayer.destroy(); this._shadowPlayer=null; }
    this.combatGroup=[]; this.turnOrder=[]; this.turnIndex=0; this.pendingAction=null;
    this.diceWaiting=false; this._afterPlayerDice=null; this._movingToAttack=false;
    const ov=document.getElementById('dice-ov'); if(ov) ov.classList.remove('show');
    this.clearMoveRange(); this.clearAtkRange();
    this.clearDetectMarkers();
    this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
    document.getElementById('vignette').classList.remove('combat');
    if(returnToExploreTB){
      document.getElementById('mode-badge').className='turnbased';
      document.getElementById('mode-badge').textContent='TURN-BASED';
      this.beginExploreTurnBasedPlayerTurn();
    } else {
      document.getElementById('mode-badge').className='realtime';
      document.getElementById('mode-badge').textContent='EXPLORE';
    }
    document.getElementById('init-bar').classList.remove('show');
    document.getElementById('action-bar').classList.remove('show');
    document.getElementById('res-bar').classList.remove('show');
    if(reason==='flee'){
      this.flashBanner('FLED COMBAT','explore');
      this.showStatus('Escaped combat. Stay hidden to avoid re-engage.');
    }else{
      this.flashBanner('COMBAT OVER','explore');
      this.showStatus('Victory! Continue exploring.');
    }
    this.time.delayedCall(300,()=>{ this.drawSightOverlays(); this.updateFogOfWar(); });
  }

  // ─────────────────────────────────────────
  // TURN MANAGEMENT
  // ─────────────────────────────────────────
  startNextTurn(){
    this.turnOrder=this.turnOrder.filter(t=>t.id==='player'||(t.enemy&&t.enemy.alive));
    if(!this.turnOrder.length||this.combatGroup.every(e=>!e.alive)){ this.exitCombat(); return; }
    
    // If player is hidden and all enemies have given up searching, exit combat
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
      this.showStatus(`${cur.id==='player'?'You are':cur.enemy.type+' is'} surprised and loses this turn!`);
      if(cur.id==='player') this.time.delayedCall(220,()=>this.endPlayerTurn(true));
      else this.time.delayedCall(220,()=>this.endEnemyTurn(cur.enemy));
      return;
    }

    if(cur.id==='player'){
      const st=this.processStatusEffectsForActor('player','turn_start');
      if(st.skipTurn){
        this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
        document.getElementById('action-bar').classList.remove('show');
        document.getElementById('res-bar').classList.remove('show');
        this.time.delayedCall(250,()=>this.endPlayerTurn(true));
        return;
      }
      this.playerAP=1; this.playerMoves=Number(COMBAT_RULES.playerMovePerTurn||5); this.playerMovesUsed=0;
      this.turnStartMoves=Number(COMBAT_RULES.playerMovePerTurn||5);
      this.turnStartTile={...this.playerTile};
      this.pendingAction=null;
      this.clearMoveRange(); this.clearAtkRange();
      document.getElementById('action-bar').classList.add('show');
      document.getElementById('res-bar').classList.add('show');
      this.initActionButtons();
      this.resetActionButtons();
      this.turnHL.setPosition(this.player.x,this.player.y).setAlpha(1);
      this.tweens.add({targets:this.turnHL,alpha:0.35,duration:600,yoyo:true,repeat:-1});
      this.updateResBar();
      this.time.delayedCall(100,()=>this.showMoveRange());
      const engageTarget=this._queuedEngageEnemy;
      this._queuedEngageEnemy=null;
      if(engageTarget&&engageTarget.alive&&this.combatGroup.includes(engageTarget)){
        this.showStatus(`Engaging ${engageTarget.type}...`);
        this.time.delayedCall(180,()=>{
          if(this.mode===MODE.COMBAT&&this.isPlayerTurn()&&engageTarget.alive) this.tryMoveAndAttack(engageTarget);
        });
      }else{
        this.showStatus('Your turn! Move freely · Attack, Dash, Hide, or Flee as your action.');
      }
    } else {
      const st=this.processStatusEffectsForActor(cur.enemy,'turn_start');
      if(st.skipTurn){ this.time.delayedCall(220,()=>this.endEnemyTurn(cur.enemy)); return; }
      document.getElementById('action-bar').classList.remove('show');
      document.getElementById('res-bar').classList.remove('show');
      this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
      this.clearMoveRange();
      this.showStatus(`${cur.enemy.type}'s turn...`);
      this.time.delayedCall(400,()=>this.doEnemyTurn(cur.enemy));
    }
  }

  endPlayerTurn(fromStatusSkip=false){
    if(this.mode!==MODE.COMBAT) return;
    if(!fromStatusSkip) this.processStatusEffectsForActor('player','turn_end');
    this.playerMoves=0; this.playerAP=0;
    this.diceWaiting=false; this._afterPlayerDice=null; this._movingToAttack=false;
    this.clearPendingAction(); this.clearMoveRange(); this.clearAtkRange();
    this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
    document.getElementById('action-bar').classList.remove('show');
    document.getElementById('res-bar').classList.remove('show');
    this.turnIndex++;
    this.time.delayedCall(200,()=>this.startNextTurn());
  }

  isPlayerTurn(){
    if(this.mode!==MODE.COMBAT) return false;
    const c=this.turnOrder[this.turnIndex];
    return c&&c.id==='player';
  }

  // ─────────────────────────────────────────
  // RESET MOVE
  // ─────────────────────────────────────────
  resetMove(){
    if(!this.isPlayerTurn()) return;
    if(this.playerAP<=0){ this.showStatus('Cannot reset after using an action.'); return; }
    if(this.playerMovesUsed===0){ this.showStatus('Haven\'t moved yet.'); return; }
    this.tweens.killTweensOf(this.player);
    this.movePath=[]; this.isMoving=false; this.clearPathDots(); this.onArrival=null;
    this.playerTile={...this.turnStartTile};
    this.player.setPosition(this.turnStartTile.x*S+S/2,this.turnStartTile.y*S+S/2);
    this.cameras.main.startFollow(this.player,true,1,1);
    this.playerMoves=Number(COMBAT_RULES.playerMovePerTurn||5);
    this.playerMovesUsed=0;
    this.updateFogOfWar();
    this.clearMoveRange();
    this.showMoveRange();
    this.updateResBar();
    this.showStatus('Move reset! You\'re back at turn start position.');
  }

  // ─────────────────────────────────────────
  // ENEMY TURN
  // ─────────────────────────────────────────
  advanceEnemyTurn(){
    this.diceWaiting=false; this._afterPlayerDice=null;
    
    // Check if all enemies have given up searching (while player hidden)
    if(this.playerHidden){
      const allGivenUp = this.combatGroup.every(e => !e.alive || e.searchTurnsRemaining <= 0);
      if(allGivenUp){
        this.showStatus('All enemies have abandoned the search. You escaped!');
        this.time.delayedCall(400, ()=>this.exitCombat('escape'));
        return;
      }
    }
    
    this.turnIndex++;
    if(this.turnIndex>=this.turnOrder.length) this.turnIndex=0;
    this.time.delayedCall(150,()=>this.startNextTurn());
  }

  doEnemyTurn(enemy){
    if(!enemy.alive){ this.advanceEnemyTurn(); return; }
    this.tweens.add({targets:enemy.img,alpha:0.55,duration:150,yoyo:true});

    // [BUG-1 fix] Decrement this enemy's own search counter at the start of its turn
    if(this.playerHidden && enemy.searchTurnsRemaining > 0) {
      enemy.searchTurnsRemaining--;
      if(enemy.searchTurnsRemaining === 0) {
        this.showStatus(`${enemy.type} gives up searching.`);
        // Check if ANY enemies are still searching
        const anySearching = this.combatGroup.some(e => e.alive && e.searchTurnsRemaining > 0);
        if(!anySearching && this._shadowPlayer) {
          this._shadowPlayer.destroy();
          this._shadowPlayer = null;
          this.showStatus('Shadow fades away as search is abandoned.');
        }
      }
    }

    // Determine target: actual player position or last known location if searching
    let targetTile = this.playerTile;
    if (this.playerHidden && enemy.searchTurnsRemaining > 0) {
      // Still searching — head for last known player location
      targetTile = enemy.lastSeenPlayerTile;
    } else if (this.playerHidden && enemy.searchTurnsRemaining <= 0) {
      // Search timed out — give up for now
      this.endEnemyTurn(enemy);
      return;
    } else if (!this.playerHidden) {
      // Player is visible — update last seen location and reset search timer
      enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
      enemy.searchTurnsRemaining = 0;
    }

    const isAdj=()=>Math.abs(enemy.tx-targetTile.x)<=1&&Math.abs(enemy.ty-targetTile.y)<=1;

    const afterMove=()=>{
      // [BUG-4 fix] Never attack a hidden player even if adjacent to last-known tile
      if(this.playerHidden){ this.endEnemyTurn(enemy); return; }
      if(isAdj()) this.time.delayedCall(150,()=>this.doEnemyAttack(enemy));
      else this.endEnemyTurn(enemy);
    };

    if(!this.playerHidden && isAdj()){ this.time.delayedCall(150,()=>this.doEnemyAttack(enemy)); return; }

    // [BUG-7 fix] Only block pathing on player tile when player is visible
    const blockFn = this.playerHidden
      ? wallBlk
      : (x,y) => wallBlk(x,y);
    const path=bfs(enemy.tx,enemy.ty,targetTile.x,targetTile.y,blockFn);
    const enemySpd=Math.max(1,Math.floor(enemy.spd*Number(COMBAT_RULES.enemySpeedScale||1)));
    const steps=Math.min(enemySpd,Math.max(0,path.length-1));
    if(steps<=0){ afterMove(); return; }

    const mp=[];
    for(let i=0;i<steps;i++){
      const t=path[i];
      if(this.enemies.some(e=>e.alive&&e!==enemy&&e.tx===t.x&&e.ty===t.y)) break;
      // [BUG-7 fix] Only skip player tile when visible
      if(!this.playerHidden&&t.x===this.playerTile.x&&t.y===this.playerTile.y) break;
      mp.push(t);
    }
    if(!mp.length){ afterMove(); return; }

    const dest=mp[mp.length-1];
    this.animEnemyMove(enemy,mp.slice(),()=>{ enemy.tx=dest.x; enemy.ty=dest.y; afterMove(); });
  }

  doEnemyAttack(enemy){
    const atkMod=dnd.mod(enemy.stats.str);
    const atkRoll=dnd.roll(1,20);
    const atkTotal=atkRoll+atkMod;
    const isCrit=atkRoll===20;
    const isMiss=atkRoll===1||(!isCrit&&atkTotal<this.pStats.ac);
    this.diceWaiting='enemy';
    this._pendingEnemyTurnActor=enemy;

    // Log attack attempt
    if(this.logEvent) this.logEvent('COMBAT', 'ENEMY_ATTACK', {
      enemy: enemy.type,
      roll: atkRoll,
      total: atkTotal,
      ac: this.pStats.ac,
      hit: !isMiss,
      crit: isCrit
    });

    if(isMiss){
      this.spawnFloat(this.player.x,this.player.y-10,'Blocked!','#7fc8f8');
      const rollLine=this.formatRollLine(atkRoll,atkMod,atkTotal,this.pStats.ac,'Str');
      this.showStatus(`${enemy.type} missed! (${rollLine})`);
      this.showDicePopup(rollLine,'Miss!','miss',[{sides:20,value:atkRoll,kind:'d20'}]);
      return;
    }
    const dr=dnd.rollDamageSpec(enemy.damageFormula,isCrit);
    const dmg=Math.max(1,dr.total);
    this.playerHP=Math.max(0,this.playerHP-dmg);
    this.cameras.main.shake(180,0.006);
    this.tweens.add({targets:this.player,alpha:0.3,duration:80,yoyo:true,repeat:2});
    this.spawnFloat(this.player.x,this.player.y-10,`-${dmg}`,'#e74c3c');
    const dmgText=this.formatDamageBreakdown(dr.str,'Str');
    this.showStatus(`${enemy.type}${isCrit?' CRITS':' hits'} for ${dmg}! (${dmgText})`);
    this.updateHUD();
    if(this.playerHP<=0) this.showStatus('You have been defeated...');
    const enemyDetail=isCrit
      ? `${enemy.type} critical hit: damage dice doubled (${dmgText})`
      : `${enemy.type} damage: ${dmgText}`;
    this.showDicePopup(this.formatRollLine(atkRoll,atkMod,atkTotal,this.pStats.ac,'Str'),enemyDetail,isCrit?'crit':'hit',[{sides:20,value:atkRoll,kind:'d20'},...dr.diceValues]);
  }

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
        const dist=Math.sqrt((e.tx-this.playerTile.x)**2+(e.ty-this.playerTile.y)**2);
        return dist<=e.sight&&hasLOS(e.tx,e.ty,this.playerTile.x,this.playerTile.y);
      });
      if(seen) return { ok:false, reason:'Cannot flee while enemies still have line of sight.' };
    }

    return { ok:true, reason:'' };
  }

  tryFleeCombat(){
    if(!this.isPlayerTurn()){ this.showStatus('Not your turn yet.'); return; }
    if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }

    const chk=this.canFleeCombat();
    if(!chk.ok){
      this.showStatus(`Flee failed: ${chk.reason}`);
      return;
    }

    this.playerAP=0;
    this.processStatusEffectsForActor('player','on_action',{actionId:'flee'});
    this.pendingAction=null;
    this.clearPendingAction();
    this.updateResBar();
    this.setActionButtonsUsed(true);
    this.showStatus('Flee successful. Breaking away...');
    this.time.delayedCall(140,()=>this.exitCombat('flee'));
  }

  animEnemyMove(enemy,path,onDone,_prevTx,_prevTy){
    if(!path.length){ onDone(); return; }
    const step=path.shift();
    const nx=step.x*S+S/2, ny=step.y*S+S/2;
    // [BUG-6 fix] Track previous step tile for correct facing on multi-step moves
    const fromX=_prevTx!==undefined?_prevTx:enemy.tx;
    const fromY=_prevTy!==undefined?_prevTy:enemy.ty;
    const fdx=step.x-fromX, fdy=step.y-fromY;
    if(fdx||fdy) enemy.facing=Math.atan2(fdy,fdx)*180/Math.PI;
    this.playActorMove(enemy.img,enemy.type,enemy.spd>=2);
    this.tweens.add({targets:enemy.img,x:nx,y:ny,duration:200,ease:'Linear',onComplete:()=>this.animEnemyMove(enemy,path,onDone,step.x,step.y)});
    this.tweens.add({targets:enemy.hpBg,x:nx,y:step.y*S-4,duration:200});
    this.tweens.add({targets:enemy.hpFg,x:nx,y:step.y*S-4,duration:200});
    this.tweens.add({targets:enemy.lbl,x:nx,y:ny+S*0.52,duration:200});
    this.tweens.add({targets:enemy.sightRing,x:nx,y:ny,duration:200});
    if(enemy.fa){ this.tweens.add({targets:enemy.fa,x:nx,y:ny,duration:200}); enemy.fa.setRotation(enemy.facing*Math.PI/180); }
    if(!path.length) this.time.delayedCall(210,()=>this.playActorIdle(enemy.img,enemy.type));
  }

  // ─────────────────────────────────────────
  // PLAYER ATTACK
  // ─────────────────────────────────────────
  selectAction(action){
    if(!this.isPlayerTurn()) return;
    if(action==='attack'){
      if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }
      this.pendingAction='attack';
      this.setSelectedActionButton('attack');
      this.clearMoveRange(); this.showAtkRange();
      this.showStatus('Tap a highlighted enemy to attack.');
    } else if(action==='sleep_cloud'){
      this.showStatus('Sleep Cloud action setup is not wired to a targeting flow yet.');
      this.pendingAction=null;
      this.setSelectedActionButton('');
    } else if(action==='dash'){
      if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }
      this.playerAP=0; this.playerMoves+=Number(COMBAT_RULES.dashMoveBonus||4);
      this.processStatusEffectsForActor('player','on_action',{actionId:'dash'});
      this.pendingAction=null;
      this.setActionButtonsUsed(true);
      this.updateResBar(); this.clearMoveRange(); this.showMoveRange();
      this.showStatus(`Dashed! ${this.playerMoves} tiles of movement remaining.`);
    } else if(action==='hide'){
      this.tryHideAction();
    } else if(action==='flee'){
      this.tryFleeCombat();
    }
  }

  clearPendingAction(){
    this.pendingAction=null;
    this.setSelectedActionButton('');
    this.clearAtkRange();
  }

  playerAttackEnemy(enemy){
    if(!this.isPlayerTurn()||this.playerAP<=0) return;
    
    // Track if player was hidden before this attack (for sneak attack advantage)
    const wasHidden = this.playerHidden;
    this.playerHidden=false;
    
    // Clean up shadow player when revealing
    if(this._shadowPlayer){ this._shadowPlayer.destroy(); this._shadowPlayer=null; }
    const dx=Math.abs(this.playerTile.x-enemy.tx), dy=Math.abs(this.playerTile.y-enemy.ty);
    if(dx>1||dy>1){ this.showStatus('Too far — move closer first.'); return; }
    this.clearPendingAction();
    this.playerAP=0;
    this.processStatusEffectsForActor('player','on_action',{actionId:'attack'});

    const strMod=dnd.mod(this.pStats.str);
    
    // BG3-style: advantage on first attack if hidden
    let atkRoll, atkRoll2 = null;
    if(wasHidden){
      atkRoll = dnd.roll(1,20);
      atkRoll2 = dnd.roll(1,20);
      atkRoll = Math.max(atkRoll, atkRoll2); // Take higher roll with advantage
    } else {
      atkRoll = dnd.roll(1,20);
    }
    
    const atkTotal=atkRoll+strMod+this.pStats.profBonus;
    const isCrit=atkRoll===20, isMiss=atkRoll===1;
    const hits=isCrit||(!isMiss&&atkTotal>=enemy.ac);

    // Log attack attempt
    if(this.logEvent) this.logEvent('COMBAT', 'PLAYER_ATTACK', {
      target: enemy.type,
      roll: atkRoll,
      roll2: atkRoll2,
      advantage: wasHidden,
      total: atkTotal,
      ac: enemy.ac,
      hit: hits,
      crit: isCrit
    });

    this.setActionButtonsUsed(true);
    this.updateResBar();

    if(!hits){
      this.diceWaiting='player';
      this._afterPlayerDice=()=>{
        // After missed attack while hidden, can try to re-hide
        if(wasHidden) this.showStatus(`Missed! Can still Hide. ${this.playerMoves>0?this.playerMoves+' moves left.':''}`);
        else this.showStatus(`Missed! ${this.playerMoves>0?this.playerMoves+' moves left.':''} End Turn when done.`);
      };
      this.tweens.add({targets:enemy.img,x:enemy.img.x+6,duration:60,yoyo:true,repeat:1});
      const rollDisplay = wasHidden 
        ? `d20[${atkRoll2}|${atkRoll}↑] + ${strMod+this.pStats.profBonus} = ${atkTotal} vs AC${enemy.ac}` 
        : this.formatRollLine(atkRoll,strMod+this.pStats.profBonus,atkTotal,enemy.ac,`Str${this.fmtSigned(strMod)}+Prof(${this.fmtSigned(this.pStats.profBonus)})`)
      this.showDicePopup(rollDisplay, isMiss?'Natural 1 — Critical Miss!': (wasHidden?'Sneak Attack Missed!':'Miss!'), 'miss', [{sides:20,value:atkRoll,kind:'d20'}, ...(atkRoll2!==null ? [{sides:20,value:atkRoll2,kind:'d20'}] : [])]);
      this.showStatus(`Missed ${enemy.type}!${wasHidden?' (Hidden attack)':''}`);
      return;
    }

    const dr=this.resolveAbilityDamage('attack','player',isCrit);
    const dmg=Math.max(1,dr.total);
    enemy.hp-=dmg;
    this.applyAbilityOnHitStatuses('attack','player',enemy);

    this.tweens.add({targets:enemy.img,alpha:0.15,duration:80,yoyo:true,repeat:3});
    this.spawnFloat(enemy.tx*S+S/2,enemy.ty*S,isCrit?`💥${dmg}`:`-${dmg}`,'#ffdd57');
    const ratio=Math.max(0,enemy.hp/enemy.maxHp);
    enemy.hpFg.setDisplaySize((S-8)*ratio,5);
    if(ratio<0.4) enemy.hpFg.setFillStyle(0xe67e22);
    if(ratio<0.15) enemy.hpFg.setFillStyle(0xe74c3c);
    this.showStatus(`${isCrit?'CRIT! ':''}${wasHidden?'SNEAK ':''}Hit ${enemy.type} for ${dmg}!${wasHidden?' (Can re-hide)':''}`);

    this.diceWaiting='player';
    this._afterPlayerDice=()=>{
      if(enemy.hp<=0){
        enemy.alive=false; enemy.inCombat=false;
        this.tweens.add({targets:[enemy.img,enemy.hpBg,enemy.hpFg,enemy.lbl,enemy.sightRing],alpha:0,duration:500,onComplete:()=>{[enemy.img,enemy.hpBg,enemy.hpFg,enemy.lbl,enemy.sightRing,enemy.fa].forEach(o=>{if(o&&o.destroy)o.destroy();});}});
        if(enemy.fa) this.tweens.add({targets:enemy.fa,alpha:0,duration:300});
        this.spawnFloat(enemy.tx*S+S/2,enemy.ty*S-10,'DEFEATED!','#f0c060');
        this.pStats.xp+=enemy.xp||50; this.checkLevelUp();
        if(this.combatGroup.every(e=>!e.alive)){ this.time.delayedCall(600,()=>this.exitCombat()); return; }
      }
      this.showMoveRange();
      this.showStatus(`${this.playerMoves>0?this.playerMoves+' moves left — ':''} End Turn when done.${wasHidden?' (Press H to re-hide)':''}`);
    };

    const playerDetail=isCrit
      ? `Critical hit: damage dice doubled (${this.formatDamageBreakdown(dr.str,'Str')})`
      : `${wasHidden?'Sneak Attack! ':''}Damage: ${this.formatDamageBreakdown(dr.str,'Str')}`;
    const rollDisplay = wasHidden 
      ? `d20[${atkRoll2}|${atkRoll}↑] + ${strMod+this.pStats.profBonus} = ${atkTotal} vs AC${enemy.ac}` 
      : this.formatRollLine(atkRoll,strMod+this.pStats.profBonus,atkTotal,enemy.ac,`Str${this.fmtSigned(strMod)}+Prof(${this.fmtSigned(this.pStats.profBonus)})`)
    const diceArray = wasHidden 
      ? [{sides:20,value:atkRoll2,kind:'d20'}, {sides:20,value:atkRoll,kind:'d20'},...dr.diceValues]
      : [{sides:20,value:atkRoll,kind:'d20'},...dr.diceValues];
    this.showDicePopup(rollDisplay,playerDetail,isCrit?'crit':'hit',diceArray);
  }

  tryMoveAndAttack(enemy){
    if(!enemy||!enemy.alive||!this.combatGroup.includes(enemy)) return;
    if(!this.isPlayerTurn()){ this.showStatus('Not your turn yet.'); return; }
    if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }
    if(this.playerMoves<=0){ this.showStatus('No movement left.'); return; }

    const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
    const moveBlk=(x,y)=>this.isWallTile(x,y)||this.enemies.some(e=>e.alive&&e.tx===x&&e.ty===y);
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
          this.showStatus(`Moved. ${this.playerMoves} moves left.`);
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
      if(this.playerMoves>0) this.showMoveRange();
      const dx=Math.abs(this.playerTile.x-targetEnemy.tx), dy=Math.abs(this.playerTile.y-targetEnemy.ty);
      const inRange=dx<=1&&dy<=1;
      if(inRange&&this.playerAP>0){
        this.showStatus('Moved into range. Action ready.');
      }else{
        this.showStatus(`Moved closer. Out of range, ${this.playerMoves} moves left.`);
      }
    });
  }

  // ─────────────────────────────────────────
  // DICE
  // ─────────────────────────────────────────
  _handleDiceDismiss(){
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
  }

  showDicePopup(rollLine,detailLine,type,diceValues){
    if(this.ui) return this.ui.showDicePopup(rollLine,detailLine,type,diceValues);
  }

  // ─────────────────────────────────────────
  // RANGE DISPLAY
  // ─────────────────────────────────────────
  showMoveRange(){
    this.clearMoveRange();
    const range=this.playerMoves||0, px=this.playerTile.x, py=this.playerTile.y;
    if(range<=0) return;
    for(let dy=-range;dy<=range;dy++) for(let dx=-range;dx<=range;dx++){
      if(Math.abs(dx)+Math.abs(dy)>range) continue;
      const tx=px+dx, ty=py+dy;
      if(tx<0||ty<0||tx>=COLS||ty>=ROWS) continue;
      if(this.isWallTile(tx,ty)) continue;
      if(tx===px&&ty===py) continue;
      if(this.enemies.some(e=>e.alive&&e.tx===tx&&e.ty===ty)) continue;
      const moveBlk=(x,y)=>this.isWallTile(x,y)||this.enemies.some(e=>e.alive&&e.tx===x&&e.ty===y);
      const path=bfs(px,py,tx,ty,moveBlk);
      if(path.length&&path.length<=range){
        const o=this.add.image(tx*S+S/2,ty*S+S/2,'t_move').setDisplaySize(S,S).setDepth(3);
        this.rangeTiles.push({x:tx,y:ty,img:o});
      }
    }
  }
  clearMoveRange(){ this.rangeTiles.forEach(r=>r.img.destroy()); this.rangeTiles=[]; }
  inMoveRange(tx,ty){ return this.rangeTiles.some(r=>r.x===tx&&r.y===ty); }

  showAtkRange(){
    this.clearAtkRange();
    if(!this.combatGroup||!this.combatGroup.length) return;
    const px=this.playerTile.x, py=this.playerTile.y, range=this.pStats.atkRange||1;
    let any=false;
    for(let dy=-range;dy<=range;dy++) for(let dx=-range;dx<=range;dx++){
      if(!dx&&!dy) continue;
      const tx=px+dx, ty=py+dy;
      if(tx<0||ty<0||tx>=COLS||ty>=ROWS) continue;
      if(this.isWallTile(tx,ty)) continue;
      if(this.combatGroup.some(e=>e.alive&&e.img&&!e.img.active===false&&e.tx===tx&&e.ty===ty)){
        const o=this.add.image(tx*S+S/2,ty*S+S/2,'t_atk').setDisplaySize(S,S).setDepth(4);
        this.atkRangeTiles.push(o); any=true;
      }
    }
    if(any){ this.showStatus('Tap a red enemy to attack.'); }
    else{
      for(const e of this.combatGroup){
        if(!e.alive) continue;
        try{ const g=this.add.graphics().setDepth(4); g.lineStyle(2,0xe74c3c,0.5); g.strokeRect(e.tx*S+2,e.ty*S+2,S-4,S-4); this.atkRangeTiles.push(g); }catch(err){}
      }
      this.showStatus('No enemies in range — move closer.');
    }
  }
  clearAtkRange(){ this.atkRangeTiles.forEach(o=>o.destroy()); this.atkRangeTiles=[]; }

  // ─────────────────────────────────────────
  // SIGHT OVERLAYS
  // ─────────────────────────────────────────
  drawSightOverlays(){
    this.clearSightOverlays();
    if(!this.isExploreMode()||!this.enemySightEnabled){ this.syncEnemySightRings(false); return; }
    this.syncEnemySightRings(true);
    for(const e of this.enemies){
      if(!e.alive||e.inCombat) continue;
      const g=this.add.graphics().setDepth(2);
      const r=this.effectiveEnemySight(e);
      for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
        const tx=e.tx+dx, ty=e.ty+dy;
        if(tx<0||ty<0||tx>=COLS||ty>=ROWS) continue;
        if(this.isWallTile(tx,ty)) continue;
        if(Math.sqrt(dx*dx+dy*dy)>r+0.5) continue;
        if(!inFOV(e,tx,ty)) continue;
        if(!hasLOS(e.tx,e.ty,tx,ty)) continue;
        const fade=1-(Math.sqrt(dx*dx+dy*dy)/r)*0.75;
        g.fillStyle(0xffe8a0,fade*0.06); g.fillRect(tx*S,ty*S,S,S);
      }
      this.sightTiles.push(g);
    }
  }
  clearSightOverlays(){ this.sightTiles.forEach(t=>t.destroy()); this.sightTiles=[]; this.syncEnemySightRings(false); }

  checkSight(){
    if(!this.isExploreMode()) return;
    const spotted=this.enemies.filter(e=>{
      if(!e.alive||e.inCombat) return false;
      const dist=Math.sqrt((e.tx-this.playerTile.x)**2+(e.ty-this.playerTile.y)**2);
      if(dist>this.effectiveEnemySight(e)) return false;
      if(!inFOV(e,this.playerTile.x,this.playerTile.y)) return false;
      return hasLOS(e.tx,e.ty,this.playerTile.x,this.playerTile.y);
    });
    if(spotted.length) this.enterCombat(spotted);
  }

  // ─────────────────────────────────────────
  // MOVEMENT
  // ─────────────────────────────────────────
  setDestination(tx,ty,onArrival){
    // Reveal player if they were hidden in explore mode
    if(this.playerHidden && this.isExploreMode()){
      this.playerHidden = false;
      this.player.setAlpha(1);
      if(this._shadowPlayer){ this._shadowPlayer.destroy(); this._shadowPlayer = null; }
      this.showStatus('Your movement gives away your position!');
      if(this.logEvent) this.logEvent('EXPLORE', 'HIDE_REVEALED_BY_MOVEMENT', {
        playerPos: { x: this.playerTile.x, y: this.playerTile.y }
      });
    }

    if(this.enemies.some(e=>e.alive&&e.tx===tx&&e.ty===ty)) return;
    const blk=(x,y)=>this.isWallTile(x,y)||(this.isDoorTile(x,y)&&!this.isDoorPassable(x,y))||this.enemies.some(e=>e.alive&&e.tx===x&&e.ty===y);
    const path=bfs(this.playerTile.x,this.playerTile.y,tx,ty,blk);
    if(!path.length) return;
    this.tweens.killTweensOf(this.player);
    this.movePath=path; this.isMoving=true; this.onArrival=onArrival||null;
    this.tapInd.setPosition(tx*S+S/2,ty*S+S/2);
    this.tweens.add({targets:this.tapInd,alpha:{from:0.9,to:0},duration:500});
    this.clearPathDots();
    for(let i=0;i<path.length-1;i++){
      const dot=this.add.circle(path[i].x*S+S/2,path[i].y*S+S/2,3,0xd4a857,0.5).setDepth(7);
      this.pathDots.push(dot);
    }
    this.advancePath();
  }
  clearPathDots(){ this.pathDots.forEach(d=>d.destroy()); this.pathDots=[]; }

  advancePath(){
    if(this.mode===MODE.COMBAT&&!this.onArrival){
      this.isMoving=false; this.clearPathDots(); this.movePath=[];
      return;
    }
    if(!this.movePath.length){
      this.isMoving=false; this.clearPathDots();
      if(this.onArrival){ const cb=this.onArrival; this.onArrival=null; cb(); }
      else this.checkSight();
      return;
    }
    const next=this.movePath.shift();
    if(this.pathDots.length){ this.pathDots[0].destroy(); this.pathDots.shift(); }
    const prev={x:this.playerTile.x,y:this.playerTile.y};

    if(this.isDoorTile(next.x,next.y)&&DOOR_RULES.autoOpenOnPass){
      if(!this.setDoorOpen(next.x,next.y,true,true)){
        this.isMoving=false; this.movePath=[]; this.clearPathDots();
        this.showStatus('Door is locked.');
        return;
      }
    }

    this.playerTile={x:next.x,y:next.y};
    this.updateFogOfWar();
    this.playActorMove(this.player,'player',this.movePath.length>=2);
    this.tweens.add({
      targets:this.player, x:next.x*S+S/2, y:next.y*S+S/2, duration:110, ease:'Linear',
      onComplete:()=>{
        if(this.isDoorTile(prev.x,prev.y)){
          const d=this.getDoorState(prev.x,prev.y);
          if(d.auto&&d.open) this.setDoorOpen(prev.x,prev.y,false,true);
        }
        this.lastCompletedTile={x:next.x,y:next.y};
        if(this.mode===MODE.COMBAT&&!this.onArrival){
          this.isMoving=false; this.movePath=[]; this.clearPathDots();
          return;
        }
        if(this.isExploreMode()&&!this._suppressExploreSightChecks) this.checkSight();
        if(!this.movePath.length) this.playActorIdle(this.player,'player');
        this.advancePath();
      }
    });
    this.updateHUD();
  }

  // ─────────────────────────────────────────
  // WANDERING
  // ─────────────────────────────────────────
  wanderEnemies(forceStep=false){
    if(this.mode!==MODE.EXPLORE&&this.mode!==MODE.EXPLORE_TB) return;
    if(this._engageInProgress&&!forceStep) return;
    const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
    for(const e of this.enemies){
      if(!e.alive||e.inCombat) continue;
      if(!forceStep&&Math.random()>0.6) continue;
      let chosenDir=null;

      if(forceStep){
        const block=(x,y)=>this.isWallTile(x,y)||(this.isDoorTile(x,y)&&this.isDoorClosed(x,y))||
          this.enemies.some(o=>o!==e&&o.alive&&o.tx===x&&o.ty===y);
        const chase=bfs(e.tx,e.ty,this.playerTile.x,this.playerTile.y,block);
        if(chase.length){
          const c=chase[0];
          if(!(c.x===this.playerTile.x&&c.y===this.playerTile.y)){
            chosenDir={x:c.x-e.tx,y:c.y-e.ty};
          }
        }
      }

      const shuffled=dirs.slice().sort(()=>Math.random()-0.5);
      const candidateDirs=chosenDir?[chosenDir,...shuffled.filter(d=>!(d.x===chosenDir.x&&d.y===chosenDir.y))]:shuffled;
      for(const d of candidateDirs){
        const nx=e.tx+d.x, ny=e.ty+d.y;
        if(nx<0||ny<0||nx>=COLS||ny>=ROWS) continue;
        if(this.isWallTile(nx,ny)) continue;
        // [BUG-5 fix] Enemies respect closed doors while wandering
        if(this.isDoorTile(nx,ny)&&this.isDoorClosed(nx,ny)) continue;
        if(this.enemies.some(o=>o!==e&&o.alive&&o.tx===nx&&o.ty===ny)) continue;
        if(nx===this.playerTile.x&&ny===this.playerTile.y) continue;
        e.tx=nx; e.ty=ny;
        e.facing=Math.atan2(d.y,d.x)*180/Math.PI;
        const wx=nx*S+S/2, wy=ny*S+S/2;
        this.playActorMove(e.img,e.type,false);
        this.tweens.add({targets:e.img,x:wx,y:wy,duration:350});
        this.tweens.add({targets:e.hpBg,x:wx,y:ny*S-4,duration:350});
        this.tweens.add({targets:e.hpFg,x:wx,y:ny*S-4,duration:350});
        this.tweens.add({targets:e.lbl,x:wx,y:wy+18,duration:350});
        this.tweens.add({targets:e.sightRing,x:wx,y:wy,duration:350});
        if(e.fa){ e.fa.setPosition(wx,wy); e.fa.setRotation(e.facing*Math.PI/180); }
        this.time.delayedCall(370,()=>{ if(e.alive) this.playActorIdle(e.img,e.type); });
        break;
      }
    }
    this.time.delayedCall(400,()=>{ this.drawSightOverlays(); this.updateFogOfWar(); });
  }

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
  // UPDATE LOOP
  // ─────────────────────────────────────────
  update(time,delta){
    // Freeze movement while dice popup is active (tap-to-continue state)
    if(this.diceWaiting){
      this.keyDelay = 0;
      return;
    }

    if(this.isExploreMode()){
      if(!this.isMoving){
        this.keyDelay-=delta;
        if(this.keyDelay<=0){
          let dx=0, dy=0;
          const left=this.cursors.left.isDown||this.wasd.left.isDown;
          const right=this.cursors.right.isDown||this.wasd.right.isDown;
          const up=this.cursors.up.isDown||this.wasd.up.isDown;
          const down=this.cursors.down.isDown||this.wasd.down.isDown;
          const anyDir=left||right||up||down;
          if(!anyDir&&this.mode===MODE.EXPLORE_TB) this._exploreTBInputLatch=false;
          if(left) dx=-1;
          if(right) dx=1;
          if(up) dy=-1;
          if(down) dy=1;
          if(dx||dy){
            const nx=this.playerTile.x+dx, ny=this.playerTile.y+dy;
            if(this.mode===MODE.EXPLORE_TB){
              if(this._exploreTBInputLatch){
                this.keyDelay=80;
                return;
              }
              this._exploreTBInputLatch=true;
              if(this._exploreTBEnemyPhase||this._exploreTBMovesRemaining<=0){
                this.keyDelay=140;
                return;
              }
              const blocked=nx<0||ny<0||nx>=COLS||ny>=ROWS||this.isWallTile(nx,ny)||
                (this.isDoorTile(nx,ny)&&this.isDoorClosed(nx,ny))||
                this.enemies.some(e=>e.alive&&e.tx===nx&&e.ty===ny);
              if(!blocked){
                this.setDestination(nx,ny,()=>this.endExploreTurnBasedPlayerTurn());
                this.keyDelay=180;
              }
            } else if(nx>=0&&ny>=0&&nx<COLS&&ny<ROWS&&!this.isWallTile(nx,ny)){
              this.movePath=[{x:nx,y:ny}]; this.isMoving=true; this.advancePath(); this.keyDelay=140;
            }
          }
        }
      }
    }
  }
}
