// ═══════════════════════════════════════════════════════
// combat-ranges.js — Range / zone display for combat mode
// Extracted from mode-combat.js (Phase -1.8)
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

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
      const moveBlk=(x,y)=>this.isBlockedTile(x,y,{doorMode:false});
      const path=bfs(px,py,tx,ty,moveBlk);
      if(path.length&&path.length<=range){
        const o=this.add.image(tx*S+S/2,ty*S+S/2,'t_move').setDisplaySize(S,S).setDepth(3);
        this.rangeTiles.push({x:tx,y:ty,img:o});
      }
    }
  },
  clearMoveRange(){ this.rangeTiles.forEach(r=>r.img.destroy()); this.rangeTiles=[]; },
  inMoveRange(tx,ty){ return this.rangeTiles.some(r=>r.x===tx&&r.y===ty); },

  showAtkRange(){
    this.clearAtkRange();
    if(!this.combatGroup||!this.combatGroup.length) return;
    const px=this.playerTile.x, py=this.playerTile.y;
    const atkRange=this.pStats.atkRange||1;
    const moves=this.playerMoves||0;
    const moveBlk=(x,y)=>this.isBlockedTile(x,y,{doorMode:false});

    // BFS to find all reachable tiles within movement range
    const reachable=new Map(); // key "x,y" → cost
    reachable.set(`${px},${py}`, 0);
    if(moves>0){
      const queue=[{x:px,y:py,cost:0}];
      const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
      while(queue.length){
        const cur=queue.shift();
        for(const d of dirs){
          const nx=cur.x+d.x, ny=cur.y+d.y, nc=cur.cost+1;
          if(nx<0||ny<0||nx>=COLS||ny>=ROWS) continue;
          if(nc>moves) continue;
          if(moveBlk(nx,ny)) continue;
          const key=`${nx},${ny}`;
          if(!reachable.has(key)||reachable.get(key)>nc){
            reachable.set(key, nc);
            queue.push({x:nx,y:ny,cost:nc});
          }
        }
      }
    }

    // Show blue movement tiles (lighter than normal move range)
    for(const [key] of reachable){
      const [tx,ty]=key.split(',').map(Number);
      if(tx===px&&ty===py) continue;
      const o=this.add.image(tx*S+S/2,ty*S+S/2,'t_move').setDisplaySize(S,S).setDepth(3).setAlpha(0.35);
      this.atkRangeTiles.push(o);
    }

    // For each reachable tile, check if any enemy is within atkRange
    // Collect attackable tiles (adjacent to reachable tiles)
    const attackableTiles=new Set();
    for(const [key] of reachable){
      const [rx,ry]=key.split(',').map(Number);
      for(let dy=-atkRange;dy<=atkRange;dy++) for(let dx=-atkRange;dx<=atkRange;dx++){
        const ax=rx+dx, ay=ry+dy;
        if(ax<0||ay<0||ax>=COLS||ay>=ROWS) continue;
        attackableTiles.add(`${ax},${ay}`);
      }
    }

    // Highlight enemies: bright red if attackable, dim outline otherwise
    for(const e of this.combatGroup){
      if(!e.alive||!e.img) continue;
      if(attackableTiles.has(`${e.tx},${e.ty}`)){
        const bright=this.add.image(e.tx*S+S/2,e.ty*S+S/2,'t_atk').setDisplaySize(S,S).setDepth(5).setAlpha(1);
        this.atkRangeTiles.push(bright);
      } else {
        try{ const g=this.add.graphics().setDepth(5); g.lineStyle(2,0xe74c3c,0.3); g.strokeRect(e.tx*S+2,e.ty*S+2,S-4,S-4); this.atkRangeTiles.push(g); }catch(err){}
      }
    }
    this.showStatus('Select an enemy to attack.');
  },
  clearAtkRange(){ this.atkRangeTiles.forEach(o=>o.destroy()); this.atkRangeTiles=[]; },

  // ─────────────────────────────────────────
  // FLEE ZONE OVERLAY
  // ─────────────────────────────────────────
  showFleeZone(){
    this.clearFleeZone();
    this._fleeZoneTiles=[];
    const alive=this.combatGroup.filter(e=>e.alive);
    if(!alive.length) return;
    const minDist=Math.max(1,Number(COMBAT_RULES.fleeMinDistance||6));
    const checkLOS=COMBAT_RULES.fleeRequiresNoLOS!==false;
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
      if(this.isWallTile(x,y)) continue;
      // Check distance from all enemies
      const nearest=alive.reduce((m,e)=>Math.min(m,Math.abs(e.tx-x)+Math.abs(e.ty-y)),Infinity);
      if(nearest<minDist) continue;
      // Check LOS from all enemies
      if(checkLOS){
        const seen=alive.some(e=>this.canEnemySeeTile(e,x,y,{checkFOV:false,useEffectiveSight:false}));
        if(seen) continue;
      }
      const o=this.add.image(x*S+S/2,y*S+S/2,'t_flee').setDisplaySize(S,S).setDepth(16);
      this._fleeZoneTiles.push(o);
    }
  },
  clearFleeZone(){
    if(this._fleeZoneTiles) this._fleeZoneTiles.forEach(o=>o.destroy());
    this._fleeZoneTiles=[];
  },

});
