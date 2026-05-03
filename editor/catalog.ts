import { TILE_BASE, STAMP_TILE_MAP } from './data';
import { loadImg, getCachedImg, preloadAll } from './image-loader';
import { stampData } from './stamps';
import { loadStampIntoEditor } from './controls';
import { getAllStamps, deleteStamp, importStampsFromFile, exportAllStamps, downloadJSON } from './storage';
import type { TileDef, SpriteDef, AnimDef, SavedStamp } from './types';

// ── Loaded JSON data ──
let tilesData: Record<string, TileDef> = {};
let animsData: Record<string, AnimDef> = {};
let spritesData: Record<string, SpriteDef> = {};
let tileList: TileDef[] = [];
let spriteList: SpriteDef[] = [];
const activeAnimations = new Map<string, number>();

// ── Boot: load JSON catalogs ──
export async function loadCatalogData(): Promise<void> {
  const [tiles, anims, sprites] = await Promise.all([
    fetch('/scratch/tiles.json').then(r => r.json()),
    fetch('/scratch/animations.json').then(r => r.json()),
    fetch('/scratch/sprites.json').then(r => r.json()),
  ]);
  tilesData = tiles.tiles;
  animsData = anims.animations;
  spritesData = sprites.sprites;
  tileList = Object.values(tilesData);
  spriteList = Object.values(spritesData);
  console.log(`Loaded ${tileList.length} tiles, ${Object.keys(animsData).length} animation sets, ${spriteList.length} sprites`);
}

// ── Tile catalog ──
export function renderTiles(tiles?: TileDef[]): void {
  const list = tiles ?? tileList;
  const grid = document.getElementById('tileGrid');
  if (!grid) return;
  const counter = document.getElementById('tileCount');
  if (counter) counter.textContent = `${list.length} tiles`;

  if (list.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);">Loading tiles...</div>';
    return;
  }

  grid.innerHTML = list.map(tile => `
    <div class="tile-card">
      <div class="tile-preview">
        <img src="${TILE_BASE}${tile.id}.png" alt="${tile.id}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22><rect fill=%22%233e424f%22 width=%2216%22 height=%2216%22/><text x=%228%22 y=%2212%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2210%22>?</text></svg>'">
      </div>
      <div class="tile-name">${tile.id}</div>
      <div style="font-size:0.75rem;color:var(--text-dim);margin:4px 0;">
        ${tile.frame.w}×${tile.frame.h}px
        ${tile.mapRole ? ` · <span style="color:var(--accent);">${tile.mapRole}</span>` : ''}
      </div>
      <div style="font-size:0.75rem;margin:4px 0;">
        ${tile.walkable ? '<span style="color:#10b981;">✓ walkable</span>' : '<span style="color:#ef4444;">✗ blocked</span>'}
        ${tile.solid ? ' · <span style="color:#f59e0b;">solid</span>' : ''}
      </div>
      <div class="tile-tags">
        ${tile.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

// ── Character animations ──
function startAnimation(spriteKey: string, animType: string): void {
  if (activeAnimations.has(spriteKey)) clearInterval(activeAnimations.get(spriteKey)!);

  const animKey = `${spriteKey}_${animType}`;
  const animDef = animsData[animKey];
  if (!animDef) return;

  let frameIdx = 0;
  const animate = () => {
    const img = document.getElementById(`char_${spriteKey}`) as HTMLImageElement | null;
    if (img) {
      img.src = `${TILE_BASE}${animDef.playOrder[frameIdx]}.png`;
      frameIdx = (frameIdx + 1) % animDef.playOrder.length;
      if (!animDef.loop && frameIdx === 0) {
        clearInterval(activeAnimations.get(spriteKey)!);
        activeAnimations.delete(spriteKey);
      }
    }
  };
  const interval = window.setInterval(animate, 1000 / animDef.fps);
  activeAnimations.set(spriteKey, interval);
}

// expose globally for inline onclick
(window as any).playCharAnim = (spriteKey: string, animType: string, button: HTMLElement) => {
  const card = button.closest('.character-card');
  card?.querySelectorAll('.anim-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  startAnimation(spriteKey, animType);
};

export function renderCharacters(): void {
  const grid = document.getElementById('characterGrid');
  if (!grid) return;
  if (spriteList.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);">Loading sprites...</div>';
    return;
  }

  grid.innerHTML = spriteList.map(sprite => {
    const animBtns = sprite.animations.map((anim: string) => {
      const animKey = `${sprite.spriteKey}_${anim}`;
      const animDef = animsData[animKey];
      const fpsLabel = animDef ? `${animDef.fps}fps` : '';
      const frameLabel = animDef ? `${animDef.frameCount}f` : '';
      return `<button class="anim-btn ${anim === 'idle' ? 'active' : ''}"
                      onclick="playCharAnim('${sprite.spriteKey}','${anim}',this)"
                      title="${animKey}: ${frameLabel} @ ${fpsLabel}, ${animDef?.loop ? 'loop' : 'once'}">
                ${anim} <span style="font-size:0.65rem;color:var(--text-dim);">${fpsLabel}</span>
              </button>`;
    }).join('');

    return `
      <div class="character-card">
        <div class="character-preview">
          <img id="char_${sprite.spriteKey}"
               src="${TILE_BASE}${sprite.spriteKey}_idle_anim_f0.png"
               alt="${sprite.displayName}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2228%22><rect fill=%22%233e424f%22 width=%2216%22 height=%2228%22/><text x=%228%22 y=%2218%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2210%22>?</text></svg>'">
        </div>
        <div class="character-info">
          <div class="character-name">${sprite.displayName}</div>
          <div style="font-size:0.85rem;color:var(--accent);margin-bottom:4px;">${sprite.race} · ${sprite.type}</div>
          <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px;">${sprite.pixelSize[0]}×${sprite.pixelSize[1]}px · grid ${sprite.gridSize} · ${sprite.size}</div>
          <div class="anim-controls">${animBtns}</div>
          <div style="font-size:0.75rem;color:var(--text-dim);margin-top:8px;">facing: ${sprite.facing} · flipX for left</div>
        </div>
      </div>`;
  }).join('');

  setTimeout(() => spriteList.forEach(s => startAnimation(s.spriteKey, 'idle')), 100);
}

// ── Stamp canvas renderer ──
function getWallTile(rows: string[], r: number, c: number): string {
  const isWall = (rr: number, cc: number) => {
    if (rr < 0 || rr >= rows.length) return true;
    if (cc < 0 || cc >= (rows[rr] || '').length) return true;
    const ch = rows[rr][cc];
    return ch === '#' || ch === ' ' || ch === undefined;
  };
  const isFloor = (rr: number, cc: number) => !isWall(rr, cc);
  const fN = isFloor(r - 1, c), fS = isFloor(r + 1, c), fW = isFloor(r, c - 1), fE = isFloor(r, c + 1);
  if (fS) { if (fW && !fE) return 'wall_right'; if (fE && !fW) return 'wall_left'; return 'wall_mid'; }
  if (fN) { if (fW && !fE) return 'wall_top_right'; if (fE && !fW) return 'wall_top_left'; return 'wall_top_mid'; }
  if (fE) return 'wall_top_left';
  if (fW) return 'wall_top_right';
  return 'wall_top_mid';
}

function getTileForChar(ch: string, row: number, col: number): string | null {
  const mapping = STAMP_TILE_MAP[ch];
  if (!mapping) return null;
  if (Array.isArray(mapping)) return mapping[(row * 7 + col * 13) % mapping.length];
  return mapping;
}

async function renderStampCanvas(canvasId: string, gridStr: string): Promise<void> {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const rows = gridStr.split('\n');
  const numRows = rows.length;
  const numCols = Math.max(...rows.map(r => r.length));
  const TILE_SIZE = 16;
  const maxCanvasWidth = 500;
  let scale = 2;
  if (numCols * TILE_SIZE * scale > maxCanvasWidth) scale = Math.max(1, Math.floor(maxCanvasWidth / (numCols * TILE_SIZE)));
  const s = TILE_SIZE * scale;
  canvas.width = numCols * s;
  canvas.height = numRows * s;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const wallTiles = [
    'wall_mid','wall_left','wall_right','wall_top_left','wall_top_mid','wall_top_right',
    'wall_edge_left','wall_edge_right','wall_edge_bottom_left','wall_edge_bottom_right',
    'wall_edge_top_left','wall_edge_top_right','wall_edge_tshape_left','wall_edge_tshape_right',
    'wall_outer_top_left','wall_outer_top_right','wall_outer_mid_left','wall_outer_mid_right',
  ];
  const neededTiles = new Set(wallTiles);
  for (let r = 0; r < numRows; r++) for (let c = 0; c < rows[r].length; c++) {
    const ch = rows[r][c]; if (ch === '#') continue;
    const tile = getTileForChar(ch, r, c); if (tile) neededTiles.add(tile);
  }
  await preloadAll(neededTiles);

  for (let r = 0; r < numRows; r++) for (let c = 0; c < rows[r].length; c++) {
    const ch = rows[r][c];
    if (ch === ' ' || ch === undefined) continue;
    if (ch !== '#') {
      const floorTile = getTileForChar('.', r, c);
      if (floorTile) { const img = getCachedImg(floorTile); if (img) ctx.drawImage(img, c * s, r * s, s, s); }
    }
    if (ch === '#') {
      const wallTile = getWallTile(rows, r, c);
      const img = getCachedImg(wallTile); if (img) ctx.drawImage(img, c * s, r * s, s, s);
    } else if (ch !== '.') {
      const tileName = getTileForChar(ch, r, c);
      if (tileName) { const img = getCachedImg(tileName); if (img) ctx.drawImage(img, c * s, r * s, s, s); }
    }
    // Overlays
    if (ch === '@') { ctx.fillStyle = 'rgba(239,68,68,0.6)'; ctx.beginPath(); ctx.moveTo(c*s+s/2,r*s+4); ctx.lineTo(c*s+s-4,r*s+s/2); ctx.lineTo(c*s+s/2,r*s+s-4); ctx.lineTo(c*s+4,r*s+s/2); ctx.closePath(); ctx.fill(); }
    else if (ch === 'W') { ctx.fillStyle = 'rgba(59,130,246,0.45)'; ctx.fillRect(c*s,r*s,s,s); }
    else if (ch === 'G') { ctx.fillStyle = 'rgba(16,185,129,0.4)'; ctx.fillRect(c*s,r*s,s,s); }
    else if (ch === 'T') { ctx.fillStyle = 'rgba(245,158,11,0.3)'; ctx.fillRect(c*s,r*s,s,s); }
    else if (ch === 'S') { ctx.fillStyle = 'rgba(139,92,246,0.35)'; ctx.fillRect(c*s,r*s,s,s); }
  }
}

// ── Stamp browser ──

let stampSearchQuery = '';
let stampCategoryFilter = 'all';

function getFilteredStamps(): SavedStamp[] {
  let stamps = getAllStamps();
  if (stampCategoryFilter !== 'all') {
    stamps = stamps.filter(s => (s.category || 'room') === stampCategoryFilter);
  }
  if (stampSearchQuery) {
    const q = stampSearchQuery.toLowerCase();
    stamps = stamps.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.tags || []).some(t => t.includes(q)) ||
      (s.theme || '').includes(q)
    );
  }
  return stamps;
}

export function renderStamps(stamps?: SavedStamp[]): void {
  const grid = document.getElementById('stampGrid');
  if (!grid) return;
  const list = stamps ?? getFilteredStamps();
  const counter = document.getElementById('stampCount');
  if (counter) counter.textContent = `${list.length} stamps`;

  grid.innerHTML = list.map((s, i) => {
    const canvasId = `stampCanvas_${i}`;
    const cat = s.category || 'room';
    const tags = (s.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');
    return `
    <div class="stamp-card" data-stamp-id="${s.id}">
      <div class="stamp-preview" style="flex-direction:column;align-items:center;">
        <canvas id="${canvasId}" style="image-rendering:pixelated;margin-bottom:8px;"></canvas>
        <details style="width:100%;"><summary style="cursor:pointer;font-size:0.75rem;color:var(--text-dim);">ASCII grid</summary>
          <pre style="margin-top:6px;">${s.grid}</pre></details>
      </div>
      <div class="stamp-info">
        <h4>${s.name}</h4>
        <span class="theme-badge theme-${s.theme || 'stone'}">${s.theme || 'stone'}</span>
        <span class="category-badge category-${cat}">${cat}</span>
        <div class="tile-tags">${tags}</div>
        <div class="stamp-meta"><div class="meta-item"><strong>Size:</strong> ${s.w}×${s.h}</div><div class="meta-item"><strong>Difficulty:</strong> ${s.difficulty ?? 0}</div></div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button class="edit-stamp-btn" data-stamp-id="${s.id}"
                  style="padding:4px 12px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-mid);color:var(--accent);cursor:pointer;font-size:0.8rem;flex:1;">
            ✏️ Edit
          </button>
          <button class="delete-stamp-btn" data-stamp-id="${s.id}"
                  style="padding:4px 12px;border:1px solid #e74c3c;border-radius:4px;background:var(--bg-mid);color:#e74c3c;cursor:pointer;font-size:0.8rem;">
            ✕
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  list.forEach((s, i) => renderStampCanvas(`stampCanvas_${i}`, s.grid));

  grid.querySelectorAll<HTMLButtonElement>('.edit-stamp-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.stampId!;
      const stamp = list.find(s => s.id === id);
      if (!stamp) return;
      // Switch to Tile Editor tab
      const edTab = document.querySelector<HTMLElement>('[data-view="tileeditor"]');
      if (edTab) edTab.click();
      // Load stamp into editor
      const asStamp = {
        name: stamp.name,
        size: `${stamp.w}x${stamp.h}`,
        tags: stamp.tags || [],
        grid: stamp.grid,
        difficulty: stamp.difficulty ?? 0,
        theme: stamp.theme || 'stone',
        category: stamp.category || 'room',
        visualLayers: stamp.visualLayers as any,
      };
      loadStampIntoEditor(asStamp);
      // Sync metadata
      const nameEl = document.getElementById('edName') as HTMLInputElement | null;
      if (nameEl) nameEl.value = stamp.name;
      const tagsEl = document.getElementById('edTags') as HTMLInputElement | null;
      if (tagsEl) tagsEl.value = (stamp.tags || []).join(', ');
      const diffEl = document.getElementById('edDifficulty') as HTMLSelectElement | null;
      if (diffEl) diffEl.value = String(stamp.difficulty ?? 0);
      const themeEl = document.getElementById('edTheme') as HTMLSelectElement | null;
      if (themeEl) themeEl.value = stamp.theme || 'stone';
      const catEl = document.getElementById('edCategory') as HTMLSelectElement | null;
      if (catEl) catEl.value = stamp.category || 'room';
      // Dispatch event for PalettePanel sync
      window.dispatchEvent(new CustomEvent('editor:stamp-loaded', {
        detail: { w: stamp.w, h: stamp.h, name: stamp.name },
      }));
    };
  });

  grid.querySelectorAll<HTMLButtonElement>('.delete-stamp-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.stampId!;
      const stamp = list.find(s => s.id === id);
      if (!stamp || !confirm(`Delete "${stamp.name}"?`)) return;
      deleteStamp(id);
      renderStamps();
    };
  });
}

// ── Autotile demo ──
export function initAutotileDemo(): void {
  const canvas = document.getElementById('paintCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const tileSize = 32, gridSize = 10;
  let map = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
  let paintMode = 1;

  document.getElementById('paintWall')!.onclick = () => paintMode = 1;
  document.getElementById('paintFloor')!.onclick = () => paintMode = 0;
  document.getElementById('clearCanvas')!.onclick = () => { map = Array.from({ length: gridSize }, () => Array(gridSize).fill(0)); render(); };

  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / tileSize);
    const y = Math.floor((e.clientY - rect.top) / tileSize);
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) { map[y][x] = paintMode; render(); }
  };

  function render() {
    ctx.fillStyle = '#1a1d24';
    ctx.fillRect(0, 0, canvas!.width, canvas!.height);
    for (let y = 0; y < gridSize; y++) for (let x = 0; x < gridSize; x++) {
      ctx.fillStyle = map[y][x] === 1 ? '#4a4e5a' : '#2d3139';
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      ctx.strokeStyle = '#3e424f';
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
  render();
}

// ── View tab switching ──
export function setupViewTabs(): void {
  document.querySelectorAll<HTMLElement>('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.view!;
      document.getElementById(`${view}View`)?.classList.add('active');

      // Toggle aside content: filters vs stamp library
      const filters = document.getElementById('asideFilters');
      const stampLib = document.getElementById('asideStampLibrary');
      if (filters) filters.style.display = view === 'tileeditor' ? 'none' : '';
      if (stampLib) stampLib.style.display = view === 'tileeditor' ? '' : 'none';

      if (view !== 'characters') {
        activeAnimations.forEach(interval => clearInterval(interval));
        activeAnimations.clear();
      } else if (spriteList.length > 0) {
        setTimeout(() => spriteList.forEach(s => startAnimation(s.spriteKey, 'idle')), 100);
      }
      if (view === 'autotile') initAutotileDemo();
      if (view === 'stamps') renderStamps();
    });
  });
}

// ── Filter + search wiring ──
export function setupFilters(): void {
  document.querySelectorAll<HTMLElement>('.filter-tags .tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.parentElement?.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      const filter = tag.dataset.filter;
      if (filter === 'all') renderTiles();
      else if (filter === 'walkable') renderTiles(tileList.filter(t => t.walkable));
      else if (filter === 'solid') renderTiles(tileList.filter(t => t.solid));
      else renderTiles(tileList.filter(t => t.category === filter || t.mapRole === filter || t.tags.includes(filter!)));
    });
  });

  const searchBox = document.getElementById('searchBox') as HTMLInputElement | null;
  if (searchBox) searchBox.addEventListener('input', () => {
    const q = searchBox.value.toLowerCase();
    renderTiles(tileList.filter(t => t.id.toLowerCase().includes(q) || (t.mapRole && t.mapRole.includes(q)) || t.tags.some((tag: string) => tag.includes(q))));
  });

  const stampSearch = document.getElementById('stampSearch') as HTMLInputElement | null;
  if (stampSearch) stampSearch.addEventListener('input', () => {
    stampSearchQuery = stampSearch.value.toLowerCase();
    renderStamps();
  });

  document.querySelectorAll<HTMLElement>('#stampCategoryFilters .tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.querySelectorAll('#stampCategoryFilters .tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      stampCategoryFilter = tag.dataset.filter || 'all';
      renderStamps();
    });
  });

  // Stamp toolbar actions
  const stampImportBtn = document.getElementById('stampImportBtn');
  if (stampImportBtn) stampImportBtn.addEventListener('click', () => {
    importStampsFromFile().then(() => renderStamps());
  });
  const stampExportBtn = document.getElementById('stampExportBtn');
  if (stampExportBtn) stampExportBtn.addEventListener('click', () => {
    exportAllStamps();
  });
}
