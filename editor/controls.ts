import { TILE_BASE, PALETTE_MAP, ALL_TILES, LOGIC } from './data';
import { CELL_SIZE } from './data';
import { renderAll } from './renderer';
import * as state from './state';
import type { LogicType, ObjectType, VisualLayer } from './types';

// ── Cell coordinate from mouse event ──

export function getCellFromEvent(canvas: HTMLCanvasElement, e: MouseEvent): { r: number; c: number } | null {
  const S = CELL_SIZE;
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const c = Math.floor((e.clientX - rect.left) * sx / S);
  const r = Math.floor((e.clientY - rect.top) * sy / S);
  if (r >= 0 && r < state.gridH && c >= 0 && c < state.gridW) return { r, c };
  return null;
}

// ── Apply paint to a cell based on active layer ──

export function applyPaint(r: number, c: number): void {
  const layer = state.activeLayer;

  if (layer === 'logic') {
    state.cells[r][c].logic = state.paintLogic;
  } else if (layer === 'objects') {
    state.cells[r][c].object = (state.paintObject || null) as ObjectType | null;
  } else {
    // Visual layer (ground/structure/decoration)
    if (state.selectedSprite !== null) {
      state.cells[r][c].visuals[state.activeVisualLayer] = state.selectedSprite || null;
    }
  }
}

// ── Apply multi-tile brush starting at (r,c) ──

export function applyMultiPaint(r: number, c: number): void {
  const sprites = state.selectedSprites;
  if (!sprites || sprites.length === 0) {
    applyPaint(r, c);
    return;
  }
  const layer = state.activeLayer;
  if (layer === 'logic' || layer === 'objects') {
    applyPaint(r, c);
    return;
  }
  const vl = state.activeVisualLayer;
  for (let dr = 0; dr < sprites.length; dr++) {
    for (let dc = 0; dc < sprites[dr].length; dc++) {
      const tr = r + dr;
      const tc = c + dc;
      if (tr >= 0 && tr < state.gridH && tc >= 0 && tc < state.gridW && sprites[dr][dc] !== null) {
        state.cells[tr][tc].visuals[vl] = sprites[dr][dc];
      }
    }
  }
}

// ── Apply tiled multi-paint over a region ──

function applyTiledPaint(r: number, c: number, originR: number, originC: number): void {
  const sprites = state.selectedSprites;
  if (!sprites || sprites.length === 0 || state.activeLayer === 'logic' || state.activeLayer === 'objects') {
    applyPaint(r, c);
    return;
  }
  const rows = sprites.length;
  const cols = sprites[0].length;
  const dr = ((r - originR) % rows + rows) % rows;
  const dc = ((c - originC) % cols + cols) % cols;
  const tile = sprites[dr][dc];
  if (tile !== null) {
    state.cells[r][c].visuals[state.activeVisualLayer] = tile;
  }
}

// ── Fill the current selection with the active paint ──

export function fillSelection(): void {
  const sel = state.selection;
  if (!sel) return;
  state.pushUndo();
  const minR = Math.min(sel.startR, sel.endR);
  const maxR = Math.max(sel.startR, sel.endR);
  const minC = Math.min(sel.startC, sel.endC);
  const maxC = Math.max(sel.startC, sel.endC);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (r >= 0 && r < state.gridH && c >= 0 && c < state.gridW) {
        applyTiledPaint(r, c, minR, minC);
      }
    }
  }
  renderAll();
}

// ── Erase a cell on the active layer ──

export function applyErase(r: number, c: number): void {
  const layer = state.activeLayer;

  if (layer === 'logic') {
    state.cells[r][c].logic = 'walkable';
  } else if (layer === 'objects') {
    state.cells[r][c].object = null;
  } else {
    state.cells[r][c].visuals[state.activeVisualLayer] = null;
  }
}

// ── Flood fill on active layer ──

export function floodFill(startR: number, startC: number): void {
  const layer = state.activeLayer;
  const visited = new Set<string>();
  const queue: [number, number][] = [[startR, startC]];

  if (layer === 'logic') {
    const targetLogic = state.cells[startR][startC].logic;
    if (targetLogic === state.paintLogic) return;

    while (queue.length > 0) {
      const [r, c] = queue.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      if (r < 0 || r >= state.gridH || c < 0 || c >= state.gridW) continue;
      if (state.cells[r][c].logic !== targetLogic) continue;
      visited.add(key);
      state.cells[r][c].logic = state.paintLogic;
      queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
  } else if (layer === 'objects') {
    // Fill doesn't apply to objects
    return;
  } else {
    const vl = state.activeVisualLayer;
    const targetSprite = state.cells[startR][startC].visuals[vl];
    const sprites = state.selectedSprites;
    const newSprite = state.selectedSprite;
    if (!sprites && targetSprite === newSprite) return;

    // Collect all cells that match the target first
    const cells: [number, number][] = [];
    while (queue.length > 0) {
      const [r, c] = queue.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      if (r < 0 || r >= state.gridH || c < 0 || c >= state.gridW) continue;
      if (state.cells[r][c].visuals[vl] !== targetSprite) continue;
      visited.add(key);
      cells.push([r, c]);
      queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }

    // Apply paint — tile multi-sprite pattern from top-left of collected region
    if (sprites && sprites.length > 0) {
      let oR = startR, oC = startC;
      for (const [r, c] of cells) { oR = Math.min(oR, r); oC = Math.min(oC, c); }
      for (const [r, c] of cells) {
        applyTiledPaint(r, c, oR, oC);
      }
    } else {
      for (const [r, c] of cells) {
        state.cells[r][c].visuals[vl] = newSprite;
      }
    }
  }
}

// ── Fill rectangle region ──

export function fillRect(startR: number, startC: number, endR: number, endC: number): void {
  const minR = Math.min(startR, endR);
  const maxR = Math.max(startR, endR);
  const minC = Math.min(startC, endC);
  const maxC = Math.max(startC, endC);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (r >= 0 && r < state.gridH && c >= 0 && c < state.gridW) {
        applyTiledPaint(r, c, minR, minC);
      }
    }
  }
}

// ── Palette builder ──

export function buildPalette(): void {
  const el = document.getElementById('edPalette');
  if (!el) return;
  const filter = (document.getElementById('edPalFilter') as HTMLSelectElement | null)?.value || 'floor';
  const tiles = PALETTE_MAP[filter] || ALL_TILES;

  const layerColors: Record<string, string> = { ground: '#60a5fa', structure: '#e67e22', decoration: '#9b59b6' };
  const layerColor = layerColors[state.activeVisualLayer] || '#aaa';

  el.innerHTML = tiles.map((name, idx) => {
    const selected = state.selectedSprite === name;
    return `
    <div class="pal-tile" data-tile="${name}" data-idx="${idx}" title="${name}"
         style="text-align:center;cursor:pointer;padding:3px;border:2px solid ${selected ? layerColor : 'var(--border)'};border-radius:3px;background:${selected ? 'rgba(96,165,250,0.12)' : 'var(--bg-dark)'}">
      <img src="${TILE_BASE}${name}.png" style="image-rendering:pixelated;width:28px;height:28px;display:block;margin:0 auto;background:#1a1d24;" draggable="false">
      <div style="font-size:0.5rem;color:var(--text-dim);margin-top:1px;word-break:break-all;line-height:1;">
        ${name.replace(/^(wall_|floor_)/, '').replace(/_/g, ' ')}
      </div>
    </div>`;
  }).join('') + `
    <div class="pal-tile" data-tile="" data-idx="-1" title="Clear this layer"
         style="text-align:center;cursor:pointer;padding:3px;border:1px solid var(--border);border-radius:3px;background:var(--bg-dark);">
      <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;margin:0 auto;color:#e74c3c;font-size:16px;">✕</div>
      <div style="font-size:0.5rem;color:var(--text-dim);margin-top:1px;">clear</div>
    </div>
  `;

  el.querySelectorAll<HTMLElement>('.pal-tile').forEach(tile => {
    tile.onclick = () => {
      const val = tile.dataset.tile || null;
      const idx = parseInt(tile.dataset.idx || '-1');

      if (idx === -1) {
        state.setSelectedSprite(null);
        buildPalette();
        return;
      }

      // Toggle single selection
      if (state.selectedSprite === val) {
        state.setSelectedSprite(null);
      } else {
        state.setSelectedSprite(val);
      }
      buildPalette();
    };
  });
}

// ── Canvas event setup (single canvas) ──

let painting = false;
let rectStart: { r: number; c: number } | null = null;

export function setupCanvasEvents(): void {
  const canvas = document.getElementById('edCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  canvas.onmousedown = (e) => {
    const cell = getCellFromEvent(canvas, e);
    if (!cell) return;
    e.preventDefault();
    state.setSelectedCell(cell);

    if (e.button !== 0 || e.ctrlKey) {
      renderAll();
      return;
    }

    const tool = state.activeTool;

    if (tool === 'brush') {
      state.pushUndo();
      painting = true;
      applyMultiPaint(cell.r, cell.c);
      renderAll();
    } else if (tool === 'eraser') {
      state.pushUndo();
      painting = true;
      applyErase(cell.r, cell.c);
      renderAll();
    } else if (tool === 'fill') {
      state.pushUndo();
      floodFill(cell.r, cell.c);
      renderAll();
    } else if (tool === 'rectangle') {
      rectStart = cell;
      state.setRectPreview({ startR: cell.r, startC: cell.c, endR: cell.r, endC: cell.c });
      renderAll();
    } else if (tool === 'select') {
      state.setSelection({ startR: cell.r, startC: cell.c, endR: cell.r, endC: cell.c });
      renderAll();
    }
  };

  canvas.onmousemove = (e) => {
    const cell = getCellFromEvent(canvas, e);
    if (!cell) return;

    const tool = state.activeTool;

    if (painting && (tool === 'brush' || tool === 'eraser')) {
      if (tool === 'brush') applyMultiPaint(cell.r, cell.c);
      else applyErase(cell.r, cell.c);
      renderAll();
    } else if (rectStart && tool === 'rectangle') {
      state.setRectPreview({ startR: rectStart.r, startC: rectStart.c, endR: cell.r, endC: cell.c });
      renderAll();
    } else if (state.selection && tool === 'select' && e.buttons === 1) {
      state.setSelection({ ...state.selection, endR: cell.r, endC: cell.c });
      renderAll();
    }
  };

  canvas.onmouseup = (e) => {
    const cell = getCellFromEvent(canvas, e);

    if (state.activeTool === 'rectangle' && rectStart && cell) {
      state.pushUndo();
      fillRect(rectStart.r, rectStart.c, cell.r, cell.c);
      rectStart = null;
      state.setRectPreview(null);
      renderAll();
    }

    painting = false;
  };

  canvas.onmouseleave = () => {
    painting = false;
  };

  canvas.oncontextmenu = (e) => e.preventDefault();
}

// ── Keyboard shortcuts ──

export function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Tool shortcuts
    const toolMap: Record<string, import('./types').ToolType> = {
      b: 'brush', B: 'brush',
      e: 'eraser', E: 'eraser',
      g: 'fill', G: 'fill',
      r: 'rectangle', R: 'rectangle',
    };
    if (toolMap[e.key]) {
      state.setActiveTool(toolMap[e.key]);
      window.dispatchEvent(new CustomEvent('editor:tool-changed'));
      return;
    }
    if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
      state.setActiveTool('select');
      window.dispatchEvent(new CustomEvent('editor:tool-changed'));
      return;
    }

    // Fill selection (F)
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
      fillSelection();
      return;
    }

    // Layer shortcuts (1-5)
    if (e.key === '1') { state.setActiveLayer('ground'); return; }
    if (e.key === '2') { state.setActiveLayer('structure'); return; }
    if (e.key === '3') { state.setActiveLayer('decoration'); return; }
    if (e.key === '4') { state.setActiveLayer('objects'); return; }
    if (e.key === '5') { state.setActiveLayer('logic'); return; }

    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (state.undo()) renderAll();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      if (state.redo()) renderAll();
      return;
    }

    // Delete selection
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selection) {
        state.pushUndo();
        const { startR, startC, endR, endC } = state.selection;
        const minR = Math.min(startR, endR), maxR = Math.max(startR, endR);
        const minC = Math.min(startC, endC), maxC = Math.max(startC, endC);
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            if (r >= 0 && r < state.gridH && c >= 0 && c < state.gridW) {
              applyErase(r, c);
            }
          }
        }
        renderAll();
      }
    }
  });
}

// ── Stamp loader ──

import { ASCII_TO_OBJ } from './data';
import type { Stamp } from './types';

let editorReady = false;

export function ensureEditorReady(): void {
  if (editorReady) return;
  state.initGrid();
  setupCanvasEvents();
  setupKeyboardShortcuts();
  buildPalette();
  editorReady = true;
}

export async function loadStampIntoEditor(stamp: Stamp): Promise<void> {
  // Switch to Tile Editor tab
  document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-view="tileeditor"]')?.classList.add('active');
  document.getElementById('tileeditorView')?.classList.add('active');

  if (!editorReady) {
    setupCanvasEvents();
    setupKeyboardShortcuts();
    buildPalette();
    editorReady = true;
  }

  state.setLastLoadedStamp(stamp);
  state.clearHistory();
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
      } else {
        state.cells[r][c] = state.makeCell('void');
      }
    }
  }

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

  // Notify Svelte components that a stamp was loaded
  window.dispatchEvent(new CustomEvent('editor:stamp-loaded', {
    detail: { w: state.gridW, h: state.gridH, name: state.stampName },
  }));
}
