// ═══════════════════════════════════════════════════════
// movement-system.js — Movement & wandering mixin for GameScene
// Extracted from game.js — pathfinding, path animation,
// enemy wandering, move cancellation
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  cancelCurrentMove(){
    if(!this.isMoving) return false;
    this.tweens.killTweensOf(this.player);
    const snap=snapToTile(this.player.x,this.player.y);
    this.playerTile={x:snap.x,y:snap.y};
    this.lastCompletedTile={x:snap.x,y:snap.y};
    this.player.setPosition(snap.x*S+S/2,snap.y*S+S/2);
    this.movePath=[];
    this.isMoving=false;
    this._movingToAttack=false;
    this.clearPathDots();
    this.onArrival=null;
    this.playActorIdle(this.player,'player');
    this.updateHUD();
    if(this.mode===MODE.COMBAT&&this.isPlayerTurn()&&this.playerMoves>0) this.showMoveRange();
    this.showStatus('Movement canceled.');
    return true;
  },

  // ─────────────────────────────────────────
  // MOVEMENT
  // ─────────────────────────────────────────
  setDestination(tx,ty,onArrival){
    // Hidden movement: allowed (BG3-style). checkSight per step handles contests.
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
  },
  clearPathDots(){ this.pathDots.forEach(d=>d.destroy()); this.pathDots=[]; },

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

    // Re-check: enemy may have wandered onto this tile since path was computed
    if(this.enemies.some(e=>e.alive&&e.tx===next.x&&e.ty===next.y)){
      this.isMoving=false; this.movePath=[]; this.clearPathDots();
      return;
    }

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
    // Slower move when sneaking (BG3-style)
    const moveDur = this.playerHidden ? 170 : 110;
    this.tweens.add({
      targets:this.player, x:next.x*S+S/2, y:next.y*S+S/2, duration:moveDur, ease:'Linear',
      onComplete:()=>{
        if(this.isDoorTile(prev.x,prev.y)){
          const d=this.getDoorState(prev.x,prev.y);
          if(d.auto&&d.open) this.setDoorOpen(prev.x,prev.y,false,true);
        }
        this.lastCompletedTile={x:next.x,y:next.y};
        try{ if(typeof EventRunner!=='undefined') EventRunner.onPlayerTile(next.x,next.y); }catch(_e){ console.warn('[EventRunner] tile trigger error:',_e); }
        // Stairs — transition to next floor
        const _tileVal = MAP[next.y]?.[next.x];
        if(_tileVal === TILE.STAIRS) console.log(`[STAIRS] Stepped on stairs at (${next.x},${next.y}) tileVal=${_tileVal} TILE.STAIRS=${TILE.STAIRS} nextStage=${window._MAP_META?.nextStage}`);
        if(_tileVal === TILE.STAIRS){
          const nextStage=window._MAP_META?.nextStage;
          if(nextStage){
            this.isMoving=false; this.movePath=[]; this.clearPathDots();
            this.showStatus('Descending to the next floor...');
            this.time.delayedCall(300,()=>ModLoader.transitionToStage(nextStage,this));
            return;
          } else {
            this.showStatus('These stairs are not linked yet (nextStage is missing for this floor).');
          }
        }
        if(this.mode===MODE.COMBAT&&!this.onArrival){
          this.isMoving=false; this.movePath=[]; this.clearPathDots(); this._movingToAttack=false;
          return;
        }
        const wasExplore=this.isExploreMode();
        if(wasExplore&&!this._suppressExploreSightChecks) this.checkSight();
        // Stop path only if combat was just entered from explore (stealth broken / enemy spotted)
        if(wasExplore&&this.mode===MODE.COMBAT){ this.isMoving=false; this.movePath=[]; this.clearPathDots(); this._movingToAttack=false; return; }
        if(!this.movePath.length) this.playActorIdle(this.player,'player');
        this.advancePath();
      }
    });
    this.updateHUD();
  },

  // ─────────────────────────────────────────
  // WANDERING
  // ─────────────────────────────────────────
  wanderEnemies(forceStep=false){
    if(this.mode!==MODE.EXPLORE&&this.mode!==MODE.EXPLORE_TB) return;
    if(this._engageInProgress&&!forceStep) return;
    const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1},{x:1,y:1}];
    for(const e of this.enemies){
      if(!e.alive||e.inCombat) continue;
      const hasPatrol=!forceStep&&Array.isArray(e.ai?.patrolPath)&&e.ai.patrolPath.length>0;
      if(!forceStep&&!hasPatrol&&Math.random()>0.6) continue;
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
      } else if(hasPatrol){
        // Advance patrol index when standing on the current waypoint
        if(e._patrolIdx===undefined) e._patrolIdx=0;
        const wp=e.ai.patrolPath[e._patrolIdx];
        if(e.tx===wp.x&&e.ty===wp.y){
          e._patrolIdx=(e._patrolIdx+1)%e.ai.patrolPath.length;
        }
        // BFS one step toward the next waypoint
        const tgt=e.ai.patrolPath[e._patrolIdx];
        const block=(x,y)=>this.isWallTile(x,y)||(this.isDoorTile(x,y)&&this.isDoorClosed(x,y))||
          this.enemies.some(o=>o!==e&&o.alive&&o.tx===x&&o.ty===y);
        const path=bfs(e.tx,e.ty,tgt.x,tgt.y,block);
        if(path.length) chosenDir={x:path[0].x-e.tx,y:path[0].y-e.ty};
      }

      const shuffled=dirs.slice().sort(()=>Math.random()-0.5);
      const candidateDirs=chosenDir?[chosenDir,...shuffled.filter(d=>!(d.x===chosenDir.x&&d.y===chosenDir.y))]:shuffled;
      for(const d of candidateDirs){
        const nx=e.tx+d.x, ny=e.ty+d.y;
        if(nx<0||ny<0||nx>=COLS||ny>=ROWS) continue;
        if(this.isWallTile(nx,ny)) continue;
        // [BUG-5 fix] Enemies respect closed doors while wandering
        if(this.isDoorTile(nx,ny)&&this.isDoorClosed(nx,ny)) continue;
        // Diagonal: skip corner cuts
        if(d.x!==0&&d.y!==0){
          const hBlk=this.isWallTile(nx,e.ty)||(this.isDoorTile(nx,e.ty)&&this.isDoorClosed(nx,e.ty));
          const vBlk=this.isWallTile(e.tx,ny)||(this.isDoorTile(e.tx,ny)&&this.isDoorClosed(e.tx,ny));
          if(hBlk&&vBlk) continue;
        }
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
  },

});
