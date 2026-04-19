// Fog of war, visibility, and lighting system extracted from GameScene.
const GameSceneFogSystem = {
  computeVisibleTiles() {
    if (!this.fogVisible || this.fogVisible.length !== ROWS || this.fogVisible[0]?.length !== COLS) {
      this.fogVisible = Array.from({length: ROWS}, () => Array(COLS).fill(false));
    }
    const vis = this.fogVisible;
    for (let y = 0; y < ROWS; y++) vis[y].fill(false);

    const r = Math.max(1, Number(FOG_RULES.radius || 7));
    const r2 = (r + 0.35) * (r + 0.35);
    const px = this.playerTile.x, py = this.playerTile.y;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const tx = px + dx, ty = py + dy;
        if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
        if (dx * dx + dy * dy > r2) continue;
        if (hasLOS(px, py, tx, ty)) vis[ty][tx] = true;
      }
    }
    return vis;
  },

  updateFogOfWar() {
    if (!this.fogLayer || !this._fogCtx) return;
    // Guard: bail out if scene arrays don't match current map dimensions.
    // During floor transitions, applyMap() updates ROWS/COLS before the old
    // scene restarts — stale timer callbacks (wanderEnemies, etc.) can reach
    // here with fogVisited/fogVisible still sized for the old map.
    if (!this.fogVisited || this.fogVisited.length !== ROWS || !this.fogVisited[0] || this.fogVisited[0].length !== COLS) return;
    if (!this.fogVisible || this.fogVisible.length !== ROWS || !this.fogVisible[0] || this.fogVisible[0].length !== COLS) return;
    const ctx = this._fogCtx;
    const W = COLS * S, H = ROWS * S;
    ctx.clearRect(0, 0, W, H);
    if (FOG_RULES.enabled === false) { this._fogCanvasTex.refresh(); return; }

    this.computeVisibleTiles();
    const px = this.playerTile.x, py = this.playerTile.y;
    const radius = Math.max(1, Number(FOG_RULES.radius || 7));

    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (this.fogVisible[y][x]) this.fogVisited[y][x] = true;

    const darkAlpha = Math.max(0, Math.min(1, Number(FOG_RULES.unvisitedAlpha ?? 1.0)));
    const memAlpha  = Math.max(0, Math.min(1, Number(FOG_RULES.exploredAlpha ?? 0.55)));
    const playerCx = px * S + S / 2, playerCy = py * S + S / 2;
    const maxR = (radius + 0.5) * S;
    const invMaxR = 1 / Math.max(1, maxR);

    // --- Build per-tile light level (0 = dark, 1 = fully lit) ---
    if (!this._fogLightRows || this._fogLightRows.length !== ROWS || this._fogLightRows[0]?.length !== COLS) {
      this._fogLightRows = Array.from({length: ROWS}, () => new Float32Array(COLS));
    }
    const light = this._fogLightRows;
    for (let y = 0; y < ROWS; y++) light[y].fill(0);

    // Player light: only emit if player has a portable light source (torch/lantern).
    if (typeof this.hasPlayerLightSource === 'function' && this.hasPlayerLightSource()) {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!this.fogVisible[y][x]) continue;
          const dx = (x * S + S / 2) - playerCx, dy = (y * S + S / 2) - playerCy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = Math.min(1, dist * invMaxR);
          light[y][x] = 1 - t * t * (3 - 2 * t);
        }
      }
    } else {
      // Without a torch/lantern, keep visible tiles readable without adding a player glow.
      const floor = Math.max(0, Math.min(1, Number(LIGHT_RULES.noTorchVisibleLightFloor ?? 0.2)));
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!this.fogVisible[y][x]) continue;
          if (light[y][x] < floor) light[y][x] = floor;
        }
      }
    }

    // Precompute active map lights once; reused by brightness and tint passes.
    const activeLights = [];
    const lightKeySet = new Set();
    for (const l of (this.mapLights || [])) {
      const lx = Number(l.x), ly = Number(l.y);
      const radiusScale = Math.max(0.5, Number(LIGHT_RULES.torchRadiusScale ?? 1));
      const r = Math.max(1, Number(l.radius || 3) * radiusScale);
      const isBright = String(l.level || 'dim').toLowerCase() === 'bright';
      const brightStr = Math.max(0, Number(LIGHT_RULES.torchBrightStrength ?? 0.6));
      const dimStr = Math.max(0, Number(LIGHT_RULES.torchDimStrength ?? 0.4));
      let anyVisited = false;
      for (let ddy = -r; ddy <= r && !anyVisited; ddy++)
        for (let ddx = -r; ddx <= r && !anyVisited; ddx++)
          if (this.fogVisited[ly + ddy]?.[lx + ddx]) anyVisited = true;
      if (!anyVisited) continue;

      activeLights.push({
        lx,
        ly,
        r,
        ri: Math.ceil(r) + 1,
        isBright,
        str: isBright ? brightStr : dimStr,
        lcx: lx * S + S / 2,
        lcy: ly * S + S / 2,
        pr: r * S,
      });
      lightKeySet.add(`${lx},${ly}`);
    }

    // Fallback stage torch lights (for stages that place torch sprites without mapLights entries)
    if (Array.isArray(this.stageSprites)) {
      const brightStr = Math.max(0, Number(LIGHT_RULES.torchBrightStrength ?? 0.6));
      const dimStr = Math.max(0, Number(LIGHT_RULES.torchDimStrength ?? 0.4));
      const radiusScale = Math.max(0.5, Number(LIGHT_RULES.torchRadiusScale ?? 1));
      for (const sp of this.stageSprites) {
        if (!sp || !sp.active || !sp._stageLit) continue;
        if (sp._stageType !== 'torch') continue;
        const lx = Math.round((sp.x - S / 2) / S);
        const ly = Math.round((sp.y - S / 2) / S);
        const key = `${lx},${ly}`;
        if (lightKeySet.has(key)) continue;

        const baseR = Math.max(1, Number(sp._stageLightRadius || 3));
        const r = baseR * radiusScale;
        const isBright = String(sp._stageLightLevel || 'bright').toLowerCase() === 'bright';

        let anyVisited = false;
        const ri = Math.ceil(r) + 1;
        for (let ddy = -ri; ddy <= ri && !anyVisited; ddy++) {
          for (let ddx = -ri; ddx <= ri && !anyVisited; ddx++) {
            if (this.fogVisited[ly + ddy]?.[lx + ddx]) anyVisited = true;
          }
        }
        if (!anyVisited) continue;

        activeLights.push({
          lx,
          ly,
          r,
          ri,
          isBright,
          str: isBright ? brightStr : dimStr,
          lcx: lx * S + S / 2,
          lcy: ly * S + S / 2,
          pr: r * S,
        });
      }
    }

    // Torch lights: add brightness to all visited tiles in range.
    for (const l of activeLights) {
      for (let dy = -l.ri; dy <= l.ri; dy++) {
        for (let dx = -l.ri; dx <= l.ri; dx++) {
          const tx = l.lx + dx, ty = l.ly + dy;
          if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
          if (!this.fogVisited[ty][tx]) continue;
          const tdx = (tx * S + S / 2) - l.lcx, tdy = (ty * S + S / 2) - l.lcy;
          const dist = Math.sqrt(tdx * tdx + tdy * tdy);
          if (dist > l.pr) continue;
          const lt = dist / l.pr;
          light[ty][tx] = Math.min(1, light[ty][tx] + l.str * (1 - lt * lt));
        }
      }
    }

    // --- Render fog using low-res alpha mask upscaled with smoothing ---
    ctx.globalCompositeOperation = 'source-over';

    // Pre-compute per-tile alpha (visited + light -> fog alpha)
    if (!this._fogTileAlphaRows || this._fogTileAlphaRows.length !== ROWS || this._fogTileAlphaRows[0]?.length !== COLS) {
      this._fogTileAlphaRows = Array.from({length: ROWS}, () => new Float32Array(COLS));
    }
    const tileA = this._fogTileAlphaRows;
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const v = this.fogVisited[y][x] ? 1 : 0;
        tileA[y][x] = memAlpha * (1 - light[y][x]) * v + darkAlpha * (1 - v);
      }

    let rendered = false;
    const canUseLowResMask =
      typeof ctx.drawImage === 'function' &&
      (typeof OffscreenCanvas !== 'undefined' || (typeof document !== 'undefined' && typeof document.createElement === 'function'));

    if (canUseLowResMask) {
      if (!this._fogLowResCanvas || this._fogLowResCanvas.width !== COLS || this._fogLowResCanvas.height !== ROWS) {
        let lowCanvas = null;
        if (typeof OffscreenCanvas !== 'undefined') {
          lowCanvas = new OffscreenCanvas(COLS, ROWS);
        } else {
          lowCanvas = document.createElement('canvas');
          lowCanvas.width = COLS;
          lowCanvas.height = ROWS;
        }
        this._fogLowResCanvas = lowCanvas;
        this._fogLowResCtx = lowCanvas.getContext('2d');
      }

      if (this._fogLowResCtx) {
        const lowCtx = this._fogLowResCtx;
        if (!this._fogLowResImage || this._fogLowResImage.width !== COLS || this._fogLowResImage.height !== ROWS) {
          this._fogLowResImage = lowCtx.createImageData(COLS, ROWS);
        }
        const img = this._fogLowResImage;
        const data = img.data;
        for (let y = 0; y < ROWS; y++) {
          const row = tileA[y];
          for (let x = 0; x < COLS; x++) {
            const idx = (y * COLS + x) * 4;
            const a = row[x];
            data[idx + 3] = a <= 0 ? 0 : a >= 1 ? 255 : (a * 255) | 0;
          }
        }
        lowCtx.putImageData(img, 0, 0);

        const prevSmooth = ctx.imageSmoothingEnabled;
        const prevQuality = ctx.imageSmoothingQuality;
        ctx.imageSmoothingEnabled = true;
        if (typeof ctx.imageSmoothingQuality !== 'undefined') ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this._fogLowResCanvas, 0, 0, COLS, ROWS, 0, 0, W, H);
        ctx.imageSmoothingEnabled = prevSmooth;
        if (typeof prevQuality !== 'undefined') ctx.imageSmoothingQuality = prevQuality;
        rendered = true;
      }
    }

    // Fallback path for non-browser test contexts.
    if (!rendered) {
      for (let ty = 0; ty < ROWS; ty++) {
        for (let tx = 0; tx < COLS; tx++) {
          const a = tileA[ty][tx];
          if (a < 0.01) continue;
          ctx.fillStyle = `rgba(0,0,0,${a})`;
          ctx.fillRect(tx * S, ty * S, S, S);
        }
      }
    }

    // --- Torch warm tint (radial gradients, inherently smooth) ---
    ctx.globalCompositeOperation = 'source-over';
    for (const l of activeLights) {
      const tc = l.isBright ? '255,232,160' : '255,160,80';
      const ts = l.isBright ? 0.08 : 0.05;
      const tg = ctx.createRadialGradient(l.lcx, l.lcy, 0, l.lcx, l.lcy, l.pr);
      tg.addColorStop(0, `rgba(${tc},${ts})`);
      tg.addColorStop(0.5, `rgba(${tc},${ts * 0.4})`);
      tg.addColorStop(1, `rgba(${tc},0)`);
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.arc(l.lcx, l.lcy, l.pr, 0, Math.PI * 2);
      ctx.fill();
    }

    this._fogCanvasTex.refresh();
    this.updateEnemyVisibilityByFog();
  },

  updateEnemyVisibilityByFog() {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      // In combat, engaged enemies should stay visible; non-engaged still use LOS/fog.
      const visible = this.mode === MODE.COMBAT
        ? (!!e.inCombat || this.isTileVisibleToPlayer(e.tx, e.ty))
        : this.isTileVisibleToPlayer(e.tx, e.ty);
      const a = visible ? 1 : 0;
      if (e.img) e.img.setAlpha(a);
      if (e.hpBg) e.hpBg.setAlpha(a);
      if (e.hpFg) e.hpFg.setAlpha(a);
      if (e.lbl) e.lbl.setAlpha(visible ? 0.7 : 0);
      if (e.fa) e.fa.setAlpha(a);
    }
  },

  isTileVisibleToPlayer(tx, ty) {
    if (this.fogVisible && this.fogVisible[ty] && typeof this.fogVisible[ty][tx] === 'boolean') {
      return this.fogVisible[ty][tx];
    }
    return hasLOS(this.playerTile.x, this.playerTile.y, tx, ty);
  },

};

Object.assign(GameScene.prototype, GameSceneFogSystem);
