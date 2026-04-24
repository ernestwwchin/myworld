import { CELL_SIZE, LOGIC, OBJECTS } from './data';
import { getCachedImg, preloadAll } from './image-loader';
import * as state from './state';

// ── Render orchestrator ──

export async function renderAll(): Promise<void> {
  const needed = new Set<string>();
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const v = state.cells[r][c].visuals;
      if (v.ground) needed.add(v.ground);
      if (v.structure) needed.add(v.structure);
      if (v.decoration) needed.add(v.decoration);
      const obj = state.resolveObjSprite(r, c);
      if (obj) needed.add(obj);
    }
  }
  await preloadAll(needed);
  renderTileView();
  renderLogicView();
  updateSelectedInfo();
}

// ── Tile view (visual) ──

function renderTileView(): void {
  const canvas = document.getElementById('edTileCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const S = CELL_SIZE;
  canvas.width = state.gridW * S;
  canvas.height = state.gridH * S;
  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const cell = state.cells[r][c];

      ctx.fillStyle = '#1a1d24';
      ctx.fillRect(c * S, r * S, S, S);

      // Draw 3 visual sub-layers in order
      for (const layer of ['ground', 'structure', 'decoration'] as const) {
        const tileName = cell.visuals[layer];
        if (tileName) {
          const img = getCachedImg(tileName);
          if (img) ctx.drawImage(img, c * S, r * S, S, S);
        }
      }

      // Object sprite on top
      const objSprite = state.resolveObjSprite(r, c);
      if (objSprite) {
        const img = getCachedImg(objSprite);
        if (img) ctx.drawImage(img, c * S, r * S, S, S);
      }

      // Markers for objects without sprites
      if (cell.object === 'enemy_spawn') {
        ctx.fillStyle = 'rgba(239,68,68,0.6)';
        ctx.beginPath();
        ctx.moveTo(c * S + S / 2, r * S + 4);
        ctx.lineTo(c * S + S - 4, r * S + S / 2);
        ctx.lineTo(c * S + S / 2, r * S + S - 4);
        ctx.lineTo(c * S + 4, r * S + S / 2);
        ctx.closePath();
        ctx.fill();
      }
      if (cell.object === 'stairs') {
        ctx.fillStyle = 'rgba(224,86,160,0.7)';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('>', c * S + S / 2, r * S + S / 2);
      }

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeRect(c * S, r * S, S, S);
    }
  }
  drawSelection(ctx);
}

// ── Logic view ──

const SYMBOLS: Record<string, { sym: string; fg: string; size: number }> = {
  walkable: { sym: '·', fg: '#4ade80', size: 22 },
  blocked:  { sym: '█', fg: '#ff6b6b', size: 20 },
  void:     { sym: ' ', fg: '#555', size: 20 },
  doorable: { sym: 'D', fg: '#60a5fa', size: 18 },
};

function renderLogicView(): void {
  const canvas = document.getElementById('edLogicCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const S = CELL_SIZE;
  canvas.width = state.gridW * S;
  canvas.height = state.gridH * S;
  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const cell = state.cells[r][c];
      const lDef = LOGIC[cell.logic];
      const sym = SYMBOLS[cell.logic] ?? SYMBOLS.walkable;

      ctx.fillStyle = lDef.color;
      ctx.fillRect(c * S, r * S, S, S);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(c * S, r * S, S, S);

      // Big symbol
      ctx.fillStyle = sym.fg;
      ctx.font = `bold ${sym.size}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym.sym, c * S + S / 2, r * S + S / 2 - (cell.object ? 4 : 0));

      // Object icon below (yellow, smaller)
      if (cell.object) {
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.textBaseline = 'bottom';
        ctx.fillText(OBJECTS[cell.object].icon, c * S + S / 2, r * S + S - 2);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.strokeRect(c * S, r * S, S, S);
    }
  }
  drawSelection(ctx);
}

// ── Selection highlight ──

function drawSelection(ctx: CanvasRenderingContext2D): void {
  if (!state.selectedCell) return;
  const S = CELL_SIZE;
  ctx.strokeStyle = '#f0c060';
  ctx.lineWidth = 3;
  ctx.strokeRect(state.selectedCell.c * S + 1, state.selectedCell.r * S + 1, S - 2, S - 2);
  ctx.lineWidth = 1;
}

// ── Selected cell info panel ──

function updateSelectedInfo(): void {
  const el = document.getElementById('edSelected');
  if (!el) return;
  if (!state.selectedCell) { el.innerHTML = 'Click a cell'; return; }
  const { r, c } = state.selectedCell;
  const cell = state.cells[r][c];
  const lDef = LOGIC[cell.logic];
  const v = cell.visuals;
  el.innerHTML = `
    <div>(<strong>${c}</strong>, <strong>${r}</strong>)</div>
    <div style="margin-top:4px;font-size:0.75rem;">
      Logic: <span style="color:${lDef.color};font-weight:bold;">${cell.logic}</span>
    </div>
    <div style="font-size:0.75rem;">
      Object: <span style="color:var(--accent);">${cell.object || '—'}</span>
    </div>
    <div style="font-size:0.7rem;color:var(--text-dim);margin-top:4px;border-top:1px solid var(--border);padding-top:4px;">
      <div style="color:#2ecc71;">Ground: <code>${v.ground || '—'}</code></div>
      <div style="color:#e67e22;">Structure: <code>${v.structure || '—'}</code></div>
      <div style="color:#9b59b6;">Decoration: <code>${v.decoration || '—'}</code></div>
    </div>
    <button id="edClearVisuals" style="margin-top:4px;padding:2px 6px;border:1px solid var(--border);border-radius:3px;background:var(--bg-dark);color:var(--text);cursor:pointer;font-size:0.7rem;">Clear all visuals</button>
  `;
  setTimeout(() => {
    const btn = document.getElementById('edClearVisuals');
    if (btn) btn.onclick = () => {
      cell.visuals = { ground: null, structure: null, decoration: null };
      renderAll();
    };
  }, 0);
}
