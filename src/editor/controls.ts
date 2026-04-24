import { TILE_BASE, PALETTE_MAP, ALL_TILES } from './data';
import { CELL_SIZE } from './data';
import { renderAll } from './renderer';
import * as state from './state';
import type { LogicType, ObjectType, VisualLayer } from './types';

let painting = false;

// ── Palette builder ──

export function buildPalette(): void {
  const el = document.getElementById('edPalette');
  if (!el) return;
  const filter = (document.getElementById('edPalFilter') as HTMLSelectElement | null)?.value || 'floor';
  const tiles = PALETTE_MAP[filter] || ALL_TILES;

  const layerColors: Record<string, string> = { ground: '#2ecc71', structure: '#e67e22', decoration: '#9b59b6' };
  const layerColor = layerColors[state.activeVisualLayer] || '#aaa';

  el.innerHTML = tiles.map(name => `
    <div class="pal-tile" data-tile="${name}" title="${name}"
         style="text-align:center;cursor:pointer;padding:3px;border:1px solid ${state.selectedSprite === name ? layerColor : 'var(--border)'};border-radius:3px;background:var(--bg-dark);${state.selectedSprite === name ? 'box-shadow:0 0 4px ' + layerColor + ';' : ''}">
      <img src="${TILE_BASE}${name}.png" style="image-rendering:pixelated;width:28px;height:28px;display:block;margin:0 auto;background:#1a1d24;">
      <div style="font-size:0.5rem;color:var(--text-dim);margin-top:1px;word-break:break-all;line-height:1;">
        ${name.replace(/^(wall_|floor_)/, '').replace(/_/g, ' ')}
      </div>
    </div>
  `).join('') + `
    <div class="pal-tile" data-tile="" title="Clear this layer"
         style="text-align:center;cursor:pointer;padding:3px;border:1px solid var(--border);border-radius:3px;background:var(--bg-dark);">
      <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;margin:0 auto;color:#e74c3c;font-size:16px;">✕</div>
      <div style="font-size:0.5rem;color:var(--text-dim);margin-top:1px;">clear</div>
    </div>
  `;

  el.querySelectorAll<HTMLElement>('.pal-tile').forEach(tile => {
    tile.onclick = () => {
      const val = tile.dataset.tile || null;
      state.setSelectedSprite(state.selectedSprite === val ? null : val);
      buildPalette();
    };
  });
}

// ── Tile canvas events (paint visuals / place objects) ──

export function setupTileCanvasEvents(): void {
  const canvas = document.getElementById('edTileCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const S = CELL_SIZE;

  const getCell = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const c = Math.floor((e.clientX - rect.left) * sx / S);
    const r = Math.floor((e.clientY - rect.top) * sy / S);
    if (r >= 0 && r < state.gridH && c >= 0 && c < state.gridW) return { r, c };
    return null;
  };

  function applyTilePaint(r: number, c: number) {
    if (state.selectedSprite !== null) {
      state.cells[r][c].visuals[state.activeVisualLayer] = state.selectedSprite || null;
    } else {
      state.cells[r][c].object = (state.paintObject || null) as ObjectType | null;
    }
  }

  canvas.onmousedown = (e) => {
    const cell = getCell(e);
    if (!cell) return;
    e.preventDefault();
    state.setSelectedCell(cell);
    if (e.button === 0 && !e.ctrlKey) {
      painting = true;
      applyTilePaint(cell.r, cell.c);
    }
    renderAll();
  };
  canvas.onmousemove = (e) => {
    if (!painting) return;
    const cell = getCell(e);
    if (cell) { applyTilePaint(cell.r, cell.c); renderAll(); }
  };
  canvas.onmouseup = () => painting = false;
  canvas.onmouseleave = () => painting = false;
  canvas.oncontextmenu = (e) => e.preventDefault();
}

// ── Logic canvas events ──

export function setupLogicCanvasEvents(): void {
  const canvas = document.getElementById('edLogicCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const S = CELL_SIZE;

  const getCell = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const c = Math.floor((e.clientX - rect.left) * sx / S);
    const r = Math.floor((e.clientY - rect.top) * sy / S);
    if (r >= 0 && r < state.gridH && c >= 0 && c < state.gridW) return { r, c };
    return null;
  };
  const isBorder = (r: number, c: number) => r <= 1 || r >= state.gridH - 2 || c <= 1 || c >= state.gridW - 2;

  canvas.onmousedown = (e) => {
    const cell = getCell(e);
    if (!cell) return;
    if (e.button === 2 || e.ctrlKey) {
      e.preventDefault();
      state.setSelectedCell(cell);
      renderAll();
      return;
    }
    if (isBorder(cell.r, cell.c) && state.paintLogic !== 'blocked' && state.paintLogic !== 'void') return;
    painting = true;
    state.cells[cell.r][cell.c].logic = state.paintLogic;
    state.setSelectedCell(cell);
    renderAll();
  };
  canvas.onmousemove = (e) => {
    if (!painting) return;
    const cell = getCell(e);
    if (cell) {
      if (isBorder(cell.r, cell.c) && state.paintLogic !== 'blocked' && state.paintLogic !== 'void') return;
      state.cells[cell.r][cell.c].logic = state.paintLogic;
      renderAll();
    }
  };
  canvas.onmouseup = () => painting = false;
  canvas.onmouseleave = () => painting = false;
  canvas.oncontextmenu = (e) => e.preventDefault();
}

// ── Toolbar wiring ──

export function setupToolbar(): void {
  // Logic buttons
  document.querySelectorAll<HTMLButtonElement>('.logic-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll<HTMLButtonElement>('.logic-btn').forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = 'var(--border)';
        b.style.color = 'var(--text)';
      });
      btn.classList.add('active');
      btn.style.borderColor = 'var(--accent)';
      btn.style.color = 'var(--accent)';
      state.setPaintLogic(btn.dataset.logic as LogicType);
    };
  });

  // Object buttons
  document.querySelectorAll<HTMLButtonElement>('.obj-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll<HTMLButtonElement>('.obj-btn').forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = 'var(--border)';
        b.style.color = 'var(--text)';
      });
      btn.classList.add('active');
      btn.style.borderColor = 'var(--accent)';
      btn.style.color = 'var(--accent)';
      state.setPaintObject((btn.dataset.obj || '') as ObjectType | '');
      state.setSelectedSprite(null);
      buildPalette();
    };
  });

  // Palette filter
  const palFilter = document.getElementById('edPalFilter') as HTMLSelectElement | null;
  if (palFilter) palFilter.onchange = () => buildPalette();

  // Visual layer selector
  const layerSel = document.getElementById('edVisualLayer') as HTMLSelectElement | null;
  if (layerSel) layerSel.onchange = () => {
    state.setActiveVisualLayer(layerSel.value as VisualLayer);
    const filterMap: Record<string, string> = { ground: 'floor', structure: 'wall_basic', decoration: 'wall_deco' };
    if (palFilter) palFilter.value = filterMap[state.activeVisualLayer] || 'all';
    state.setSelectedSprite(null);
    buildPalette();
    renderAll();
  };

  // Resize
  document.getElementById('edResize')!.onclick = () => {
    const newW = Math.max(6, Math.min(40, parseInt((document.getElementById('edGridW') as HTMLInputElement).value) || 12));
    const newH = Math.max(6, Math.min(40, parseInt((document.getElementById('edGridH') as HTMLInputElement).value) || 12));
    state.resizeGrid(newW, newH);
    renderAll();
  };

  // Clear
  document.getElementById('edClear')!.onclick = () => { state.initGrid(); renderAll(); };

  // Reset stamp
  document.getElementById('edResetStamp')!.onclick = () => {
    if (state.lastLoadedStamp) loadStampIntoEditor(state.lastLoadedStamp);
  };
}

// ── Stamp loader (imported by catalog, wired by main) ──

import { ASCII_TO_OBJ } from './data';
import type { Stamp } from './types';

let editorReady = false;

export function ensureEditorReady(): void {
  if (editorReady) return;
  state.initGrid();
  setupTileCanvasEvents();
  setupLogicCanvasEvents();
  buildPalette();
  editorReady = true;
}

export async function loadStampIntoEditor(stamp: Stamp): Promise<void> {
  // Switch to Tile Editor tab
  document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-view="tileeditor"]')?.classList.add('active');
  document.getElementById('tileeditorView')?.classList.add('active');

  // Ensure canvas events wired up (but skip initGrid)
  if (!editorReady) {
    setupTileCanvasEvents();
    setupLogicCanvasEvents();
    buildPalette();
    editorReady = true;
  }

  state.setLastLoadedStamp(stamp);
  const rows = stamp.grid.split('\n');
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  state.setGridSize(w, h);
  state.setCells([]);
  state.setSelectedCell(null);
  state.setStampName(stamp.name || 'Untitled');

  for (let r = 0; r < h; r++) {
    state.cells[r] = [];
    for (let c = 0; c < w; c++) {
      const ch = (rows[r] || '')[c];
      if (ch && ASCII_TO_OBJ[ch]) {
        state.cells[r][c] = state.makeCell('walkable', ASCII_TO_OBJ[ch]);
      } else if (ch === '#') {
        state.cells[r][c] = state.makeCell('blocked');
      } else if (ch === '.' || ch === '·') {
        state.cells[r][c] = state.makeCell('walkable');
      } else if (ch === 'D') {
        state.cells[r][c] = state.makeCell('doorable');
      } else {
        state.cells[r][c] = state.makeCell('void');
      }
    }
  }

  (document.getElementById('edGridW') as HTMLInputElement).value = String(w);
  (document.getElementById('edGridH') as HTMLInputElement).value = String(h);
  (document.getElementById('edName') as HTMLInputElement).value = state.stampName;

  if (stamp.visualLayers) {
    for (const [key, entry] of Object.entries(stamp.visualLayers)) {
      const [rs, cs] = key.split(',').map(Number);
      if (state.cells[rs]?.[cs]) {
        if (entry.ground) state.cells[rs][cs].visuals.ground = entry.ground;
        if (entry.structure) state.cells[rs][cs].visuals.structure = entry.structure;
        if (entry.decoration) state.cells[rs][cs].visuals.decoration = entry.decoration;
      }
    }
  } else {
    state.autoFillVisuals();
  }

  await renderAll();
}
