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
  renderCanvas();
  updateSelectedInfo();
}

// ── Single composited canvas ──

export function renderCanvas(): void {
  const canvas = document.getElementById('edCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const S = CELL_SIZE;
  canvas.width = state.gridW * S;
  canvas.height = state.gridH * S;
  ctx.imageSmoothingEnabled = false;

  const groundLayer = state.getLayer('ground');
  const structureLayer = state.getLayer('structure');
  const decorationLayer = state.getLayer('decoration');
  const objectsLayer = state.getLayer('objects');
  const logicLayer = state.getLayer('logic');

  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const cell = state.cells[r][c];

      // Background fill
      ctx.fillStyle = '#1a1d24';
      ctx.fillRect(c * S, r * S, S, S);

      // Layer 1: Ground
      if (groundLayer?.visible && cell.visuals.ground) {
        ctx.globalAlpha = groundLayer.opacity;
        const img = getCachedImg(cell.visuals.ground);
        if (img) ctx.drawImage(img, c * S, r * S, S, S);
        ctx.globalAlpha = 1;
      }

      // Layer 2: Structure
      if (structureLayer?.visible && cell.visuals.structure) {
        ctx.globalAlpha = structureLayer.opacity;
        const img = getCachedImg(cell.visuals.structure);
        if (img) ctx.drawImage(img, c * S, r * S, S, S);
        ctx.globalAlpha = 1;
      }

      // Layer 3: Decoration
      if (decorationLayer?.visible && cell.visuals.decoration) {
        ctx.globalAlpha = decorationLayer.opacity;
        const img = getCachedImg(cell.visuals.decoration);
        if (img) ctx.drawImage(img, c * S, r * S, S, S);
        ctx.globalAlpha = 1;
      }

      // Layer 4: Objects
      if (objectsLayer?.visible && cell.object) {
        ctx.globalAlpha = objectsLayer.opacity;

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

        ctx.globalAlpha = 1;
      }

      // Layer 5: Logic overlay (always rendered, opacity adjustable)
      if (logicLayer?.visible && logicLayer.opacity > 0) {
        const lDef = LOGIC[cell.logic];
        ctx.globalAlpha = logicLayer.opacity;
        ctx.fillStyle = lDef.color;
        ctx.fillRect(c * S, r * S, S, S);
        ctx.globalAlpha = 1;
      }

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeRect(c * S, r * S, S, S);
    }
  }

  // Connection point indicators (only when logic layer is visible)
  const logicVis = state.getLayer('logic');
  if (logicVis?.visible && logicVis.opacity > 0) {
    drawConnectionPoints(ctx);
  }

  // Rectangle tool preview
  drawRectPreview(ctx);

  // Selection box
  drawSelection(ctx);
}

// ── Connector edge indicators ──
// Green = open connector (edge walkable, corridor attaches directly)
// Blue = doorable connector (edge blocked, generator breaks wall + places door)

function drawConnectionPoints(ctx: CanvasRenderingContext2D): void {
  const S = CELL_SIZE;

  const drawIndicator = (r: number, c: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(c * S + 2, r * S + 2, S - 4, S - 4);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(c * S + 1, r * S + 1, S - 2, S - 2);
    ctx.lineWidth = 1;
  };

  type EdgeEntry = { index: number; type: 'open' | 'doorable' };

  const collectEdge = (
    interiorR: (i: number) => number, interiorC: (i: number) => number,
    edgeR: (i: number) => number, edgeC: (i: number) => number,
    count: number, start: number,
  ): EdgeEntry[] => {
    const entries: EdgeEntry[] = [];
    for (let i = start; i < count - 2; i++) {
      const ir = interiorR(i), ic = interiorC(i);
      if (ir < 0 || ir >= state.gridH || ic < 0 || ic >= state.gridW) continue;
      if (LOGIC[state.cells[ir][ic].logic].blocked) continue;
      // Interior is walkable — check edge cell
      const er = edgeR(i), ec = edgeC(i);
      if (er < 0 || er >= state.gridH || ec < 0 || ec >= state.gridW) continue;
      const edgeBlocked = LOGIC[state.cells[er][ec].logic].blocked;
      entries.push({ index: i, type: edgeBlocked ? 'doorable' : 'open' });
    }
    return entries;
  };

  const renderEdge = (entries: EdgeEntry[], side: string) => {
    // Group into runs of same type
    const runs: { type: 'open' | 'doorable'; indices: number[] }[] = [];
    let current: { type: 'open' | 'doorable'; indices: number[] } | null = null;
    for (const e of entries) {
      if (current && current.type === e.type && e.index === current.indices[current.indices.length - 1] + 1) {
        current.indices.push(e.index);
      } else {
        if (current) runs.push(current);
        current = { type: e.type, indices: [e.index] };
      }
    }
    if (current) runs.push(current);

    for (const run of runs) {
      const bright = run.indices.length >= 3;
      const alpha = bright ? 0.6 : 0.35;
      const color = run.type === 'open'
        ? `rgba(34,197,94,${alpha})`    // green
        : `rgba(56,189,248,${alpha})`;  // blue
      for (const pos of run.indices) {
        const override = state.connectOverrides.find(o => o.side === side && o.index === pos);
        if (override !== undefined) {
          if (override.forced) drawIndicator(
            side === 'north' ? 0 : side === 'south' ? state.gridH - 1 : pos,
            side === 'west' ? 0 : side === 'east' ? state.gridW - 1 : pos,
            'rgba(34,197,94,0.7)'
          );
          continue;
        }
        if (side === 'north') drawIndicator(0, pos, color);
        else if (side === 'south') drawIndicator(state.gridH - 1, pos, color);
        else if (side === 'west') drawIndicator(pos, 0, color);
        else if (side === 'east') drawIndicator(pos, state.gridW - 1, color);
      }
    }
  };

  // North: interior=row 2, edge=row 0
  renderEdge(collectEdge(
    () => 2, (i) => i, () => 0, (i) => i, state.gridW, 2,
  ), 'north');

  // South: interior=row gridH-3, edge=row gridH-1
  renderEdge(collectEdge(
    () => state.gridH - 3, (i) => i, () => state.gridH - 1, (i) => i, state.gridW, 2,
  ), 'south');

  // West: interior=col 2, edge=col 0
  renderEdge(collectEdge(
    (i) => i, () => 2, (i) => i, () => 0, state.gridH, 2,
  ), 'west');

  // East: interior=col gridW-3, edge=col gridW-1
  renderEdge(collectEdge(
    (i) => i, () => state.gridW - 3, (i) => i, () => state.gridW - 1, state.gridH, 2,
  ), 'east');
}

// ── Rectangle tool preview ──

function drawRectPreview(ctx: CanvasRenderingContext2D): void {
  if (!state.rectPreview) return;
  const S = CELL_SIZE;
  const { startR, startC, endR, endC } = state.rectPreview;
  const minR = Math.min(startR, endR);
  const maxR = Math.max(startR, endR);
  const minC = Math.min(startC, endC);
  const maxC = Math.max(startC, endC);
  ctx.strokeStyle = '#f0c060';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(minC * S, minR * S, (maxC - minC + 1) * S, (maxR - minR + 1) * S);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}

// ── Selection highlight ──

function drawSelection(ctx: CanvasRenderingContext2D): void {
  if (state.selectedCell) {
    const S = CELL_SIZE;
    ctx.strokeStyle = '#f0c060';
    ctx.lineWidth = 3;
    ctx.strokeRect(state.selectedCell.c * S + 1, state.selectedCell.r * S + 1, S - 2, S - 2);
    ctx.lineWidth = 1;
  }

  if (state.selection) {
    const S = CELL_SIZE;
    const { startR, startC, endR, endC } = state.selection;
    const minR = Math.min(startR, endR);
    const maxR = Math.max(startR, endR);
    const minC = Math.min(startC, endC);
    const maxC = Math.max(startC, endC);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(minC * S, minR * S, (maxC - minC + 1) * S, (maxR - minR + 1) * S);
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  }
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
