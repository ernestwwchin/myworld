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
    return this.mode===MODE.EXPLORE;
  }

  /** Assign unique displayName to each enemy; appends A/B/C when multiples of same type exist */
  _assignEnemyDisplayNames(){
    const counts={};
    for(const e of this.enemies) counts[e.type]=(counts[e.type]||0)+1;
    const indices={};
    const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for(const e of this.enemies){
      if(e.name){
        // Explicit name from data (encounter or creature template)
        e.displayName=e.name;
      } else {
        const raw=e.type||e.id||'Unknown';
        const cap=raw.charAt(0).toUpperCase()+raw.slice(1);
        if(counts[e.type]>1){
          const idx=indices[e.type]=(indices[e.type]||0);
          e.displayName=`${cap} ${LETTERS[idx]||idx+1}`;
          indices[e.type]=idx+1;
        } else {
          e.displayName=cap;
        }
      }
      if(e.lbl) e.lbl.setText(e.displayName.toUpperCase());
    }
  }

  // Damage type → floating text color
  static DMG_COLORS = {
    slashing:'#ffffff', piercing:'#e0e0e0', bludgeoning:'#d0d0d0',
    fire:'#ff6b35', cold:'#64d8cb', lightning:'#f0e060',
    thunder:'#b388ff', poison:'#66bb6a', acid:'#c6ff00',
    necrotic:'#ce93d8', radiant:'#fff59d', psychic:'#f48fb1',
    force:'#90caf9',
  };
  dmgColor(type){ return GameScene.DMG_COLORS[type]||'#ffdd57'; }

  fmtSigned(n){
    const v=Number(n)||0;
    return v>=0?`+${v}`:`${v}`;
  }

  formatRollLine(roll,mod,total,ac){
    const m=Number(mod)||0;
    return `d20(${roll}) ${m>=0?'+ '+m:'- '+Math.abs(m)} = ${total} | AC ${ac}`;
  }

  formatDamageBreakdown(dr){
    if (!dr || typeof dr !== 'object') return String(dr||'');
    const { total, bonus, isCrit, baseRolls, critRolls } = dr;
    const bonusStr = bonus ? (bonus >= 0 ? ` + ${bonus}` : ` - ${Math.abs(bonus)}`) : '';

    const groupRolls = (rolls) => {
      const groups = {};
      for (const r of rolls) {
        const k = r.kind;
        if (!groups[k]) groups[k] = { kind: k, values: [] };
        groups[k].values.push(r.value);
      }
      return Object.values(groups).map(g => `${g.values.length}${g.kind}(${g.values.join(',')})`).join('+');
    };

    if (isCrit && critRolls.length > 0) {
      return `${groupRolls(baseRolls)} + ${groupRolls(critRolls)} [CRIT]${bonusStr} = ${total}`;
    }
    return `${groupRolls(baseRolls)}${bonusStr} = ${total}`;
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

  /** Check if a tile blocks movement.
   * @param {'passable'|'closed'|false} [opts.doorMode='passable']
   *   'passable' — blocks when !isDoorPassable (locked+closed; player pathing)
   *   'closed'   — blocks when isDoorClosed (any closed door; enemy/keyboard)
   *   false      — skip door checks
   * @param {Object} [opts.excludeEnemy] enemy to exclude from check
   * @param {boolean} [opts.skipEnemies] skip enemy blocking entirely */
  isBlockedTile(x, y, { doorMode = 'passable', excludeEnemy = null, skipEnemies = false } = {}) {
    if (this.isWallTile(x, y)) return true;
    if (doorMode === 'passable' && this.isDoorTile(x, y) && !this.isDoorPassable(x, y)) return true;
    if (doorMode === 'closed' && this.isDoorTile(x, y) && this.isDoorClosed(x, y)) return true;
    if (!skipEnemies && this.enemies.some(e => e.alive && e.tx === x && e.ty === y && e !== excludeEnemy)) return true;
    return false;
  }

  /** Check if diagonal movement from (ox,oy) to (nx,ny) is valid (no corner-cutting). */
  canMoveDiagonal(ox, oy, nx, ny) {
    const hBlk = this.isWallTile(nx, oy) || (this.isDoorTile(nx, oy) && this.isDoorClosed(nx, oy));
    const vBlk = this.isWallTile(ox, ny) || (this.isDoorTile(ox, ny) && this.isDoorClosed(ox, ny));
    return !(hBlk && vBlk);
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
    this.pStats.inventory=[...PLAYER_STATS.inventory];
    this.pStats.equippedWeapon=PLAYER_STATS.equippedWeapon?{...PLAYER_STATS.equippedWeapon}:null;
    this.pStats.equippedArmor=PLAYER_STATS.equippedArmor?{...PLAYER_STATS.equippedArmor}:null;
    this.pStats.baseAC=PLAYER_STATS.baseAC||this.pStats.ac;
    this.pStats._statMods=[];
    this.playerHP=this.pStats.maxHP; this.playerMaxHP=this.pStats.maxHP;
    this.playerTile={x:PLAYER_STATS.startTile.x, y:PLAYER_STATS.startTile.y};
    this.isMoving=false; this.movePath=[]; this.onArrival=null; this.pathDots=[]; this._movingToAttack=false; this.lastCompletedTile={...PLAYER_STATS.startTile};
    this.rangeTiles=[]; this.atkRangeTiles=[]; this.sightTiles=[];
    this.fogVisited=[]; this.fogVisible=[];
    this.detectMarkers=[];
    this.combatGroup=[]; this.turnOrder=[]; this.turnIndex=0;
    this.playerAP=1; this.playerMoves=Number(COMBAT_RULES.playerMovePerTurn||5); this.playerMovesUsed=0;
    this.pendingAction=null;
    this.diceWaiting=false; this._afterPlayerDice=null;
    this.turnStartTile={...PLAYER_STATS.startTile};
    this.enemySightEnabled=true;
    this.playerHidden=false; this.playerStealthRoll=0;
    this.playerEffects=[];
    this._pendingEnemyTurnActor=null;
    this._queuedEngageEnemy=null;
    this._engageInProgress=false;
    this._suppressExploreSightChecks=false;
    this.mapLights=[];
    this.globalLight='dark';
    this.doorStates={};
    this.tileSprites=[];
    this.stageSprites=[];

    // map tiles
    // Debug: find stairs in MAP
    let _stairsFound = false;
    for(let r=0;r<ROWS;r++){
      this.tileSprites[r]=[];
      for(let c=0;c<COLS;c++){
      const t=MAP[r][c];
      if(t===TILE.STAIRS){ console.log(`[STAIRS] Found stairs tile at (${c},${r}) val=${t}`); _stairsFound=true; }
      let k='t_floor';
      if(this.isWallTile(c,r))k='t_wall'; else if(t===TILE.STAIRS)k='t_stairs';
      else if(t===TILE.WATER)k='t_water'; else if(t===TILE.GRASS)k='t_grass';
      this.tileSprites[r][c]=this.add.image(c*S+S/2,r*S+S/2,...getTileTex(k)).setDisplaySize(S,S);
      }
    }
    if(!_stairsFound) console.warn('[STAIRS] No stairs tile found in MAP!');
    this.startTileAnimations();
    this.spawnStageSprites();

    // enemies
    const _usedTiles=new Set([`${this.playerTile.x},${this.playerTile.y}`]);
    const _randomFloorTile=(minDist=6)=>{
      // Collect floor tiles at least minDist away from player start
      const px=this.playerTile.x, py=this.playerTile.y;
      const candidates=[];
      for(let y=1;y<ROWS-1;y++) for(let x=1;x<COLS-1;x++){
        if(MAP[y][x]!==TILE.FLOOR) continue;
        if(Math.abs(x-px)+Math.abs(y-py)<minDist) continue;
        if(_usedTiles.has(`${x},${y}`)) continue;
        candidates.push({x,y});
      }
      if(!candidates.length) return {x:px+2,y:py}; // fallback
      const pick=candidates[Math.floor(Math.random()*candidates.length)];
      _usedTiles.add(`${pick.x},${pick.y}`);
      return pick;
    };
    this.enemies=ENEMY_DEFS.map(def=>{
      // tx=-1 means "place randomly" (used by procedural maps)
      if(def.tx<0){ const t=_randomFloorTile(); def={...def,tx:t.x,ty:t.y}; }
      const [eatlas,eframe]=getCharFrame(def.type,'idle',0);
      const img=this.add.sprite(def.tx*S+S/2,def.ty*S+S/2,eatlas,eframe).setScale(S/16).setOrigin(0.5,0.8).setDepth(9).setInteractive();
      const hpBg=this.add.rectangle(def.tx*S+S/2,def.ty*S-4,S-8,5,0x1a1a2e).setDepth(11);
      const hpFg=this.add.rectangle(def.tx*S+S/2,def.ty*S-4,S-8,5,0xe74c3c).setDepth(12);
      const lbl=this.add.text(def.tx*S+S/2,def.ty*S+S/2+S*0.52,'',{fontSize:'7px',fill:'#aaaacc',letterSpacing:1}).setOrigin(0.5).setDepth(12).setAlpha(0.7);
      const sightRing=this.add.circle(def.tx*S+S/2,def.ty*S+S/2,def.sight*S,0xe74c3c,0).setDepth(2).setStrokeStyle(1,0xe74c3c,0.08).setAlpha(0);
      const fa=this.add.triangle(def.tx*S+S/2,def.ty*S+S/2,0,-8,12,0,0,8,0xf0c060,0.7).setDepth(13);
      fa.setRotation(def.facing*Math.PI/180);
      const enemy={...def,img,hpBg,hpFg,lbl,sightRing,fa,alive:true,inCombat:false,lastSeenPlayerTile:{x:def.tx,y:def.ty},searchTurnsRemaining:0};
      enemy.effects=this.normalizeEffects(def.effects||def.statuses||[]);
      this.playActorIdle(img, def.type);
      img.on('pointerdown',(ptr)=>{
        if(ptr.rightButtonDown()){ this.showCombatEnemyPopup(enemy); return; }
        // Long-press → inspect (start timer)
        enemy._pressTimer=this.time.delayedCall(400,()=>{ enemy._longPressed=true; this.showCombatEnemyPopup(enemy); });
      });
      img.on('pointerup',()=>{
        if(enemy._pressTimer){ enemy._pressTimer.remove(); enemy._pressTimer=null; }
        if(enemy._longPressed){ enemy._longPressed=false; return; } // already handled
        this.onTapEnemy(enemy);
      });
      img.on('pointerout',()=>{
        if(enemy._pressTimer){ enemy._pressTimer.remove(); enemy._pressTimer=null; }
        enemy._longPressed=false;
      });
      return enemy;
    });
    // Assign unique displayName (e.g. "Goblin A", "Goblin B") when duplicates exist
    this._assignEnemyDisplayNames();

    // player
    const [patlas,pframe]=getCharFrame('player','idle',0);
    this.player=this.add.sprite(this.playerTile.x*S+S/2,this.playerTile.y*S+S/2,patlas,pframe).setScale(S/16).setOrigin(0.5,0.8).setDepth(10);
    this.playActorIdle(this.player,'player');
    this.turnHL=this.add.image(-100,-100,'t_turn').setDisplaySize(S,S).setDepth(9).setAlpha(0);
    this.tapInd=this.add.image(-100,-100,'t_tap').setDisplaySize(S,S).setDepth(8).setAlpha(0);
    if(this.textures.exists('_fog_rt')) this.textures.remove('_fog_rt');
    this._fogCanvasTex=this.textures.createCanvas('_fog_rt',COLS*S,ROWS*S);
    this._fogCtx=this._fogCanvasTex.getContext();
    this.fogLayer=this.add.image(0,0,'_fog_rt').setOrigin(0,0).setDepth(15);

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
    hz.on('pointerdown',ptr=>this._onHzPointerDown(ptr));
    this.input.on('pointermove',ptr=>this._onHzPointerMove(ptr));
    this.input.on('pointerup',()=>this._onHzPointerUp());
    this.initInputHandlers();

    this.cursors=this.input.keyboard.createCursorKeys();
    this.wasd=this.input.keyboard.addKeys({up:Phaser.Input.Keyboard.KeyCodes.W,down:Phaser.Input.Keyboard.KeyCodes.S,left:Phaser.Input.Keyboard.KeyCodes.A,right:Phaser.Input.Keyboard.KeyCodes.D});
    this.keyDelay=0;

    // Explore mode shortcuts
    this.input.keyboard.on('key-h', ()=>{ if(this.isExploreMode()) this.tryHideInExplore(); });

    // Explore hotbar (touch/tablet — BG3-style persistent bottom bar)
    const eHide = document.getElementById('btn-explore-hide');
    const eSight = document.getElementById('btn-explore-sight');
    const eStats = document.getElementById('btn-explore-stats');
    if (eHide) eHide.onclick = () => { if(this.isExploreMode()) this.tryHideInExplore(); this.syncExploreBar(); };
    if (eSight) eSight.onclick = () => { this.toggleEnemySight(); this.syncExploreBar(); };
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

    // Initialize new UI modules
    withSidePanel(sidePanel => sidePanel.init(this));
    withHotbar(hotbar => hotbar.init(this));

    this.updateHUD();
    this.updateStatsPanel();
    this.playerEffects=this.normalizeEffects(this.pStats.effects||[]);
    this.drawSightOverlays();
    this.updateFogOfWar();
    this.time.addEvent({delay:1200,loop:true,callback:()=>{ if(this.mode===MODE.EXPLORE) this.wanderEnemies(); }});
    this.startExploreStatusTicker();

    // Init event system (YAML-driven events + dialogs)
    if (typeof EventRunner !== 'undefined') {
      EventRunner.init(this, ModLoader._modData?._stageEvents || []);
    }
    if (typeof DialogRunner !== 'undefined') {
      DialogRunner.init(this, ModLoader._modData?._stageDialogs || {});
    }

    console.log(`[GameScene] create() complete — mode:${this.mode} map:${COLS}x${ROWS} enemies:${this.enemies.length} player:(${this.playerTile.x},${this.playerTile.y}) floor:${window._MAP_META?.floor} nextStage:${window._MAP_META?.nextStage}`);
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
      const texArgs=getTileTex(key);
      if(!this.textures.exists(texArgs[0])) continue;
      const depth=Number(s.depth||6);
      const alpha=Math.max(0,Math.min(1,Number(s.alpha??1)));
      const scale=Math.max(0.3,Number(s.scale||1));
      const img=this.add.image(tx*S+S/2,ty*S+S/2,...texArgs).setDepth(depth).setAlpha(alpha).setScale(scale);
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
    if (bar) {
      const show = this.isExploreMode();
      bar.classList.toggle('hidden', !show);
      const hideBtn = document.getElementById('btn-explore-hide');
      if (hideBtn) hideBtn.classList.toggle('active', !!this.playerHidden);
      const sightBtn = document.getElementById('btn-explore-sight');
      if (sightBtn) sightBtn.classList.toggle('off', !this.enemySightEnabled);
    }
    // Sync hotbar expand/collapse with mode
    withHotbar(hotbar => {
      hotbar.setExpanded(this.mode === MODE.COMBAT);
      hotbar.syncCommandStrip();
      hotbar.updateResourcePips();
    });
  }

  // tryHideAction — implemented in ability-system.js
  // tryHideInExplore — implemented in ability-system.js
  // hideContextMenu, showContextMenu, onTap, toggleExploreDoor — implemented in input-system.js

  onTapEnemy(enemy){
    if(!enemy.alive) return;
    // Attack targeting mode: initiate combat / attack this enemy
    if(this.pendingAction==='attack'){
      this.clearPendingAction();
      if(this.mode===MODE.COMBAT){
        const dx=Math.abs(this.playerTile.x-enemy.tx), dy=Math.abs(this.playerTile.y-enemy.ty);
        if(dx<=1&&dy<=1) this.playerAttackEnemy(enemy);
        else if(this.playerMoves>0) this.tryMoveAndAttack(enemy);
        else this.showStatus('No movement left to reach this enemy.');
      } else if(this.isExploreMode()){
        if(typeof this.tryEngageEnemyFromExplore==='function'){
          this.tryEngageEnemyFromExplore(enemy);
        } else {
          this.enterCombat([enemy]);
        }
      }
      return;
    }
    if(this.isExploreMode()){
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

  // _getItemMaxStack, _isStackableItem, addItemToInventory, handleEnemyDefeatLoot,
  // useItem, tickStatMods, equipItem, dropItem — implemented in inventory-system.js

  showDicePopup(rollLine,detailLine,type,diceValues){
    if(this.ui) return this.ui.showDicePopup(rollLine,detailLine,type,diceValues);
  }

  // drawSightOverlays, clearSightOverlays, checkSight — implemented in sight-system.js

  // setDestination, clearPathDots, advancePath, wanderEnemies — implemented in movement-system.js

  // checkLevelUp, showASIPanel, applyASI — implemented in leveling-system.js

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

  spawnFloat(x,y,text,color,delay=0){
    const spawn=()=>{
      const t=this.add.text(x,y,text,{fontSize:'20px',fill:color,stroke:'#000',strokeThickness:4,fontStyle:'bold'}).setOrigin(0.5).setDepth(30);
      this.tweens.add({targets:t,y:y-50,duration:1600,ease:'Power2'});
      this.tweens.add({targets:t,alpha:0,duration:600,delay:1000,ease:'Linear',onComplete:()=>t.destroy()});
    };
    if(delay>0) this.time.delayedCall(delay,spawn); else spawn();
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
    if(!this.isExploreMode()) return;
    // Hold-to-move: step toward cursor each time player finishes a tile
    if(this._holdMoveActive&&!this.isMoving){ this._holdMoveStep(); return; }
    if(this.isMoving) return;
    this.updateExplore(delta);
  }
}
