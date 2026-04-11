// ═══════════════════════════════════════════════════════
// combat-ranges.js — Range / zone display for combat mode
// Phase 4: BG3-style smooth circles with wall-clipping masks
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

/** Build a GeometryMask from tile-aligned S×S rects (not added to display). */
function _tileMask(scene, tiles) {
  const ms = scene.make.graphics({ add: false });
  ms.fillStyle(0xffffff);
  for (const t of tiles) ms.fillRect(t.x * S, t.y * S, S, S);
  return ms;
}

/** Draw a filled+stroked circle, masked to tile rects. Returns {gfx, maskShape}. */
function _maskedCircle(scene, cx, cy, radius, fillColor, fillAlpha, strokeColor, strokeAlpha, strokeWidth, maskTiles, depth) {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(fillColor, fillAlpha);
  g.fillCircle(cx, cy, radius);
  if (strokeWidth > 0) {
    g.lineStyle(strokeWidth, strokeColor, strokeAlpha);
    g.strokeCircle(cx, cy, radius);
  }
  const ms = _tileMask(scene, maskTiles);
  g.setMask(ms.createGeometryMask());
  return { gfx: g, maskShape: ms };
}

/** Draw flat tile surface with edge-only borders (for flee zone etc). */
function _drawSurface(scene, tileSet, allTiles, fillColor, fillAlpha, borderColor, borderAlpha, depth) {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(fillColor, fillAlpha);
  for (const t of allTiles) g.fillRect(t.x * S, t.y * S, S, S);
  g.lineStyle(2, borderColor, borderAlpha);
  for (const t of allTiles) {
    const x = t.x * S, y = t.y * S;
    if (!tileSet.has(`${t.x},${t.y - 1}`)) g.lineBetween(x, y, x + S, y);
    if (!tileSet.has(`${t.x},${t.y + 1}`)) g.lineBetween(x, y + S, x + S, y + S);
    if (!tileSet.has(`${t.x - 1},${t.y}`)) g.lineBetween(x, y, x, y + S);
    if (!tileSet.has(`${t.x + 1},${t.y}`)) g.lineBetween(x + S, y, x + S, y + S);
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

    // Mask extends +1 tile beyond budget so the circle edge is smooth in open areas
    const maskFlood = _floodReachable(px, py, budget + 1, moveBlk);
    const maskTiles = [];
    for (const [key] of maskFlood) {
      const [tx, ty] = key.split(',').map(Number);
      maskTiles.push({ x: tx, y: ty });
    }

    // rangeTiles for click validation — excludes enemy tiles, anchor tile, and current player tile
    const cpx = this.playerTile.x, cpy = this.playerTile.y;
    for (const [key] of reachable) {
      const [tx, ty] = key.split(',').map(Number);
      if (tx === px && ty === py) continue;
      if (tx === cpx && ty === cpy) continue;
      if (this.enemies.some(e => e.alive && e.tx === tx && e.ty === ty)) continue;
      this.rangeTiles.push({ x: tx, y: ty });
    }

    // Smooth circle, masked to walkable tiles
    const wcx = px * S + S / 2, wcy = py * S + S / 2;
    const { gfx, maskShape } = _maskedCircle(
      this, wcx, wcy, budget * S,
      0x3498db, 0.20, 0x5dade2, 0.55, 2,
      maskTiles, 3
    );
    this._moveRangeGfx = gfx;
    this._moveRangeMask = maskShape;
  },

  clearMoveRange(){
    if (this._moveRangeGfx) { this._moveRangeGfx.destroy(); this._moveRangeGfx = null; }
    if (this._moveRangeMask) { this._moveRangeMask.destroy(); this._moveRangeMask = null; }
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
    const wcx = px * S + S / 2, wcy = py * S + S / 2;

    // Movement flood + extended mask
    const reachable = _floodReachable(px, py, moves, moveBlk);
    const moveMaskFlood = _floodReachable(px, py, moves + 1, moveBlk);
    const moveMaskTiles = [];
    for (const [key] of moveMaskFlood) {
      const [tx, ty] = key.split(',').map(Number);
      moveMaskTiles.push({ x: tx, y: ty });
    }

    // Attackable tiles (union of all tiles within atkRange of any reachable tile)
    const attackSet = new Set();
    const atkTiles = [];
    for (const [key] of reachable) {
      const [rx, ry] = key.split(',').map(Number);
      const rng = Math.ceil(atkRange) + 1;
      for (let dy = -rng; dy <= rng; dy++) for (let dx = -rng; dx <= rng; dx++) {
        if (tileDist(0, 0, dx, dy) > atkRange + 0.01) continue;
        const ax = rx + dx, ay = ry + dy;
        if (ax < 0 || ay < 0 || ax >= COLS || ay >= ROWS) continue;
        const k = `${ax},${ay}`;
        if (!attackSet.has(k)) { attackSet.add(k); atkTiles.push({ x: ax, y: ay }); }
      }
    }
    // Extended mask for attack circle
    const atkMaskFlood = _floodReachable(px, py, moves + atkRange + 1, moveBlk);
    const atkMaskTiles = [];
    for (const [key] of atkMaskFlood) {
      const [tx, ty] = key.split(',').map(Number);
      atkMaskTiles.push({ x: tx, y: ty });
    }
    // Also include attack tiles themselves (they may be beyond the flood)
    const atkMaskSet = new Set(atkMaskTiles.map(t => `${t.x},${t.y}`));
    for (const t of atkTiles) {
      const k = `${t.x},${t.y}`;
      if (!atkMaskSet.has(k)) { atkMaskSet.add(k); atkMaskTiles.push(t); }
    }

    this._atkMasks = [];

    // Blue movement circle (dimmer)
    const m1 = _maskedCircle(this, wcx, wcy, moves * S,
      0x3498db, 0.12, 0, 0, 0, moveMaskTiles, 3);
    this.atkRangeTiles.push(m1.gfx);
    this._atkMasks.push(m1.maskShape);

    // Red attack-reach circle
    const m2 = _maskedCircle(this, wcx, wcy, (moves + atkRange) * S,
      0xe74c3c, 0.08, 0xe74c3c, 0.35, 1.5, atkMaskTiles, 3);
    this.atkRangeTiles.push(m2.gfx);
    this._atkMasks.push(m2.maskShape);

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
    if (this._atkMasks) { this._atkMasks.forEach(m => m.destroy()); this._atkMasks = null; }
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
