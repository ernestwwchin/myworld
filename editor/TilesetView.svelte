<script lang="ts">
  import { onMount } from 'svelte';
  import * as editorState from './state';
  import { buildPalette } from './controls';
  import { renderAll } from './renderer';

  const SHEET_PATH = '/assets/vendor/0x72_dungeon/0x72_DungeonTilesetII_v1.7/0x72_DungeonTilesetII_v1.7.png';
  const ATLAS_PATH = '/assets/vendor/0x72_dungeon/0x72_dungeon.json';
  const TILE = 16;  // native tile size in sheet
  let scale = $state(2);  // display scale (adjustable)
  let S = $derived(TILE * scale); // displayed tile size

  type AtlasFrame = { frame: { x: number; y: number; w: number; h: number } };
  type AtlasData = { frames: Record<string, AtlasFrame> };

  let canvas: HTMLCanvasElement;
  let sheetImg: HTMLImageElement | null = null;
  let atlas: AtlasData | null = null;

  // Grid lookup: map (gridCol, gridRow) → frame name for 16×16 tiles
  let gridLookup: Map<string, string> = new Map();

  // Selection state
  let selStart: { col: number; row: number } | null = null;
  let selEnd: { col: number; row: number } | null = null;
  let dragging = false;

  // Sheet dimensions in grid cells
  let sheetCols = 0;
  let sheetRows = 0;

  // Local display state (synced after selection changes)
  let infoText = $state('none');

  onMount(async () => {
    // Load atlas JSON
    const resp = await fetch(ATLAS_PATH);
    atlas = await resp.json();

    // Build grid lookup — include ALL frames, mapping each 16×16 sub-cell
    if (atlas) {
      // First pass: exact 16×16 frames get priority (they have individual PNGs)
      for (const [name, entry] of Object.entries(atlas.frames)) {
        const f = entry.frame;
        if (f.w === 16 && f.h === 16) {
          const col = Math.floor(f.x / TILE);
          const row = Math.floor(f.y / TILE);
          gridLookup.set(`${col},${row}`, name);
        }
      }
      // Second pass: larger frames — fill any unclaimed grid cells with crop refs
      for (const [, entry] of Object.entries(atlas.frames)) {
        const f = entry.frame;
        if (f.w === 16 && f.h === 16) continue; // already handled
        const startCol = Math.floor(f.x / TILE);
        const startRow = Math.floor(f.y / TILE);
        const cols = Math.ceil(f.w / TILE);
        const rows = Math.ceil(f.h / TILE);
        for (let dr = 0; dr < rows; dr++) {
          for (let dc = 0; dc < cols; dc++) {
            const key = `${startCol + dc},${startRow + dr}`;
            if (!gridLookup.has(key)) {
              // Crop reference: _crop:{px},{py} — top-left pixel of the 16×16 region
              const px = (startCol + dc) * TILE;
              const py = (startRow + dr) * TILE;
              gridLookup.set(key, `_crop:${px},${py}`);
            }
          }
        }
      }
    }

    // Load spritesheet image
    sheetImg = new Image();
    sheetImg.onload = () => {
      sheetCols = Math.floor(sheetImg!.width / TILE);
      sheetRows = Math.floor(sheetImg!.height / TILE);
      draw();
    };
    sheetImg.src = SHEET_PATH;
  });

  function draw() {
    if (!canvas || !sheetImg) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = sheetImg.width * scale;
    canvas.height = sheetImg.height * scale;
    ctx.imageSmoothingEnabled = false;

    // Draw spritesheet scaled up
    ctx.drawImage(sheetImg, 0, 0, canvas.width, canvas.height);

    // Dim empty regions (no atlas frame covers this cell)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    for (let row = 0; row < sheetRows; row++) {
      for (let col = 0; col < sheetCols; col++) {
        const key = `${col},${row}`;
        if (!gridLookup.has(key)) {
          ctx.fillRect(col * S, row * S, S, S);
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += S) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += S) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }

    // Draw selection rectangle
    if (selStart && selEnd) {
      const minCol = Math.min(selStart.col, selEnd.col);
      const maxCol = Math.max(selStart.col, selEnd.col);
      const minRow = Math.min(selStart.row, selEnd.row);
      const maxRow = Math.max(selStart.row, selEnd.row);

      // Highlight selected cells
      ctx.fillStyle = 'rgba(240, 192, 96, 0.3)';
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          ctx.fillRect(c * S, r * S, S, S);
        }
      }

      // Selection border
      ctx.strokeStyle = '#f0c060';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(minCol * S, minRow * S, (maxCol - minCol + 1) * S, (maxRow - minRow + 1) * S);
      ctx.setLineDash([]);
    }

    // Highlight single-selected tile (from palette)
    if (!selStart && editorState.selectedSprite && atlas) {
      const entry = atlas.frames[editorState.selectedSprite];
      if (entry && entry.frame.w === 16 && entry.frame.h === 16) {
        const col = Math.floor(entry.frame.x / TILE);
        const row = Math.floor(entry.frame.y / TILE);
        ctx.strokeStyle = '#f0c060';
        ctx.lineWidth = 2;
        ctx.strokeRect(col * S, row * S, S, S);
      }
    }
  }

  function getGridCell(e: MouseEvent): { col: number; row: number } | null {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const col = Math.floor((e.clientX - rect.left) * sx / S);
    const row = Math.floor((e.clientY - rect.top) * sy / S);
    if (col >= 0 && col < sheetCols && row >= 0 && row < sheetRows) {
      return { col, row };
    }
    return null;
  }

  function onMouseDown(e: MouseEvent) {
    const cell = getGridCell(e);
    if (!cell) return;
    e.preventDefault();
    dragging = true;
    selStart = cell;
    selEnd = cell;
    draw();
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging || !selStart) return;
    const cell = getGridCell(e);
    if (cell) {
      selEnd = cell;
      draw();
    }
  }

  function onMouseUp(e: MouseEvent) {
    if (!dragging || !selStart) return;
    dragging = false;
    const cell = getGridCell(e);
    if (cell) selEnd = cell;
    applySelection();
  }

  function applySelection() {
    if (!selStart || !selEnd) return;

    const minCol = Math.min(selStart.col, selEnd.col);
    const maxCol = Math.max(selStart.col, selEnd.col);
    const minRow = Math.min(selStart.row, selEnd.row);
    const maxRow = Math.max(selStart.row, selEnd.row);

    // Single tile
    if (minCol === maxCol && minRow === maxRow) {
      const name = gridLookup.get(`${minCol},${minRow}`) || null;
      if (name) {
        editorState.setSelectedSprite(name);
        buildPalette(); // sync the grid palette highlight
        updateInfo();
        draw();
      } else {
        // Clicked a non-tile cell, deselect
        selStart = null;
        selEnd = null;
        editorState.setSelectedSprite(null);
        buildPalette();
        updateInfo();
        draw();
      }
      return;
    }

    // Multi-tile selection — build 2D array of frame names
    const sprites: (string | null)[][] = [];
    let hasAny = false;
    for (let r = minRow; r <= maxRow; r++) {
      const row: (string | null)[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const name = gridLookup.get(`${c},${r}`) || null;
        row.push(name);
        if (name) hasAny = true;
      }
      sprites.push(row);
    }

    if (hasAny) {
      editorState.setSelectedSprites(sprites);
      buildPalette();
      updateInfo();
    }
    draw();
  }

  // Redraw when parent calls refresh
  export function refresh() { draw(); updateInfo(); }

  function updateInfo() {
    if (editorState.selectedSprites) {
      infoText = `${editorState.selectedSprites.length}×${editorState.selectedSprites[0]?.length || 0} tiles`;
    } else if (editorState.selectedSprite) {
      infoText = editorState.selectedSprite;
    } else {
      infoText = 'none';
    }
  }
</script>

<div class="tileset-view">
  <div class="tileset-header">
    <span class="tileset-label">Tileset — click or drag to select</span>
    <span class="tileset-info">{infoText}</span>
  </div>
  <div class="zoom-row">
    <label class="zoom-label">Zoom:</label>
    <input type="range" min="1" max="4" step="0.5" bind:value={scale} oninput={() => draw()} class="zoom-slider" />
    <span class="zoom-val">{scale}×</span>
  </div>
  <div class="tileset-scroll">
    <canvas
      bind:this={canvas}
      class="tileset-canvas"
      onmousedown={onMouseDown}
      onmousemove={onMouseMove}
      onmouseup={onMouseUp}
      onmouseleave={() => { if (dragging) { dragging = false; applySelection(); } }}
      oncontextmenu={(e) => e.preventDefault()}
    ></canvas>
  </div>
</div>

<style>
  .tileset-view {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tileset-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
  }
  .tileset-label {
    color: var(--accent);
    font-weight: 600;
  }
  .tileset-info {
    color: var(--text-dim);
    font-size: 0.65rem;
  }
  .tileset-scroll {
    overflow: auto;
    max-height: 60vh;
    min-height: 200px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: #111318;
  }
  .tileset-canvas {
    image-rendering: pixelated;
    cursor: crosshair;
    display: block;
  }
  .zoom-row {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.7rem;
    color: var(--text-dim);
  }
  .zoom-label { flex-shrink: 0; }
  .zoom-slider { flex: 1; height: 14px; cursor: pointer; }
  .zoom-val { min-width: 24px; text-align: right; }
</style>
