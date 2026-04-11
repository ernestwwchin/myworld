// ═══════════════════════════════════════════════════════
// combat-ranges.js — Range / zone display for combat mode
// Phase 3: Euclidean Dijkstra flood-fill for circular ranges
// ═══════════════════════════════════════════════════════

/**
 * Dijkstra flood-fill from (sx,sy) with Euclidean step costs.
 * Returns Map<"x,y", bestCost> for all reachable tiles within budget.
 */
function _floodReachable(sx, sy, budget, blockFn) {
  const costMap = new Map();
  costMap.set(`${sx},${sy}`, 0);
  // Priority queue (simple sorted insert — maps are small)
  const pq = [{ x: sx, y: sy, cost: 0 }];
  while (pq.length) {
    pq.sort((a, b) => a.cost - b.cost);
    const cur = pq.shift();
    const curKey = `${cur.x},${cur.y}`;
    if (costMap.has(curKey) && costMap.get(curKey) < cur.cost) continue;
    for (const d of DIRS8) {
      const nx = cur.x + d.x, ny = cur.y + d.y;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (blockFn(nx, ny)) continue;
      if (d.x !== 0 && d.y !== 0 && blockFn(nx, cur.y) && blockFn(cur.x, ny)) continue;
      const stepCost = Math.sqrt(d.x * d.x + d.y * d.y);
      const nc = cur.cost + stepCost;
      if (nc > budget + 0.001) continue;
      const key = `${nx},${ny}`;
      if (!costMap.has(key) || costMap.get(key) > nc + 0.001) {
        costMap.set(key, nc);
        pq.push({ x: nx, y: ny, cost: nc });
      }
    }
  }
  return costMap;
}

Object.assign(GameScene.prototype, {

  showMoveRange(){
    this.clearMoveRange();
    const budget=this.playerMoves||0, px=this.playerTile.x, py=this.playerTile.y;
    if(budget<=0) return;
    const moveBlk=(x,y)=>this.isBlockedTile(x,y,{doorMode:false});
    const reachable=_floodReachable(px,py,budget,moveBlk);
    for(const [key] of reachable){
      const [tx,ty]=key.split(',').map(Number);
      if(tx===px&&ty===py) continue;
      if(this.enemies.some(e=>e.alive&&e.tx===tx&&e.ty===ty)) continue;
      const o=this.add.image(tx*S+S/2,ty*S+S/2,'t_move').setDisplaySize(S,S).setDepth(3);
      this.rangeTiles.push({x:tx,y:ty,img:o});
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

    // Dijkstra flood-fill for movement reachable tiles
    const reachable=_floodReachable(px,py,moves,moveBlk);

    // Show blue movement tiles (lighter than normal move range)
    for(const [key] of reachable){
      const [tx,ty]=key.split(',').map(Number);
      if(tx===px&&ty===py) continue;
      const o=this.add.image(tx*S+S/2,ty*S+S/2,'t_move').setDisplaySize(S,S).setDepth(3).setAlpha(0.35);
      this.atkRangeTiles.push(o);
    }

    // Collect attackable tiles: Euclidean distance from any reachable tile ≤ atkRange
    const attackableTiles=new Set();
    for(const [key] of reachable){
      const [rx,ry]=key.split(',').map(Number);
      const rng=Math.ceil(atkRange)+1;
      for(let dy=-rng;dy<=rng;dy++) for(let dx=-rng;dx<=rng;dx++){
        if(tileDist(0,0,dx,dy)>atkRange+0.01) continue;
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
      // Euclidean distance from nearest enemy
      const nearest=alive.reduce((m,e)=>Math.min(m,tileDist(e.tx,e.ty,x,y)),Infinity);
      if(nearest<minDist) continue;
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
