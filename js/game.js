// ═══════════════════════════════════════════════════════
// game.js — GameScene (Phaser scene with all game logic)
// ═══════════════════════════════════════════════════════

class GameScene extends Phaser.Scene {
  constructor(){ super('GameScene'); }

  preload(){ generateSprites(this); }

  create(){
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
    this.combatGroup=[]; this.turnOrder=[]; this.turnIndex=0;
    this.playerAP=1; this.playerMoves=6; this.playerMovesUsed=0;
    this.pendingAction=null; this.wanderTimer=0;
    this.diceWaiting=false; this._afterPlayerDice=null;
    this.turnStartTile={...PLAYER_STATS.startTile};

    // map tiles
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const t=MAP[r][c];
      let k='t_floor';
      if(t===TILE.WALL)k='t_wall'; else if(t===TILE.DOOR)k='t_door';
      else if(t===TILE.CHEST)k='t_chest'; else if(t===TILE.STAIRS)k='t_stairs';
      else if(t===TILE.WATER)k='t_water'; else if(t===TILE.GRASS)k='t_grass';
      this.add.image(c*S+S/2,r*S+S/2,k).setDisplaySize(S,S);
    }

    // enemies
    this.enemies=ENEMY_DEFS.map(def=>{
      const img=this.add.image(def.tx*S+S/2,def.ty*S+S/2,`spr_${def.type}`).setDisplaySize(S,S).setDepth(9).setInteractive();
      const hpBg=this.add.rectangle(def.tx*S+S/2,def.ty*S-4,S-8,5,0x1a1a2e).setDepth(11);
      const hpFg=this.add.rectangle(def.tx*S+S/2,def.ty*S-4,S-8,5,0xe74c3c).setDepth(12);
      const lbl=this.add.text(def.tx*S+S/2,def.ty*S+S/2+S*0.52,def.type.toUpperCase(),{fontSize:'7px',fill:'#aaaacc',letterSpacing:1}).setOrigin(0.5).setDepth(12).setAlpha(0.7);
      const sightRing=this.add.circle(def.tx*S+S/2,def.ty*S+S/2,def.sight*S,0xe74c3c,0).setDepth(2).setStrokeStyle(1,0xe74c3c,0.2);
      const fa=this.add.triangle(def.tx*S+S/2,def.ty*S+S/2,0,-8,12,0,0,8,0xf0c060,0.7).setDepth(13);
      fa.setRotation(def.facing*Math.PI/180);
      const enemy={...def,img,hpBg,hpFg,lbl,sightRing,fa,alive:true,inCombat:false};
      img.on('pointerdown',()=>this.onTapEnemy(enemy));
      return enemy;
    });

    // player
    this.player=this.add.image(this.playerTile.x*S+S/2,this.playerTile.y*S+S/2,'spr_player').setDisplaySize(S,S).setDepth(10);
    this.turnHL=this.add.image(-100,-100,'t_turn').setDisplaySize(S,S).setDepth(9).setAlpha(0);
    this.tapInd=this.add.image(-100,-100,'t_tap').setDisplaySize(S,S).setDepth(8).setAlpha(0);

    // camera
    this.cameras.main.setBounds(0,0,COLS*S,ROWS*S);
    this.cameras.main.startFollow(this.player,true,0.12,0.12);

    // input
    const hz=this.add.zone(0,0,COLS*S,ROWS*S).setOrigin(0,0).setDepth(0).setInteractive();
    hz.on('pointerdown',ptr=>this.onTap(ptr));

    this.cursors=this.input.keyboard.createCursorKeys();
    this.wasd=this.input.keyboard.addKeys({up:Phaser.Input.Keyboard.KeyCodes.W,down:Phaser.Input.Keyboard.KeyCodes.S,left:Phaser.Input.Keyboard.KeyCodes.A,right:Phaser.Input.Keyboard.KeyCodes.D});
    this.keyDelay=0;

    document.getElementById('btn-atk').onclick=()=>this.selectAction('attack');
    document.getElementById('btn-dash').onclick=()=>this.selectAction('dash');
    document.getElementById('btn-rmove').onclick=()=>this.resetMove();
    document.getElementById('btn-end').onclick=()=>this.endPlayerTurn();

    this.updateHUD();
    this.updateStatsPanel();
    this.drawSightOverlays();
    this.time.addEvent({delay:1200,loop:true,callback:()=>{ if(this.mode===MODE.EXPLORE) this.wanderEnemies(); }});
    this.showStatus('Explore — enemies will spot you from their facing direction!');
  }

  // ─────────────────────────────────────────
  // INPUT
  // ─────────────────────────────────────────
  onTap(ptr){
    if(this.diceWaiting){ this._handleDiceDismiss(); return; }
    if(this.isMoving) return;
    const tx=Math.floor(ptr.worldX/S), ty=Math.floor(ptr.worldY/S);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return;
    const enemy=this.enemies.find(e=>e.alive&&e.tx===tx&&e.ty===ty);
    if(this.mode===MODE.COMBAT){ this.onTapCombat(tx,ty,enemy); return; }
    if(enemy){ this.onTapEnemy(enemy); return; }
    if(MAP[ty][tx]===TILE.WALL) return;
    const pop=document.getElementById('enemy-stat-popup'); if(pop) pop.style.display='none';
    this._statPopupEnemy=null;
    this.setDestination(tx,ty);
  }

  onTapEnemy(enemy){
    if(!enemy.alive) return;
    if(this.mode===MODE.EXPLORE){
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
    const pop=document.getElementById('enemy-stat-popup');
    if(!pop) return;
    const m=s=>(Math.floor((s-10)/2)>=0?'+':'')+Math.floor((s-10)/2);
    const dx=Math.abs(this.playerTile.x-enemy.tx), dy=Math.abs(this.playerTile.y-enemy.ty);
    const isAdj=dx<=1&&dy<=1;
    const hasAP=this.playerAP>0;
    const hasMoves=this.playerMoves>0;
    document.getElementById('esp-name').textContent=`${enemy.icon} ${enemy.type.toUpperCase()} (CR ${enemy.cr})`;
    document.getElementById('esp-stats').innerHTML=`
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        ${['str','dex','con','int','wis','cha'].map(s=>`<div style="text-align:center"><div style="color:#c9a84c;font-size:9px">${s.toUpperCase()}</div><div>${enemy.stats[s]}</div><div style="color:#7fc8f8;font-size:9px">${m(enemy.stats[s])}</div></div>`).join('')}
      </div>
      <div style="color:#aaa;font-size:10px">AC ${enemy.ac} · HP ${enemy.hp}/${enemy.maxHp}</div>
      <div style="color:#e74c3c;font-size:10px;margin-top:2px">ATK ${enemy.atkDice[0]}d${enemy.atkDice[1]}${enemy.atkDice[2]>=0?'+':''}${enemy.atkDice[2]} · d20${m(enemy.stats.str)>=0?'+':''}${m(enemy.stats.str)}</div>
      <div style="display:flex;gap:6px;margin-top:8px">
        ${hasAP&&isAdj?`<div onclick="window._combatAct&&window._combatAct('attack')" style="flex:1;text-align:center;background:rgba(231,76,60,0.25);border:1px solid rgba(231,76,60,0.6);color:#e74c3c;padding:5px 6px;border-radius:4px;cursor:pointer;font-size:10px;pointer-events:all">⚔ Attack</div>`:''}
        ${hasAP&&!isAdj&&hasMoves?`<div onclick="window._combatAct&&window._combatAct('moveattack')" style="flex:1;text-align:center;background:rgba(243,156,18,0.2);border:1px solid rgba(243,156,18,0.5);color:#f39c12;padding:5px 6px;border-radius:4px;cursor:pointer;font-size:10px;pointer-events:all">🏃 Move & Attack</div>`:''}
        ${!hasAP?`<div style="flex:1;text-align:center;color:#546e7a;padding:5px 6px;font-size:10px">No action left</div>`:''}
        <div onclick="window._combatAct&&window._combatAct('cancel')" style="text-align:center;background:rgba(52,73,94,0.5);border:1px solid #333;color:#aaa;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:10px;pointer-events:all">✕</div>
      </div>`;
    pop.style.display='block';
    pop.style.left='50%'; pop.style.top='50%'; pop.style.transform='translate(-50%,-50%)';

    window._combatAct=(action)=>{
      pop.style.display='none'; window._combatAct=null;
      if(action==='attack'){
        this.playerAttackEnemy(enemy);
      } else if(action==='moveattack'){
        const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
        let bestPath=null, bestAdj=null;
        for(const d of dirs){
          const ax=enemy.tx+d.x, ay=enemy.ty+d.y;
          if(ax<0||ay<0||ax>=COLS||ay>=ROWS||MAP[ay][ax]===TILE.WALL) continue;
          if(this.enemies.some(e=>e.alive&&e.tx===ax&&e.ty===ay)) continue;
          const p=bfs(this.playerTile.x,this.playerTile.y,ax,ay,wallBlk);
          if(p.length&&p.length<=this.playerMoves&&(!bestPath||p.length<bestPath.length)){
            bestPath=p; bestAdj={x:ax,y:ay};
          }
        }
        if(!bestPath){ this.showStatus('Not enough movement to reach.'); return; }
        const cost=bestPath.length;
        const targetEnemy=enemy;
        this.clearMoveRange();
        this._movingToAttack=true;
        this.setDestination(bestAdj.x,bestAdj.y,()=>{
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
      }
    };
    this.time.delayedCall(8000,()=>{ if(pop) pop.style.display='none'; window._combatAct=null; });
  }

  showEnemyStatPopup(enemy){
    const pop=document.getElementById('enemy-stat-popup');
    if(!pop) return;
    const m=s=>(Math.floor((s-10)/2)>=0?'+':'')+Math.floor((s-10)/2);
    document.getElementById('esp-name').textContent=`${enemy.icon} ${enemy.type.toUpperCase()} (CR ${enemy.cr})`;
    document.getElementById('esp-stats').innerHTML=`
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        ${['str','dex','con','int','wis','cha'].map(s=>`<div style="text-align:center"><div style="color:#c9a84c;font-size:9px">${s.toUpperCase()}</div><div>${enemy.stats[s]}</div><div style="color:#7fc8f8;font-size:9px">${m(enemy.stats[s])}</div></div>`).join('')}
      </div>
      <div style="color:#aaa;font-size:10px">AC ${enemy.ac} · HP ${enemy.hp}/${enemy.maxHp} · CR ${enemy.cr}</div>
      <div style="color:#e74c3c;font-size:10px;margin-top:3px">ATK: 1d20+${m(enemy.stats.str)} · DMG: ${enemy.atkDice[0]}d${enemy.atkDice[1]}${enemy.atkDice[2]>=0?'+':''}${enemy.atkDice[2]}</div>
      <div onclick="window._engageEnemy&&window._engageEnemy()" style="margin-top:8px;text-align:center;background:rgba(231,76,60,0.2);border:1px solid rgba(231,76,60,0.5);color:#e74c3c;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:10px;letter-spacing:2px;pointer-events:all">⚔ ENGAGE</div>`;
    pop.style.left='50%';
    pop.style.top='50%';
    pop.style.transform='translate(-50%,-50%)';
    pop.style.display='block';
    this._statPopupEnemy=enemy;
    window._engageEnemy=()=>{
      const p=document.getElementById('enemy-stat-popup');
      if(p) p.style.display='none';
      this._statPopupEnemy=null;
      window._engageEnemy=null;
      this.tweens.killTweensOf(this.player);
      this.movePath=[]; this.isMoving=false; this.clearPathDots(); this.onArrival=null;
      const snap=this.lastCompletedTile||this.playerTile;
      this.playerTile={x:snap.x,y:snap.y};
      this.player.setPosition(snap.x*S+S/2,snap.y*S+S/2);
      this.enterCombat([enemy]);
    };
    this.time.delayedCall(4000,()=>{ if(pop) pop.style.display='none'; window._engageEnemy=null; });
  }

  onTapCombat(tx,ty,enemy){
    if(this._movingToAttack) return;
    if(!this.isPlayerTurn()){ this.showStatus('Not your turn yet.'); return; }

    if(this.pendingAction==='attack'){
      if(enemy&&this.combatGroup.includes(enemy)) this.playerAttackEnemy(enemy);
      else this.showStatus('Tap a highlighted enemy to attack.');
      return;
    }

    if(enemy&&this.combatGroup.includes(enemy)){
      this.showCombatEnemyPopup(enemy);
      return;
    }

    if(enemy&&!this.combatGroup.includes(enemy)){
      this.showStatus('That enemy is not in this fight.');
      return;
    }

    if(MAP[ty][tx]!==TILE.WALL){
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
    this.cameras.main.startFollow(this.player,true,0.12,0.12);

    const alerted=new Set(triggers);

    for(const e of this.enemies){
      if(!e.alive||alerted.has(e)) continue;
      const dist=Math.sqrt((e.tx-this.playerTile.x)**2+(e.ty-this.playerTile.y)**2);
      if(dist<=e.sight&&hasLOS(e.tx,e.ty,this.playerTile.x,this.playerTile.y)) alerted.add(e);
    }

    let changed=true;
    while(changed){
      changed=false;
      for(const e of this.enemies){
        if(!e.alive||alerted.has(e)) continue;
        for(const a of alerted){
          const sameGroup=e.group&&a.group&&e.group===a.group;
          const dist=Math.abs(e.tx-a.tx)+Math.abs(e.ty-a.ty);
          const nearby=dist<=4&&hasLOS(e.tx,e.ty,a.tx,a.ty)&&sameOpenArea(e.tx,e.ty,a.tx,a.ty,5);
          if(sameGroup||nearby){ alerted.add(e); changed=true; break; }
        }
      }
    }
    this.combatGroup=[...alerted];
    this.combatGroup.forEach(e=>e.inCombat=true);

    const order=[{id:'player',init:999},...this.combatGroup.map(e=>({id:'enemy',enemy:e,init:Math.random()*10+e.spd}))].sort((a,b)=>b.init-a.init);
    this.turnOrder=order; this.turnIndex=0; this.playerAP=1; this.playerMoves=6; this.playerMovesUsed=0;

    this.flashBanner('COMBAT!','combat');
    document.getElementById('vignette').classList.add('combat');
    document.getElementById('mode-badge').className='turnbased';
    document.getElementById('mode-badge').textContent='⚔ COMBAT';
    this.cameras.main.shake(400,0.008);
    this.clearSightOverlays();
    this.time.delayedCall(700,()=>{ this.buildInitBar(); this.startNextTurn(); });
  }

  exitCombat(){
    this.mode=MODE.EXPLORE;
    this.combatGroup=[]; this.turnOrder=[]; this.turnIndex=0; this.pendingAction=null;
    this.diceWaiting=false; this._afterPlayerDice=null; this._movingToAttack=false;
    const ov=document.getElementById('dice-ov'); if(ov) ov.classList.remove('show');
    this.clearMoveRange(); this.clearAtkRange();
    this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
    document.getElementById('vignette').classList.remove('combat');
    document.getElementById('mode-badge').className='realtime';
    document.getElementById('mode-badge').textContent='EXPLORE';
    document.getElementById('init-bar').classList.remove('show');
    document.getElementById('action-bar').classList.remove('show');
    document.getElementById('res-bar').classList.remove('show');
    this.flashBanner('COMBAT OVER','explore');
    this.showStatus('Victory! Continue exploring.');
    this.time.delayedCall(300,()=>this.drawSightOverlays());
  }

  // ─────────────────────────────────────────
  // TURN MANAGEMENT
  // ─────────────────────────────────────────
  startNextTurn(){
    this.turnOrder=this.turnOrder.filter(t=>t.id==='player'||(t.enemy&&t.enemy.alive));
    if(!this.turnOrder.length||this.combatGroup.every(e=>!e.alive)){ this.exitCombat(); return; }
    if(this.turnIndex<0||this.turnIndex>=this.turnOrder.length) this.turnIndex=0;
    const cur=this.turnOrder[this.turnIndex];
    this.buildInitBar();

    if(cur.id==='player'){
      this.playerAP=1; this.playerMoves=6; this.playerMovesUsed=0;
      this.turnStartMoves=6;
      this.turnStartTile={...this.playerTile};
      this.pendingAction=null;
      this.clearMoveRange(); this.clearAtkRange();
      document.getElementById('action-bar').classList.add('show');
      document.getElementById('res-bar').classList.add('show');
      ['btn-atk','btn-dash','btn-rmove'].forEach(id=>{
        const el=document.getElementById(id);
        if(el){ el.classList.remove('selected','used'); el.style.opacity=''; el.style.pointerEvents=''; }
      });
      this.turnHL.setPosition(this.player.x,this.player.y).setAlpha(1);
      this.tweens.add({targets:this.turnHL,alpha:0.35,duration:600,yoyo:true,repeat:-1});
      this.updateResBar();
      this.time.delayedCall(100,()=>this.showMoveRange());
      this.showStatus('Your turn! Move freely · Attack or Dash as your action.');
    } else {
      document.getElementById('action-bar').classList.remove('show');
      document.getElementById('res-bar').classList.remove('show');
      this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
      this.clearMoveRange();
      this.showStatus(`${cur.enemy.type}'s turn...`);
      this.time.delayedCall(400,()=>this.doEnemyTurn(cur.enemy));
    }
  }

  endPlayerTurn(){
    if(this.mode!==MODE.COMBAT) return;
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
    if(this.playerMovesUsed===0){ this.showStatus('Haven\'t moved yet.'); return; }
    this.tweens.killTweensOf(this.player);
    this.movePath=[]; this.isMoving=false; this.clearPathDots(); this.onArrival=null;
    this.playerTile={...this.turnStartTile};
    this.player.setPosition(this.turnStartTile.x*S+S/2,this.turnStartTile.y*S+S/2);
    this.cameras.main.startFollow(this.player,true,0.12,0.12);
    this.playerMoves=6;
    this.playerMovesUsed=0;
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
    this.turnIndex++;
    if(this.turnIndex>=this.turnOrder.length) this.turnIndex=0;
    this.time.delayedCall(150,()=>this.startNextTurn());
  }

  doEnemyTurn(enemy){
    if(!enemy.alive){ this.advanceEnemyTurn(); return; }
    this.tweens.add({targets:enemy.img,alpha:0.55,duration:150,yoyo:true});

    const isAdj=()=>Math.abs(enemy.tx-this.playerTile.x)<=1&&Math.abs(enemy.ty-this.playerTile.y)<=1;

    const afterMove=()=>{
      if(isAdj()) this.time.delayedCall(150,()=>this.doEnemyAttack(enemy));
      else this.advanceEnemyTurn();
    };

    if(isAdj()){ this.time.delayedCall(150,()=>this.doEnemyAttack(enemy)); return; }

    const path=bfs(enemy.tx,enemy.ty,this.playerTile.x,this.playerTile.y,wallBlk);
    const steps=Math.min(enemy.spd,Math.max(0,path.length-1));
    if(steps<=0){ afterMove(); return; }

    const mp=[];
    for(let i=0;i<steps;i++){
      const t=path[i];
      if(this.enemies.some(e=>e.alive&&e!==enemy&&e.tx===t.x&&e.ty===t.y)) break;
      if(t.x===this.playerTile.x&&t.y===this.playerTile.y) break;
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

    if(isMiss){
      this.spawnFloat(this.player.x,this.player.y-10,'Blocked!','#7fc8f8');
      this.showStatus(`${enemy.type} missed! (d20:${atkRoll}+${atkMod}=${atkTotal} vs AC${this.pStats.ac})`);
      this.showDicePopup(`d20:${atkRoll}+${atkMod}=${atkTotal} vs AC${this.pStats.ac}`,'Miss!','miss',[{sides:20,value:atkRoll,kind:'d20'}]);
      return;
    }
    const [dc,ds,db]=enemy.atkDice;
    const dr=dnd.rollStr(isCrit?dc*2:dc,ds,db);
    const dmg=Math.max(1,dr.total);
    this.playerHP=Math.max(0,this.playerHP-dmg);
    this.cameras.main.shake(180,0.006);
    this.tweens.add({targets:this.player,alpha:0.3,duration:80,yoyo:true,repeat:2});
    this.spawnFloat(this.player.x,this.player.y-10,`-${dmg}`,'#e74c3c');
    this.showStatus(`${enemy.type}${isCrit?' CRITS':' hits'} for ${dmg}! (${dr.str})`);
    this.updateHUD();
    if(this.playerHP<=0) this.showStatus('You have been defeated...');
    this.showDicePopup(`d20:${atkRoll}+${atkMod}=${atkTotal} vs AC${this.pStats.ac}`,`${enemy.type} deals ${dr.str}`,isCrit?'crit':'hit',[{sides:20,value:atkRoll,kind:'d20'},...dr.rolls.map(r=>({sides:ds,value:r,kind:'dmg'}))]);
  }

  animEnemyMove(enemy,path,onDone){
    if(!path.length){ onDone(); return; }
    const step=path.shift();
    const nx=step.x*S+S/2, ny=step.y*S+S/2;
    const fdx=step.x-enemy.tx, fdy=step.y-enemy.ty;
    if(fdx||fdy) enemy.facing=Math.atan2(fdy,fdx)*180/Math.PI;
    this.tweens.add({targets:enemy.img,x:nx,y:ny,duration:200,ease:'Linear',onComplete:()=>this.animEnemyMove(enemy,path,onDone)});
    this.tweens.add({targets:enemy.hpBg,x:nx,y:step.y*S-4,duration:200});
    this.tweens.add({targets:enemy.hpFg,x:nx,y:step.y*S-4,duration:200});
    this.tweens.add({targets:enemy.lbl,x:nx,y:ny+S*0.52,duration:200});
    this.tweens.add({targets:enemy.sightRing,x:nx,y:ny,duration:200});
    if(enemy.fa){ this.tweens.add({targets:enemy.fa,x:nx,y:ny,duration:200}); enemy.fa.setRotation(enemy.facing*Math.PI/180); }
  }

  // ─────────────────────────────────────────
  // PLAYER ATTACK
  // ─────────────────────────────────────────
  selectAction(action){
    if(!this.isPlayerTurn()) return;
    if(action==='attack'){
      if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }
      this.pendingAction='attack';
      const el=document.getElementById('btn-atk'); if(el) el.classList.add('selected');
      this.clearMoveRange(); this.showAtkRange();
      this.showStatus('Tap a highlighted enemy to attack.');
    } else if(action==='dash'){
      if(this.playerAP<=0){ this.showStatus('Action already used.'); return; }
      this.playerAP=0; this.playerMoves+=6;
      this.pendingAction=null;
      const db=document.getElementById('btn-dash'); if(db){ db.classList.add('used'); db.style.opacity='0.35'; db.style.pointerEvents='none'; }
      const ab=document.getElementById('btn-atk'); if(ab){ ab.classList.add('used'); ab.style.opacity='0.35'; ab.style.pointerEvents='none'; }
      this.updateResBar(); this.clearMoveRange(); this.showMoveRange();
      this.showStatus(`Dashed! ${this.playerMoves} tiles of movement remaining.`);
    }
  }

  clearPendingAction(){
    this.pendingAction=null;
    const el=document.getElementById('btn-atk'); if(el) el.classList.remove('selected');
    this.clearAtkRange();
  }

  playerAttackEnemy(enemy){
    if(!this.isPlayerTurn()||this.playerAP<=0) return;
    const dx=Math.abs(this.playerTile.x-enemy.tx), dy=Math.abs(this.playerTile.y-enemy.ty);
    if(dx>1||dy>1){ this.showStatus('Too far — move closer first.'); return; }
    this.clearPendingAction();
    this.playerAP=0;

    const strMod=dnd.mod(this.pStats.str);
    const atkRoll=dnd.roll(1,20);
    const atkTotal=atkRoll+strMod+this.pStats.profBonus;
    const isCrit=atkRoll===20, isMiss=atkRoll===1;
    const hits=isCrit||(!isMiss&&atkTotal>=enemy.ac);

    const ab=document.getElementById('btn-atk'); if(ab){ ab.classList.add('used'); ab.style.opacity='0.35'; ab.style.pointerEvents='none'; }
    this.updateResBar();

    if(!hits){
      this.diceWaiting='player';
      this._afterPlayerDice=()=>{ this.showStatus(`Missed! ${this.playerMoves>0?this.playerMoves+' moves left.':''} End Turn when done.`); };
      this.tweens.add({targets:enemy.img,x:enemy.img.x+6,duration:60,yoyo:true,repeat:1});
      this.showDicePopup(`d20:${atkRoll}+${strMod+this.pStats.profBonus}=${atkTotal} vs AC${enemy.ac}`,isMiss?'Natural 1 — Critical Miss!':'Miss!','miss',[{sides:20,value:atkRoll,kind:'d20'}]);
      this.showStatus(`Missed ${enemy.type}!`);
      return;
    }

    const[dc,ds,db]=this.pStats.atkDice;
    const dr=dnd.rollStr(isCrit?dc*2:dc,ds,db);
    const dmg=Math.max(1,dr.total);
    enemy.hp-=dmg;

    this.tweens.add({targets:enemy.img,alpha:0.15,duration:80,yoyo:true,repeat:3});
    this.spawnFloat(enemy.tx*S+S/2,enemy.ty*S,isCrit?`💥${dmg}`:`-${dmg}`,'#ffdd57');
    const ratio=Math.max(0,enemy.hp/enemy.maxHp);
    enemy.hpFg.setDisplaySize((S-8)*ratio,5);
    if(ratio<0.4) enemy.hpFg.setFillStyle(0xe67e22);
    if(ratio<0.15) enemy.hpFg.setFillStyle(0xe74c3c);
    this.showStatus(`${isCrit?'CRIT! ':''}Hit ${enemy.type} for ${dmg}!`);

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
      this.showStatus(`${this.playerMoves>0?this.playerMoves+' moves left — ':''} End Turn when done.`);
    };

    this.showDicePopup(`d20:${atkRoll}+${strMod+this.pStats.profBonus}=${atkTotal} vs AC${enemy.ac}`,`Dmg: ${dr.str}`,isCrit?'crit':'hit',[{sides:20,value:atkRoll,kind:'d20'},...dr.rolls.map(r=>({sides:ds,value:r,kind:'dmg'}))]);
  }

  // ─────────────────────────────────────────
  // DICE
  // ─────────────────────────────────────────
  _handleDiceDismiss(){
    const ov=document.getElementById('dice-ov');
    if(ov) ov.classList.remove('show');
    if(this.diceWaiting==='enemy'){
      this.diceWaiting=false; this.advanceEnemyTurn();
    } else if(this.diceWaiting==='player'){
      this.diceWaiting=false;
      if(this._afterPlayerDice){ const cb=this._afterPlayerDice; this._afterPlayerDice=null; cb(); }
    } else {
      this.diceWaiting=false;
    }
  }

  showDicePopup(rollLine,detailLine,type,diceValues){
    const ov=document.getElementById('dice-ov');
    const stage=document.getElementById('dice-stage');
    const rl=document.getElementById('dice-rl');
    const dl=document.getElementById('dice-dl');
    const out=document.getElementById('dice-out');
    stage.innerHTML='';
    rl.className=''; dl.className=''; out.className='';
    rl.textContent=''; dl.textContent=''; out.textContent='';
    clearTimeout(this._diceTimer);
    ov.classList.add('show');

    const dice=diceValues||[{sides:20,value:1,kind:'d20'}];
    dice.forEach((d,i)=>{
      const wrap=document.createElement('div'); wrap.className=`die-wrap ${d.kind} ${type}`;
      const box=document.createElement('div'); box.className='die-box';
      box.style.setProperty('--rx','0deg'); box.style.setProperty('--ry','0deg');
      const fv=[d.value,1,Math.ceil(d.sides/2),Math.ceil(d.sides/4)*3,2,d.sides];
      for(let f=0;f<6;f++){
        const face=document.createElement('div'); face.className=`die-face f${f+1}`;
        if(f===0){ face.style.color=type==='crit'?'#f39c12':type==='miss'?'#e74c3c':'#f0c060'; face.style.fontSize='24px'; }
        else{ face.style.color='rgba(255,255,255,0.25)'; face.style.fontSize='14px'; }
        face.textContent=fv[f]>d.sides?d.sides:fv[f];
        box.appendChild(face);
      }
      wrap.appendChild(box); stage.appendChild(wrap);
      setTimeout(()=>{
        box.classList.add('rolling');
        box.addEventListener('animationend',()=>{ box.classList.remove('rolling'); box.classList.add('landing'); },{once:true});
      },i*120);
    });

    const delay=700+dice.length*120;
    setTimeout(()=>{ rl.textContent=rollLine; rl.classList.add('show'); },delay);
    setTimeout(()=>{ dl.textContent=detailLine; dl.classList.add('show'); },delay+100);
    setTimeout(()=>{ const labels={hit:'HIT!',miss:'MISS',crit:'⭐ CRITICAL!'}; out.textContent=labels[type]||''; out.className='show '+type; },delay+200);
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
      if(MAP[ty][tx]===TILE.WALL) continue;
      if(tx===px&&ty===py) continue;
      if(this.enemies.some(e=>e.alive&&e.tx===tx&&e.ty===ty)) continue;
      const moveBlk=(x,y)=>MAP[y][x]===TILE.WALL||this.enemies.some(e=>e.alive&&e.tx===x&&e.ty===y);
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
      if(MAP[ty][tx]===TILE.WALL) continue;
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
    if(this.mode!==MODE.EXPLORE) return;
    for(const e of this.enemies){
      if(!e.alive||e.inCombat) continue;
      const ex=e.tx*S+S/2, ey=e.ty*S+S/2;
      const rad=e.facing*Math.PI/180, hfov=(e.fov/2)*Math.PI/180, len=e.sight*S+S/2;
      const g=this.add.graphics().setDepth(2);
      const r=e.sight;
      for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
        const tx=e.tx+dx, ty=e.ty+dy;
        if(tx<0||ty<0||tx>=COLS||ty>=ROWS) continue;
        if(MAP[ty][tx]===TILE.WALL) continue;
        if(Math.sqrt(dx*dx+dy*dy)>r+0.5) continue;
        if(!inFOV(e,tx,ty)) continue;
        if(!hasLOS(e.tx,e.ty,tx,ty)) continue;
        const fade=1-(Math.sqrt(dx*dx+dy*dy)/r)*0.75;
        g.fillStyle(0xffe8a0,fade*0.13); g.fillRect(tx*S,ty*S,S,S);
      }
      const pts=[{x:ex,y:ey}]; const steps=16;
      for(let i=0;i<=steps;i++){ const a=rad-hfov+(i/steps)*hfov*2; pts.push({x:ex+Math.cos(a)*len,y:ey+Math.sin(a)*len}); }
      g.fillStyle(0xffe8a0,0.06); g.beginPath(); g.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) g.lineTo(pts[i].x,pts[i].y); g.closePath(); g.fillPath();
      g.lineStyle(1,0xffe8a0,0.3); g.lineBetween(ex,ey,pts[1].x,pts[1].y); g.lineBetween(ex,ey,pts[pts.length-1].x,pts[pts.length-1].y);
      g.lineStyle(1,0xffe8a0,0.5); g.lineBetween(ex,ey,ex+Math.cos(rad)*len*0.9,ey+Math.sin(rad)*len*0.9);
      this.sightTiles.push(g);
    }
  }
  clearSightOverlays(){ this.sightTiles.forEach(t=>t.destroy()); this.sightTiles=[]; }

  checkSight(){
    if(this.mode!==MODE.EXPLORE) return;
    const spotted=this.enemies.filter(e=>{
      if(!e.alive||e.inCombat) return false;
      const dist=Math.sqrt((e.tx-this.playerTile.x)**2+(e.ty-this.playerTile.y)**2);
      if(dist>e.sight) return false;
      return hasLOS(e.tx,e.ty,this.playerTile.x,this.playerTile.y);
    });
    if(spotted.length) this.enterCombat(spotted);
  }

  // ─────────────────────────────────────────
  // MOVEMENT
  // ─────────────────────────────────────────
  setDestination(tx,ty,onArrival){
    if(this.enemies.some(e=>e.alive&&e.tx===tx&&e.ty===ty)) return;
    const blk=(x,y)=>MAP[y][x]===TILE.WALL||this.enemies.some(e=>e.alive&&e.tx===x&&e.ty===y);
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
    this.playerTile={x:next.x,y:next.y};
    this.tweens.add({
      targets:this.player, x:next.x*S+S/2, y:next.y*S+S/2, duration:110, ease:'Linear',
      onComplete:()=>{
        this.lastCompletedTile={x:next.x,y:next.y};
        if(this.mode===MODE.COMBAT&&!this.onArrival){
          this.isMoving=false; this.movePath=[]; this.clearPathDots();
          return;
        }
        if(this.mode===MODE.EXPLORE) this.checkSight();
        this.advancePath();
      }
    });
    this.updateHUD();
  }

  // ─────────────────────────────────────────
  // WANDERING
  // ─────────────────────────────────────────
  wanderEnemies(){
    if(this.mode!==MODE.EXPLORE) return;
    const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
    for(const e of this.enemies){
      if(!e.alive||e.inCombat) continue;
      if(Math.random()>0.6) continue;
      const shuffled=dirs.slice().sort(()=>Math.random()-0.5);
      for(const d of shuffled){
        const nx=e.tx+d.x, ny=e.ty+d.y;
        if(nx<0||ny<0||nx>=COLS||ny>=ROWS) continue;
        if(MAP[ny][nx]===TILE.WALL) continue;
        if(this.enemies.some(o=>o!==e&&o.alive&&o.tx===nx&&o.ty===ny)) continue;
        if(nx===this.playerTile.x&&ny===this.playerTile.y) continue;
        e.tx=nx; e.ty=ny;
        e.facing=Math.atan2(d.y,d.x)*180/Math.PI;
        const wx=nx*S+S/2, wy=ny*S+S/2;
        this.tweens.add({targets:e.img,x:wx,y:wy,duration:350});
        this.tweens.add({targets:e.hpBg,x:wx,y:ny*S-4,duration:350});
        this.tweens.add({targets:e.hpFg,x:wx,y:ny*S-4,duration:350});
        this.tweens.add({targets:e.lbl,x:wx,y:wy+18,duration:350});
        this.tweens.add({targets:e.sightRing,x:wx,y:wy,duration:350});
        if(e.fa){ e.fa.setPosition(wx,wy); e.fa.setRotation(e.facing*Math.PI/180); }
        break;
      }
    }
    this.time.delayedCall(400,()=>this.drawSightOverlays());
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
    const p=document.getElementById('asi-panel'); if(p) p.style.display='flex';
    const t=document.getElementById('asi-title'); if(t) t.textContent=`Level ${this.pStats.level} — Ability Score Improvement`;
  }

  applyASI(s1,s2){
    const p=this.pStats; if(p.asiPending<=0) return;
    p[s1]=Math.min(20,p[s1]+1); p[s2]=Math.min(20,p[s2]+1); p.asiPending--;
    p.atkDice[2]=dnd.mod(p.str);
    const panel=document.getElementById('asi-panel'); if(panel) panel.style.display='none';
    this.spawnFloat(this.player.x,this.player.y-40,`${s1.toUpperCase()}+1 ${s2.toUpperCase()}+1`,'#2ecc71');
    this.updateStatsPanel();
  }

  // ─────────────────────────────────────────
  // HUD / UI
  // ─────────────────────────────────────────
  updateResBar(){
    const mv=document.getElementById('mv-val'), ac=document.getElementById('ac-val');
    if(mv){ mv.textContent=this.playerMoves||0; mv.className='res-val '+(this.playerMoves>0?'ok':'spent'); }
    if(ac){ ac.textContent=this.playerAP>0?'ACTION':'USED'; ac.className='res-val '+(this.playerAP>0?'aok':'aused'); }
  }

  buildInitBar(){
    const bar=document.getElementById('init-bar'); bar.innerHTML=''; bar.classList.add('show');
    this.turnOrder.forEach((t,i)=>{
      if(t.id==='enemy'&&(!t.enemy||!t.enemy.alive)) return;
      const div=document.createElement('div');
      div.className='ip '+(t.id==='player'?'pp':'ep');
      if(i===this.turnIndex) div.classList.add('active');
      div.innerHTML=`<div class="ip-icon">${t.id==='player'?'🧝':t.enemy.icon}</div><div style="font-size:7px">${t.id==='player'?'YOU':t.enemy.type.slice(0,3).toUpperCase()}</div>`;
      bar.appendChild(div);
    });
  }

  flashBanner(text,type){
    const b=document.getElementById('mode-banner'), t=document.getElementById('mode-banner-text');
    t.textContent=text; b.className='show '+type;
    this.time.delayedCall(1200,()=>b.className='');
  }

  spawnFloat(x,y,text,color){
    const t=this.add.text(x,y,text,{fontSize:'15px',fill:color,stroke:'#000',strokeThickness:3,fontStyle:'bold'}).setOrigin(0.5).setDepth(30);
    this.tweens.add({targets:t,y:y-44,alpha:0,duration:900,ease:'Power2',onComplete:()=>t.destroy()});
  }

  showStatus(msg){ document.getElementById('status-bar').textContent=msg; }

  updateHUD(){
    document.getElementById('pos-text').textContent=`${this.playerTile.x},${this.playerTile.y}`;
    document.getElementById('hp-bar').style.width=(this.playerHP/this.playerMaxHP*100)+'%';
    document.getElementById('hp-text').textContent=`${this.playerHP}/${this.playerMaxHP}`;
  }

  updateStatsPanel(){
    const p=this.pStats, panel=document.getElementById('stats-panel'); if(!panel) return;
    const m=s=>(dnd.mod(s)>=0?'+':'')+dnd.mod(s);
    const xn=DND_XP[Math.min(p.level,19)], xp=DND_XP[Math.max(p.level-1,0)];
    const xpct=p.level>=20?100:Math.floor((p.xp-xp)/(xn-xp)*100);
    panel.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="color:#c9a84c;letter-spacing:3px;font-size:11px">CHARACTER</div>
      <div style="color:#555;font-size:9px;cursor:pointer" onclick="toggleStats()">✕</div>
    </div>
    <div style="background:rgba(41,128,185,0.15);border:1px solid rgba(41,128,185,0.3);border-radius:4px;padding:8px;margin-bottom:10px;text-align:center">
      <div style="color:#f0c060;font-size:13px;letter-spacing:2px">${p.name}</div>
      <div style="color:#7fc8f8;font-size:11px;margin-top:2px">${p.class} · Level ${p.level}</div>
      <div style="color:#aaa;font-size:10px;margin-top:1px">HP ${this.playerHP}/${this.playerMaxHP} · AC ${p.ac} · Prof +${p.profBonus}</div>
    </div>
    <div class="ss">EXPERIENCE</div>
    <div class="sr"><span class="sn">XP</span><span class="sv">${p.xp.toLocaleString()} / ${p.level<20?xn.toLocaleString():'MAX'}</span></div>
    <div class="xw"><div class="xb" style="width:${xpct}%"></div></div>
    ${p.level<20?`<div style="color:#555;font-size:9px;margin-top:2px;text-align:right">${(xn-p.xp).toLocaleString()} XP to Lv${p.level+1}</div>`:''}
    <div class="ss" style="margin-top:10px">ABILITY SCORES</div>
    ${['str','dex','con','int','wis','cha'].map(s=>`
    <div class="sr"><span class="sn">${s.toUpperCase()}</span><span class="sv">${p[s]}</span><span class="sm">${m(p[s])}</span>
    <span style="color:#555;font-size:9px">save${p.savingThrows.has(s)?` (+${dnd.mod(p[s])+p.profBonus})`:`(${m(p[s])})`}</span></div>`).join('')}
    <div class="ss" style="margin-top:10px">COMBAT</div>
    <div class="sr"><span class="sn">AC</span><span class="sv">${p.ac}</span></div>
    <div class="sr"><span class="sn">Attack</span><span class="sv">d20+${dnd.mod(p.str)+p.profBonus} / ${p.atkDice[0]}d${p.atkDice[1]}${p.atkDice[2]>=0?'+':''}${p.atkDice[2]}</span></div>
    <div class="sr"><span class="sn">Speed</span><span class="sv">6 tiles (30ft)</span></div>
    <div class="sr"><span class="sn">Initiative</span><span class="sv">${m(p.dex)}</span></div>
    <div class="ss" style="margin-top:10px">CLASS FEATURES</div>
    ${p.features.map(f=>`<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:10px;color:#bbb">⚔ ${f}</div>`).join('')}
    <div style="margin-top:12px;color:#555;font-size:9px;text-align:center">DnD 5e · Fighter</div>`;
    this.updateHUD();
  }

  // ─────────────────────────────────────────
  // UPDATE LOOP
  // ─────────────────────────────────────────
  update(time,delta){
    if(this.mode===MODE.EXPLORE){
      if(!this.isMoving){
        this.keyDelay-=delta;
        if(this.keyDelay<=0){
          let dx=0, dy=0;
          if(this.cursors.left.isDown||this.wasd.left.isDown) dx=-1;
          if(this.cursors.right.isDown||this.wasd.right.isDown) dx=1;
          if(this.cursors.up.isDown||this.wasd.up.isDown) dy=-1;
          if(this.cursors.down.isDown||this.wasd.down.isDown) dy=1;
          if(dx||dy){
            const nx=this.playerTile.x+dx, ny=this.playerTile.y+dy;
            if(nx>=0&&ny>=0&&nx<COLS&&ny<ROWS&&MAP[ny][nx]!==TILE.WALL){
              this.movePath=[{x:nx,y:ny}]; this.isMoving=true; this.advancePath(); this.keyDelay=140;
            }
          }
        }
      }
    }
  }
}
