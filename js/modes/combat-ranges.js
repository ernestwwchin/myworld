// ═══════════════════════════════════════════════════════
// combat-ranges.js — Range / zone display for combat mode
// Tile-rect overlays with flood-fill reachability
// ═══════════════════════════════════════════════════════

/**
 * Dijkstra flood-fill from (sx,sy) with Euclidean step costs.
 * Returns Map<"x,y", bestCost> for all reachable tiles within budget.
 */
function _floodReachable(sx, sy, budget, blockFn) {
  const costMap = new Map();
  costMap.set(`${sx},${sy}`, 0);
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

/** Draw filled tile rects with optional border outline. */
function _drawSurface(scene, tileSet, allTiles, fillColor, fillAlpha, borderColor, borderAlpha, depth) {
  const g = scene.add.graphics().setDepth(depth);

  // Fill each tile
  g.fillStyle(fillColor, fillAlpha);
  for (const t of allTiles) g.fillRect(t.x * S, t.y * S, S, S);

  // Border: stroke edges adjacent to non-set tiles
  if (borderAlpha > 0) {
    g.lineStyle(2, borderColor, borderAlpha);
    for (const t of allTiles) {
      const {x, y} = t;
      if (!tileSet.has(`${x},${y-1}`)) g.lineBetween(x*S, y*S, (x+1)*S, y*S);
      if (!tileSet.has(`${x+1},${y}`)) g.lineBetween((x+1)*S, y*S, (x+1)*S, (y+1)*S);
      if (!tileSet.has(`${x},${y+1}`)) g.lineBetween(x*S, (y+1)*S, (x+1)*S, (y+1)*S);
      if (!tileSet.has(`${x-1},${y}`)) g.lineBetween(x*S, y*S, x*S, (y+1)*S);
    }
  }
  return g;
}

Object.assign(GameScene.prototype, {

  showMoveRange(){
    this.clearMoveRange();
    // BG3: always show range from turn-start position with full turn budget
    const anchor = this.turnStartTile || this.playerTile;
    const budget = this.turnStartMoves || this.playerMoves || 0;
    if (budget <= 0) return;
    const px = anchor.x, py = anchor.y;

    const moveBlk = (x, y) => this.isBlockedTile(x, y, { doorMode: false });
    const reachable = _floodReachable(px, py, budget, moveBlk);

    // rangeTiles for click validation — excludes enemy tiles and current player tile
    const cpx = this.playerTile.x, cpy = this.playerTile.y;
    const allTiles = [];
    for (const [key] of reachable) {
      const [tx, ty] = key.split(',').map(Number);
      allTiles.push({ x: tx, y: ty });
      if (tx === cpx && ty === cpy) continue;
      if (this.enemies.some(e => e.alive && e.tx === tx && e.ty === ty)) continue;
      this.rangeTiles.push({ x: tx, y: ty });
    }

    const tileSet = new Set([...reachable.keys()]);
    this._moveRangeGfx = _drawSurface(
      this, tileSet, allTiles,
      0x3498db, 0.18, 0x5dade2, 0.50, 3
    );

    // Spotting preview: red tiles are positions where non-combat enemies can see you
    // if you end your turn there (using the same FOV+LOS sight checks).
    if (this.combatGroup && this.combatGroup.length) {
      const dangerTiles = [];
      for (const t of allTiles) {
        const predicted = (typeof this._predictNewAlertedAtTile === 'function')
          ? this._predictNewAlertedAtTile(t.x, t.y)
          : [];
        if (predicted.length) dangerTiles.push(t);
      }

      if (dangerTiles.length) {
        const dangerSet = new Set(dangerTiles.map(t => `${t.x},${t.y}`));
        this._moveSpotGfx = _drawSurface(
          this, dangerSet, dangerTiles,
          0xe74c3c, 0.16, 0xff6b6b, 0.55, 4
        );
      }
    }
  },

  clearMoveRange(){
    if (this._moveRangeGfx) { this._moveRangeGfx.destroy(); this._moveRangeGfx = null; }
    if (this._moveSpotGfx) { this._moveSpotGfx.destroy(); this._moveSpotGfx = null; }
    this.rangeTiles = [];
  },

  inMoveRange(tx, ty){ return this.rangeTiles.some(r => r.x === tx && r.y === ty); },

  showAtkRange(){
    this.clearAtkRange();
    if (!this.combatGroup || !this.combatGroup.length) return;
    // BG3: attack range also from turn-start with full budget
    const anchor = this.turnStartTile || this.playerTile;
    const px = anchor.x, py = anchor.y;
    const atkRange = this.pStats.atkRange || 1;
    const moves = this.turnStartMoves || this.playerMoves || 0;
    const moveBlk = (x, y) => this.isBlockedTile(x, y, { doorMode: false });

    // Movement flood
    const reachable = _floodReachable(px, py, moves, moveBlk);
    const moveTiles = [];
    const moveSet = new Set();
    for (const [key] of reachable) {
      const [tx, ty] = key.split(',').map(Number);
      moveTiles.push({ x: tx, y: ty });
      moveSet.add(key);
    }

    // Attackable tiles (union of all tiles within atkRange of any reachable tile)
    const attackSet = new Set();
    const atkOnlyTiles = []; // tiles in attack range but NOT in move range
    for (const [key] of reachable) {
      const [rx, ry] = key.split(',').map(Number);
      const rng = Math.ceil(atkRange) + 1;
      for (let dy = -rng; dy <= rng; dy++) for (let dx = -rng; dx <= rng; dx++) {
        if (tileDist(0, 0, dx, dy) > atkRange + 0.01) continue;
        const ax = rx + dx, ay = ry + dy;
        if (ax < 0 || ay < 0 || ax >= COLS || ay >= ROWS) continue;
        const k = `${ax},${ay}`;
        if (!attackSet.has(k)) {
          attackSet.add(k);
          if (!moveSet.has(k)) atkOnlyTiles.push({ x: ax, y: ay });
        }
      }
    }

    // Blue movement surface (dimmer)
    const moveGfx = _drawSurface(this, moveSet, moveTiles,
      0x3498db, 0.10, 0, 0, 3);
    this.atkRangeTiles.push(moveGfx);

    // Red attack-reach surface (only the fringe beyond move range)
    if (atkOnlyTiles.length) {
      const atkFringeSet = new Set(atkOnlyTiles.map(t => `${t.x},${t.y}`));
      // Merge with moveSet for border computation (borders only on outer edges)
      const fullSet = new Set([...moveSet, ...atkFringeSet]);
      const atkGfx = _drawSurface(this, fullSet, atkOnlyTiles,
        0xe74c3c, 0.08, 0xe74c3c, 0.35, 3);
      this.atkRangeTiles.push(atkGfx);
    }

    // Highlight enemies
    for (const e of this.combatGroup) {
      if (!e.alive || !e.img) continue;
      if (attackSet.has(`${e.tx},${e.ty}`)) {
        const bright = this.add.image(e.tx * S + S / 2, e.ty * S + S / 2, 't_atk')
          .setDisplaySize(S, S).setDepth(5).setAlpha(1);
        this.atkRangeTiles.push(bright);
      } else {
        try {
          const g = this.add.graphics().setDepth(5);
          g.lineStyle(2, 0xe74c3c, 0.3);
          g.strokeRoundedRect(e.tx * S + 3, e.ty * S + 3, S - 6, S - 6, 8);
          this.atkRangeTiles.push(g);
        } catch (err) {}
      }
    }
    this.showStatus('Select an enemy to attack.');
  },

  clearAtkRange(){
    this.atkRangeTiles.forEach(o => o.destroy());
    this.atkRangeTiles = [];
  },

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
    const tiles=[];
    const fleeSet=new Set();
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
      if(this.isWallTile(x,y)) continue;
      const nearest=alive.reduce((m,e)=>Math.min(m,tileDist(e.tx,e.ty,x,y)),Infinity);
      if(nearest<minDist) continue;
      if(checkLOS){
        const seen=alive.some(e=>this.canEnemySeeTile(e,x,y,{checkFOV:false,useEffectiveSight:false}));
        if(seen) continue;
      }
      tiles.push({x,y});
      fleeSet.add(`${x},${y}`);
    }
    const g=_drawSurface(this, fleeSet, tiles, 0x2ecc71, 0.18, 0x2ecc71, 0.45, 16);
    this._fleeZoneTiles.push(g);
  },
  clearFleeZone(){
    if(this._fleeZoneTiles) this._fleeZoneTiles.forEach(o=>o.destroy());
    this._fleeZoneTiles=[];
  },

});
