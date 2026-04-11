// ═══════════════════════════════════════════════════════
// combat-ai.js — Enemy AI turn logic for combat mode
// Extracted from mode-combat.js (Phase -1.8)
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  advanceEnemyTurn(){
    this.diceWaiting=false; this._afterPlayerDice=null;

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
  },

  doEnemyTurn(enemy){
    if(!enemy.alive){ this.advanceEnemyTurn(); return; }
    this.tweens.add({targets:enemy.img,alpha:0.55,duration:150,yoyo:true});

    if(this.playerHidden && enemy.searchTurnsRemaining > 0) {
      enemy.searchTurnsRemaining--;
      if(enemy.searchTurnsRemaining === 0) {
        this.showStatus(`${enemy.displayName} gives up searching.`);
        const anySearching = this.combatGroup.some(e => e.alive && e.searchTurnsRemaining > 0);
        if(!anySearching && this._shadowPlayer) {
          this._shadowPlayer.destroy();
          this._shadowPlayer = null;
          this.showStatus('Shadow fades away as search is abandoned.');
        }
      }
    }

    let targetTile = this.playerTile;
    if (this.playerHidden && enemy.searchTurnsRemaining > 0) {
      targetTile = enemy.lastSeenPlayerTile;
    } else if (this.playerHidden && enemy.searchTurnsRemaining <= 0) {
      this.endEnemyTurn(enemy);
      return;
    } else if (!this.playerHidden) {
      enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
      enemy.searchTurnsRemaining = 0;
    }

    const isAdj=()=>tileDist(enemy.tx,enemy.ty,targetTile.x,targetTile.y)<=1.01;

    const afterMove=()=>{
      if(this.playerHidden){ this.endEnemyTurn(enemy); return; }
      if(isAdj()) this.time.delayedCall(150,()=>this.doEnemyAttack(enemy));
      else this.endEnemyTurn(enemy);
    };

    if(!this.playerHidden && isAdj()){ this.time.delayedCall(150,()=>this.doEnemyAttack(enemy)); return; }

    const blockFn = this.playerHidden ? wallBlk : (x,y) => wallBlk(x,y);
    const path=bfs(enemy.tx,enemy.ty,targetTile.x,targetTile.y,blockFn);
    const enemyBudget=Math.max(1,Math.floor(enemy.spd*Number(COMBAT_RULES.enemySpeedScale||1)));
    // Consume path steps within Euclidean tile-distance budget
    let budget=enemyBudget;
    const mp=[];
    let prev={x:enemy.tx,y:enemy.ty};
    for(let i=0;i<Math.max(0,path.length-1);i++){
      const t=path[i];
      const sc=tileDist(prev.x,prev.y,t.x,t.y);
      if(budget<sc-0.001) break;
      if(this.enemies.some(e=>e.alive&&e!==enemy&&e.tx===t.x&&e.ty===t.y)) break;
      if(!this.playerHidden&&t.x===this.playerTile.x&&t.y===this.playerTile.y) break;
      budget-=sc;
      mp.push(t);
      prev=t;
    }
    if(!mp.length){ afterMove(); return; }

    const dest=mp[mp.length-1];
    this.animEnemyMove(enemy,mp.slice(),()=>{ enemy.tx=dest.x; enemy.ty=dest.y; afterMove(); });
  },

  doEnemyAttack(enemy){
    const atkMod=dnd.mod(enemy.stats.str);
    const atkRoll=dnd.roll(1,20);
    const atkTotal=atkRoll+atkMod;
    const isCrit=atkRoll===20;
    const isMiss=atkRoll===1||(!isCrit&&atkTotal<this.pStats.ac);
    const rollLine=this.formatRollLine(atkRoll,atkMod,atkTotal,this.pStats.ac);
    this._pendingEnemyTurnActor=enemy;

    if(isMiss){
      this.spawnFloat(this.player.x,this.player.y-10,atkRoll===1?'NAT 1!':'MISS','#7fc8f8');
      this.showStatus(`${enemy.displayName} missed! ${rollLine}`);
      CombatLog.logRoll({actor:enemy.displayName,target:'You',result:atkRoll===1?'crit':'miss',rollDetail:rollLine});
      // Nat 1 → dramatic dice overlay; normal miss → just log
      if(atkRoll===1){
        this.diceWaiting='enemy';
        this.showDicePopup(rollLine,'Rolled a 1 — the worst possible roll. The attack fumbles automatically, no matter how tough you are.','miss',[{sides:20,value:atkRoll,kind:'d20'}]);
      } else {
        this._finishEnemyTurn(enemy);
      }
      return;
    }
    const dr=dnd.rollDamageSpec(enemy.damageFormula,isCrit);
    const dmg=Math.max(1,dr.total);
    this.playerHP=Math.max(0,this.playerHP-dmg);
    this.cameras.main.shake(180,0.006);
    this.tweens.add({targets:this.player,alpha:0.3,duration:80,yoyo:true,repeat:2});
    this.spawnFloat(this.player.x,this.player.y-10,isCrit?`💥${dmg}`:`-${dmg}`,'#e74c3c');
    const dmgText=this.formatDamageBreakdown(dr);
    this.showStatus(`${enemy.displayName}${isCrit?' CRITS':' hits'} for ${dmg}! ${dmgText}`);
    const eWpn=enemy.weaponId?WEAPON_DEFS[enemy.weaponId]:null;
    const eDmgType=eWpn?eWpn.damageType:'';
    CombatLog.logRoll({actor:enemy.displayName,target:'You',result:isCrit?'crit':'hit',damage:dmg,rollDetail:rollLine,dmgDetail:`${dmgText}${eDmgType?' '+eDmgType:''}`});
    this.updateHUD();
    if(this.playerHP<=0){ this.showStatus('You have been defeated...'); CombatLog.log('You have been defeated...','enemy','combat'); }
    // Crit → dramatic dice overlay; normal hit → just log
    if(isCrit){
      this.diceWaiting='enemy';
      const enemyDetail=`Rolled a 20 — the best possible roll. ${enemy.displayName} lands a perfect strike and deals double damage! ${dmgText}`;
      this.showDicePopup(rollLine,enemyDetail,'crit',[{sides:20,value:atkRoll,kind:'d20'},...dr.diceValues]);
    } else {
      this._finishEnemyTurn(enemy);
    }
  },

  animEnemyMove(enemy,path,onDone,_prevTx,_prevTy){
    if(!path.length){ onDone(); return; }
    const step=path.shift();
    const nx=step.x*S+S/2, ny=step.y*S+S/2;
    const fromX=_prevTx!==undefined?_prevTx:enemy.tx;
    const fromY=_prevTy!==undefined?_prevTy:enemy.ty;
    const fdx=step.x-fromX, fdy=step.y-fromY;
    if(fdx||fdy) enemy.facing=Math.atan2(fdy,fdx)*180/Math.PI;
    // Distance-based duration (constant speed)
    const dx=nx-enemy.img.x, dy=ny-enemy.img.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const dur=Math.max(40,(dist/MOVE_SPEED)*1000);
    this.playActorMove(enemy.img,enemy.type,enemy.spd>=2);
    this.tweens.add({targets:enemy.img,x:nx,y:ny,duration:dur,ease:'Linear',onComplete:()=>this.animEnemyMove(enemy,path,onDone,step.x,step.y)});
    this.tweens.add({targets:enemy.hpBg,x:nx,y:step.y*S-4,duration:dur});
    this.tweens.add({targets:enemy.hpFg,x:nx,y:step.y*S-4,duration:dur});
    this.tweens.add({targets:enemy.lbl,x:nx,y:ny+S*0.52,duration:dur});
    this.tweens.add({targets:enemy.sightRing,x:nx,y:ny,duration:dur});
    if(enemy.fa){ this.tweens.add({targets:enemy.fa,x:nx,y:ny,duration:dur}); enemy.fa.setRotation(enemy.facing*Math.PI/180); }
    if(!path.length) this.time.delayedCall(dur+10,()=>this.playActorIdle(enemy.img,enemy.type));
  },

  /** Finish enemy turn without dice overlay (normal hit/miss) */
  _finishEnemyTurn(enemy){
    if(this._pendingEnemyTurnActor){
      this.processStatusEffectsForActor(this._pendingEnemyTurnActor,'turn_end');
      this._pendingEnemyTurnActor=null;
    }
    this.time.delayedCall(400,()=>this.advanceEnemyTurn());
  },

});
