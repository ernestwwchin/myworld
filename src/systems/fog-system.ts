import { S, MODE, FOG_RULES, LIGHT_RULES, mapState } from '@/config';
import { hasLOS } from '@/helpers';
import type { GameScene } from '@/game';
import type { Enemy } from '@/types/actors';

interface ActiveLight {
  lx: number;
  ly: number;
  r: number;
  ri: number;
  isBright: boolean;
  str: number;
  lcx: number;
  lcy: number;
  pr: number;
}

export const FogSystemMixin = {
  computeVisibleTiles(this: GameScene): boolean[][] {
    const ROWS = mapState.rows;
    const COLS = mapState.cols;
    if (!this.fogVisible || this.fogVisible.length !== ROWS || this.fogVisible[0]?.length !== COLS) {
      this.fogVisible = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    }
    const vis = this.fogVisible;
    for (let y = 0; y < ROWS; y++) vis[y].fill(false);

    const r = Math.max(1, Number(FOG_RULES.radius || 7));
    const r2 = (r + 0.35) * (r + 0.35);
    const px = this.playerTile.x;
    const py = this.playerTile.y;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const tx = px + dx;
        const ty = py + dy;
        if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
        if (dx * dx + dy * dy > r2) continue;
        if (hasLOS(px, py, tx, ty)) vis[ty][tx] = true;
      }
    }
    return vis;
  },

  updateFogOfWar(this: GameScene): void {
    if (!this.fogLayer || !this._fogCtx) return;
    const ROWS = mapState.rows;
    const COLS = mapState.cols;
    if (!this.fogVisited || this.fogVisited.length !== ROWS || !this.fogVisited[0] || this.fogVisited[0].length !== COLS) return;
    if (!this.fogVisible || this.fogVisible.length !== ROWS || !this.fogVisible[0] || this.fogVisible[0].length !== COLS) return;
    const ctx = this._fogCtx;
    const W = COLS * S;
    const H = ROWS * S;
    ctx.clearRect(0, 0, W, H);
    if (FOG_RULES.enabled === false) {
      this._fogCanvasTex.refresh();
      return;
    }

    this.computeVisibleTiles();
    const px = this.playerTile.x;
    const py = this.playerTile.y;
    const radius = Math.max(1, Number(FOG_RULES.radius || 7));

    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (this.fogVisible[y][x]) this.fogVisited[y][x] = true;

    const darkAlpha = Math.max(0, Math.min(1, Number(FOG_RULES.unvisitedAlpha ?? 1.0)));
    const memAlpha = Math.max(0, Math.min(1, Number(FOG_RULES.exploredAlpha ?? 0.55)));
    const playerCx = px * S + S / 2;
    const playerCy = py * S + S / 2;
    const maxR = (radius + 0.5) * S;
    const invMaxR = 1 / Math.max(1, maxR);

    if (!this._fogLightRows || this._fogLightRows.length !== ROWS || this._fogLightRows[0]?.length !== COLS) {
      this._fogLightRows = Array.from({ length: ROWS }, () => new Float32Array(COLS));
    }
    const light = this._fogLightRows;
    for (let y = 0; y < ROWS; y++) light[y].fill(0);

    if (typeof this.hasPlayerLightSource === 'function' && this.hasPlayerLightSource()) {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!this.fogVisible[y][x]) continue;
          const dx = x * S + S / 2 - playerCx;
          const dy = y * S + S / 2 - playerCy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = Math.min(1, dist * invMaxR);
          light[y][x] = 1 - t * t * (3 - 2 * t);
        }
      }
    } else {
      const floor = Math.max(0, Math.min(1, Number(LIGHT_RULES.noTorchVisibleLightFloor ?? 0.2)));
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!this.fogVisible[y][x]) continue;
          if (light[y][x] < floor) light[y][x] = floor;
        }
      }
    }

    const activeLights: ActiveLight[] = [];
    const lightKeySet = new Set<string>();
    for (const l of this.mapLights || []) {
      const lx = Number(l.x);
      const ly = Number(l.y);
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

    for (const l of activeLights) {
      for (let dy = -l.ri; dy <= l.ri; dy++) {
        for (let dx = -l.ri; dx <= l.ri; dx++) {
          const tx = l.lx + dx;
          const ty = l.ly + dy;
          if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
          if (!this.fogVisited[ty][tx]) continue;
          const tdx = tx * S + S / 2 - l.lcx;
          const tdy = ty * S + S / 2 - l.lcy;
          const dist = Math.sqrt(tdx * tdx + tdy * tdy);
          if (dist > l.pr) continue;
          const lt = dist / l.pr;
          light[ty][tx] = Math.min(1, light[ty][tx] + l.str * (1 - lt * lt));
        }
      }
    }

    (ctx as CanvasRenderingContext2D).globalCompositeOperation = 'source-over';

    if (!this._fogTileAlphaRows || this._fogTileAlphaRows.length !== ROWS || this._fogTileAlphaRows[0]?.length !== COLS) {
      this._fogTileAlphaRows = Array.from({ length: ROWS }, () => new Float32Array(COLS));
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
        let lowCanvas: OffscreenCanvas | HTMLCanvasElement;
        if (typeof OffscreenCanvas !== 'undefined') {
          lowCanvas = new OffscreenCanvas(COLS, ROWS);
        } else {
          const el = document.createElement('canvas');
          el.width = COLS;
          el.height = ROWS;
          lowCanvas = el;
        }
        this._fogLowResCanvas = lowCanvas;
        this._fogLowResCtx = (lowCanvas as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;
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

        const c = ctx as CanvasRenderingContext2D;
        const prevSmooth = c.imageSmoothingEnabled;
        const prevQuality = c.imageSmoothingQuality;
        c.imageSmoothingEnabled = true;
        if (typeof c.imageSmoothingQuality !== 'undefined') c.imageSmoothingQuality = 'high';
        c.drawImage(this._fogLowResCanvas as CanvasImageSource, 0, 0, COLS, ROWS, 0, 0, W, H);
        c.imageSmoothingEnabled = prevSmooth;
        if (typeof prevQuality !== 'undefined') c.imageSmoothingQuality = prevQuality;
        rendered = true;
      }
    }

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

    (ctx as CanvasRenderingContext2D).globalCompositeOperation = 'source-over';
    for (const l of activeLights) {
      const tc = l.isBright ? '255,232,160' : '255,160,80';
      const ts = l.isBright ? 0.08 : 0.05;
      const c = ctx as CanvasRenderingContext2D;
      const tg = c.createRadialGradient(l.lcx, l.lcy, 0, l.lcx, l.lcy, l.pr);
      tg.addColorStop(0, `rgba(${tc},${ts})`);
      tg.addColorStop(0.5, `rgba(${tc},${ts * 0.4})`);
      tg.addColorStop(1, `rgba(${tc},0)`);
      c.fillStyle = tg;
      c.beginPath();
      c.arc(l.lcx, l.lcy, l.pr, 0, Math.PI * 2);
      c.fill();
    }

    this._fogCanvasTex.refresh();
    this.updateEnemyVisibilityByFog();
  },

  updateEnemyVisibilityByFog(this: GameScene): void {
    for (const e of this.enemies as Enemy[]) {
      if (!e.alive) continue;
      const visible =
        this.mode === MODE.COMBAT
          ? !!e.inCombat || this.isTileVisibleToPlayer(e.tx, e.ty)
          : this.isTileVisibleToPlayer(e.tx, e.ty);
      const a = visible ? 1 : 0;
      if (e.img) e.img.setAlpha(a);
      if (e.hpBg) e.hpBg.setAlpha(a);
      if (e.hpFg) e.hpFg.setAlpha(a);
      if (e.lbl) e.lbl.setAlpha(visible ? 0.7 : 0);
      if (e.fa) e.fa.setAlpha(a);
    }
  },

  isTileVisibleToPlayer(this: GameScene, tx: number, ty: number): boolean {
    if (this.fogVisible && this.fogVisible[ty] && typeof this.fogVisible[ty][tx] === 'boolean') {
      return this.fogVisible[ty][tx];
    }
    return hasLOS(this.playerTile.x, this.playerTile.y, tx, ty);
  },
};

declare module '@/game' {
  interface GameScene {
    computeVisibleTiles(): boolean[][];
    updateFogOfWar(): void;
    updateEnemyVisibilityByFog(): void;
    isTileVisibleToPlayer(tx: number, ty: number): boolean;
    _fogLightRows: Float32Array[] | null;
    _fogTileAlphaRows: Float32Array[] | null;
    _fogLowResCanvas: OffscreenCanvas | HTMLCanvasElement | null;
    _fogLowResCtx: CanvasRenderingContext2D | null;
    _fogLowResImage: ImageData | null;
  }
}
