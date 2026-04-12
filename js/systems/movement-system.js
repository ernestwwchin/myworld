// ═══════════════════════════════════════════════════════
// movement-system.js — Movement & wandering mixin for GameScene
// Extracted from game.js — pathfinding, path animation,
// enemy wandering, move cancellation
// Phase 2: constant-speed movement (distance-based tween duration)
// ═══════════════════════════════════════════════════════

/** Movement speed constants (px/sec) */
const MOVE_SPEED     = 440;  // normal explore/combat
const MOVE_SPEED_SNK = 280;  // while sneaking (playerHidden)

Object.assign(GameScene.prototype, {

  cancelCurrentMove(){
    if(!this.isMoving) return false;
    this.tweens.killTweensOf(this.player);
    // Stop at current world position, derive tile from it
    const cur = worldToTile(this.player.x, this.player.y);
    this.playerTile = { x: cur.x, y: cur.y };
    this.lastCompletedTile = { x: cur.x, y: cur.y };
    // Don't snap sprite — stay at current world position
    this.movePath=[];
    this.isMoving=false;
    this._movingToAttack=false;
    this.clearPathDots();
    this.onArrival=null;
    this.playActorIdle(this.player,'player');
    this.updateHUD();
    if(this.mode===MODE.COMBAT&&this.isPlayerTurn()&&this.playerMoves>0) this.showMoveRange();
    // Don't show cancel message — caller handles context (redirect, etc.)
    return true;
  },

  // ─────────────────────────────────────────
  // MOVEMENT
  // ─────────────────────────────────────────
  setDestination(tx,ty,onArrival,finalPos){
    // finalPos = {wx,wy} — exact world position for the last step (free movement)
    // Hidden movement: allowed (BG3-style). checkSight per step handles contests.
    if(this.enemies.some(e=>e.alive&&e.tx===tx&&e.ty===ty)) return;
    // Re-follow player if camera was panned away
    if(this._ensureCamFollow) this._ensureCamFollow();
    const blk=(x,y)=>this.isBlockedTile(x,y);
    let path=bfs(this.playerTile.x,this.playerTile.y,tx,ty,blk);
    if(!path.length) return;
    // String-pull: smooth out zigzag into straight-line segments
    if(path.length>2) path=stringPull(path,this.playerTile);
    this.tweens.killTweensOf(this.player);
    this.movePath=path; this.isMoving=true; this.onArrival=onArrival||null;
    this._finalWorldPos=finalPos||null;
    // Show tap indicator at exact click position (or tile center as fallback)
    const tapX = this._finalWorldPos ? this._finalWorldPos.wx : tx * S + S / 2;
    const tapY = this._finalWorldPos ? this._finalWorldPos.wy : ty * S + S / 2;
    this.tapInd.setPosition(tapX, tapY);
    this.tweens.add({targets:this.tapInd,alpha:{from:0.9,to:0},duration:500});
    this.clearPathDots();
    // BG3-style path line: smooth line from player → waypoints → destination
    this._drawPathLine(path, finalPos);
    this.advancePath();
  },

  _drawPathLine(path, finalPos){
    if (this._pathLineGfx) { this._pathLineGfx.destroy(); this._pathLineGfx = null; }
    if (!path.length) return;
    const g = this.add.graphics().setDepth(7);
    // Dashed golden line
    const color = 0xd4a857;
    const points = [{ x: this.player.x, y: this.player.y }];
    for (let i = 0; i < path.length - 1; i++) {
      points.push({ x: path[i].x * S + S / 2, y: path[i].y * S + S / 2 });
    }
    // Last point: exact click position or tile center
    const last = path[path.length - 1];
    if (finalPos) {
      const tl = last.x * S + 4, tr = last.x * S + S - 4;
      const tt = last.y * S + 4, tb = last.y * S + S - 4;
      points.push({
        x: Math.max(tl, Math.min(tr, finalPos.wx)),
        y: Math.max(tt, Math.min(tb, finalPos.wy))
      });
    } else {
      points.push({ x: last.x * S + S / 2, y: last.y * S + S / 2 });
    }
    // Draw dashed line segments
    const dashLen = 8, gapLen = 6;
    g.lineStyle(2.5, color, 0.7);
    for (let i = 0; i < points.length - 1; i++) {
      const ax = points[i].x, ay = points[i].y;
      const bx = points[i + 1].x, by = points[i + 1].y;
      const dx = bx - ax, dy = by - ay;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen < 1) continue;
      const ux = dx / segLen, uy = dy / segLen;
      let d = 0;
      while (d < segLen) {
        const end = Math.min(d + dashLen, segLen);
        g.lineBetween(ax + ux * d, ay + uy * d, ax + ux * end, ay + uy * end);
        d = end + gapLen;
      }
    }
    // Small circle at destination
    const dest = points[points.length - 1];
    g.fillStyle(color, 0.8);
    g.fillCircle(dest.x, dest.y, 4);
    g.lineStyle(1.5, color, 0.5);
    g.strokeCircle(dest.x, dest.y, 8);
    this._pathLineGfx = g;
    this.pathDots.push(g); // reuse pathDots array for cleanup
  },

  clearPathDots(){
    this.pathDots.forEach(d=>d.destroy());
    this.pathDots=[];
    if (this._pathLineGfx) { this._pathLineGfx.destroy(); this._pathLineGfx = null; }
  },

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
    // Distance-based tween duration (constant px/sec)
    // If this is the last step and we have a final world position, use it
    const isLastStep = this.movePath.length === 0;
    let wx, wy;
    if (isLastStep && this._finalWorldPos) {
      // Clamp to destination tile with 4px margin
      const tl = next.x * S + 4, tr = next.x * S + S - 4;
      const tt = next.y * S + 4, tb = next.y * S + S - 4;
      wx = Math.max(tl, Math.min(tr, this._finalWorldPos.wx));
      wy = Math.max(tt, Math.min(tb, this._finalWorldPos.wy));
      this._finalWorldPos = null;
    } else {
      wx = next.x * S + S / 2;
      wy = next.y * S + S / 2;
    }
    const dx = wx - this.player.x, dy = wy - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = this.playerHidden ? MOVE_SPEED_SNK : MOVE_SPEED;
    const moveDur = Math.max(40, (dist / speed) * 1000);
    // Keep turn highlight following player during combat movement
    const tweenTargets = [this.player];
    if (this.mode === MODE.COMBAT && this.turnHL && this.turnHL.alpha > 0) {
      tweenTargets.push(this.turnHL);
    }
    this.tweens.add({
      targets:tweenTargets, x:wx, y:wy, duration:moveDur, ease:'Linear',
      onComplete:()=>{
        if(this.isDoorTile(prev.x,prev.y)){
          const d=this.getDoorState(prev.x,prev.y);
          if(d.auto&&d.open) this.setDoorOpen(prev.x,prev.y,false,true);
        }
        this.lastCompletedTile={x:next.x,y:next.y};
        try{ if(typeof EventRunner!=='undefined') EventRunner.onPlayerTile(next.x,next.y); }catch(_e){ console.warn('[EventRunner] tile trigger error:',_e); }
        // Auto-pickup floor items
        if(typeof this.checkFloorItemPickup==='function') this.checkFloorItemPickup();
        // Stairs — transition to next floor
        const _tileVal = MAP[next.y]?.[next.x];
        if(_tileVal === TILE.STAIRS){
          const nextStageToken=window._MAP_META?.nextStage;
          const nextStage=(typeof ModLoader!=='undefined'&&typeof ModLoader.resolveNextStage==='function')
            ? ModLoader.resolveNextStage(nextStageToken,this)
            : nextStageToken;
          if(nextStage){
            this.isMoving=false; this.movePath=[]; this.clearPathDots();
            const townStage=(typeof ModLoader!=='undefined'&&typeof ModLoader.resolveNextStage==='function')
              ? ModLoader.resolveNextStage('town',this)
              : 'town_hub';
            const extractToTown=String(nextStageToken||'').toLowerCase()==='town'&&nextStage===townStage;
            this.showStatus(extractToTown?'Extracting to town...':'Descending to the next floor...');
            this.time.delayedCall(300,()=>{
              if(extractToTown&&typeof ModLoader.resolveRunOutcome==='function'){
                ModLoader.resolveRunOutcome(this,'extract');
                return;
              }
              ModLoader.transitionToStage(nextStage,this);
            });
            return;
          } else {
            this.showStatus('These stairs are not linked yet (nextStage resolution failed for this floor).');
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
        if(!this.movePath.length && !this._holdMoveActive) this.playActorIdle(this.player,'player');
        this.advancePath();
      }
    });
    this.updateHUD();
  },

  // ─────────────────────────────────────────
  // WANDERING
  // ─────────────────────────────────────────
  wanderEnemies(forceStep=false){
    if(this.mode!==MODE.EXPLORE) return;
    if(this._engageInProgress&&!forceStep) return;
    const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1},{x:1,y:1}];
    for(const e of this.enemies){
      if(!e.alive||e.inCombat) continue;
      const hasPatrol=!forceStep&&Array.isArray(e.ai?.patrolPath)&&e.ai.patrolPath.length>0;
      if(!forceStep&&!hasPatrol&&Math.random()>0.6) continue;
      let chosenDir=null;

      if(forceStep){
        const block=(x,y)=>this.isBlockedTile(x,y,{doorMode:'closed',excludeEnemy:e});
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
        const block=(x,y)=>this.isBlockedTile(x,y,{doorMode:'closed',excludeEnemy:e});
        const path=bfs(e.tx,e.ty,tgt.x,tgt.y,block);
        if(path.length) chosenDir={x:path[0].x-e.tx,y:path[0].y-e.ty};
      }

      const shuffled=dirs.slice().sort(()=>Math.random()-0.5);
      const candidateDirs=chosenDir?[chosenDir,...shuffled.filter(d=>!(d.x===chosenDir.x&&d.y===chosenDir.y))]:shuffled;
      for(const d of candidateDirs){
        const nx=e.tx+d.x, ny=e.ty+d.y;
        if(nx<0||ny<0||nx>=COLS||ny>=ROWS) continue;
        if(this.isBlockedTile(nx,ny,{doorMode:'closed',excludeEnemy:e})) continue;
        if(d.x!==0&&d.y!==0&&!this.canMoveDiagonal(e.tx,e.ty,nx,ny)) continue;
        if(nx===this.playerTile.x&&ny===this.playerTile.y) continue;
        e.tx=nx; e.ty=ny;
        e.facing=Math.atan2(d.y,d.x)*180/Math.PI;
        const wx=nx*S+S/2, wy=ny*S+S/2;
        const edx=wx-e.img.x, edy=wy-e.img.y;
        const eDist=Math.sqrt(edx*edx+edy*edy);
        const eDur=Math.max(80,(eDist/MOVE_SPEED)*1000);
        this.playActorMove(e.img,e.type,false);
        this.tweens.add({targets:e.img,x:wx,y:wy,duration:eDur});
        this.tweens.add({targets:e.hpBg,x:wx,y:ny*S-4,duration:eDur});
        this.tweens.add({targets:e.hpFg,x:wx-(S-8)/2,y:ny*S-4,duration:eDur});
        this.tweens.add({targets:e.lbl,x:wx,y:wy+18,duration:eDur});
        this.tweens.add({targets:e.sightRing,x:wx,y:wy,duration:eDur});
        if(e.fa){ e.fa.setPosition(wx,ny*S+S/2); e.fa.draw(e.facing); }
        this.time.delayedCall(eDur+20,()=>{ if(e.alive) this.playActorIdle(e.img,e.type); });
        
        // If enemy moved close to player, check sight immediately
        const distToPlayer = Math.sqrt((nx - this.playerTile.x) ** 2 + (ny - this.playerTile.y) ** 2);
        if (distToPlayer <= 2.0) {
          this.time.delayedCall(eDur, () => this.checkSight());
        }
        break;
      }
    }
    this.time.delayedCall(400,()=>{ this.drawSightOverlays(); this.updateFogOfWar(); this.checkSight(); });
  },

});
